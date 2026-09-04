// ─────────────────────────────────────────────
// Reindex — zero-downtime (blue-green) re-ingestion, Module 3.
//
// Triggered when Module 2's diff engine has flagged changed documents
// into data/pending-ingestion/ (also safe to run manually after any
// chunking change — an empty pending dir just rebuilds the corpus).
//
//   a. Prepare updates: extract text from pending documents (.txt read
//      directly, .pdf via the same parser as chat attachments), keep only
//      the newest version per document, write to data/updates/, move the
//      pending files to data/applied/.
//   b. Build the NEW collection (next version name, e.g. legal_docs_v4)
//      with the full corpus: unchanged data/*.txt + data/updates/*.txt
//      (scripts/ingest.js → ingestToCollection).
//   c. Validate the NEW collection against the golden dataset
//      (data/golden-dataset.json): every question is embedded and queried
//      against the new collection directly; the expected section must be
//      retrievable. Accuracy must be ≥ REINDEX_MIN_ACCURACY (default 0.9).
//   d. PASS  → swap: active-collection.json now points at the new
//      collection. Instant, one JSON write — running servers pick it up
//      on their next request (services/vectorStore.js).
//   e. FAIL  → no swap: the old collection stays live, the failed build
//      is deleted, and any applied updates are rolled back (updates
//      files removed, pending files restored). Exit code 1.
//   f. Cleanup: after a successful swap, keep the new + immediately
//      previous collections (rollback option) and delete anything older.
//
// Run:  npm run reindex        (requires the ChromaDB server)
// ─────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ChromaClient } from 'chromadb';
import { ingestToCollection } from './ingest.js';
import { generateEmbedding } from '../services/embeddings.js';
import { parseAttachment } from '../services/documentParser.js';
import {
  getActiveCollectionName,
  setActiveCollectionName,
  nextCollectionName,
  isManagedCollection,
} from '../services/vectorStore.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const PENDING_DIR = path.join(dataDir, 'pending-ingestion');
const APPLIED_DIR = path.join(dataDir, 'updates-applied');
const UPDATES_DIR = path.join(dataDir, 'updates');
const DATASET_FILE = path.join(dataDir, 'golden-dataset.json');

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const MIN_ACCURACY = parseFloat(process.env.REINDEX_MIN_ACCURACY || '0.9');
const VALIDATE_LIMIT = parseInt(process.env.REINDEX_VALIDATE_LIMIT || '0', 10); // 0 = all
const MIN_EXTRACTED_CHARS = 80; // below this a "document" is garbage, not an update

// "mcs-act-1960__20260904-103626.pdf" → base "mcs-act-1960" (extension stripped)
function baseNameOf(filename) {
  const stripped = filename.replace(/__\d{8}-\d{6}(?=\.[^.]+$)/, '');
  return path.parse(stripped).name;
}

// ── Step A: pending documents → data/updates/*.txt ──────────────

async function extractText(filePath) {
  const buf = fs.readFileSync(filePath);
  if (filePath.toLowerCase().endsWith('.pdf')) {
    const parsed = await parseAttachment({
      name: path.basename(filePath),
      type: 'application/pdf',
      data: buf.toString('base64'),
      size: buf.length,
    });
    // parseAttachment wraps failures in bracketed notices — treat those as no text
    return /^\[.*\]$/.test(parsed.extractedText.trim()) ? '' : parsed.extractedText;
  }
  return buf.toString('utf-8');
}

/**
 * Process data/pending-ingestion/: newest version of each document wins,
 * extracted text lands in data/updates/{base}.txt, the source file is
 * archived to data/updates-applied/. Returns what was applied this run
 * (for rollback on validation failure).
 */
async function prepareUpdates() {
  const applied = [];   // { base, updatesFile, pendingFrom }
  const skipped = [];   // { file, reason }

  if (!fs.existsSync(PENDING_DIR)) return { applied, skipped };
  const pendingFiles = fs.readdirSync(PENDING_DIR).filter(f => /\.(txt|pdf)$/i.test(f));
  if (pendingFiles.length === 0) return { applied, skipped };

  // Newest version per base document (pending names carry a timestamp)
  const newestPerBase = new Map();
  for (const f of pendingFiles) {
    const base = baseNameOf(f);
    if (!newestPerBase.has(base) || f > newestPerBase.get(base)) {
      newestPerBase.set(base, f); // lexicographic order == chronological for our stamp
    }
  }

  fs.mkdirSync(UPDATES_DIR, { recursive: true });
  fs.mkdirSync(APPLIED_DIR, { recursive: true });

  for (const [base, filename] of newestPerBase) {
    const pendingPath = path.join(PENDING_DIR, filename);
    try {
      const text = (await extractText(pendingPath)).trim();
      if (text.length < MIN_EXTRACTED_CHARS) {
        skipped.push({ file: filename, reason: `only ${text.length} chars extracted (< ${MIN_EXTRACTED_CHARS})` });
        continue;
      }
      const updatesFile = path.join(UPDATES_DIR, `${base.replace(/[^A-Za-z0-9._-]+/g, '_')}.txt`);
      fs.writeFileSync(updatesFile, text, 'utf-8');
      fs.renameSync(pendingPath, path.join(APPLIED_DIR, filename));
      applied.push({ base, updatesFile, pendingFrom: pendingPath, pendingName: filename });
      console.log(`  + update applied: ${base} (${text.length} chars → ${path.basename(updatesFile)})`);
    } catch (err) {
      skipped.push({ file: filename, reason: err.message });
    }
  }

  return { applied, skipped };
}

/** Undo prepareUpdates() — used when validation fails and we must not swap. */
function rollbackUpdates(applied) {
  for (const u of applied) {
    try {
      if (fs.existsSync(u.updatesFile)) fs.unlinkSync(u.updatesFile);
      if (!fs.existsSync(u.pendingFrom)) {
        fs.renameSync(path.join(APPLIED_DIR, u.pendingName), u.pendingFrom);
      }
    } catch (err) {
      console.warn(`  ! rollback incomplete for ${u.base}: ${err.message}`);
    }
  }
}

// ── Step C: validate the NEW collection against the golden dataset ──

function sectionNumberOf(text) {
  const m = /Section\s+(\d+[A-Z]?)/i.exec(String(text || ''));
  return m ? m[1].toUpperCase() : null;
}

async function validateCollection(collectionName) {
  const dataset = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf-8'));
  const entries = VALIDATE_LIMIT > 0 ? dataset.slice(0, VALIDATE_LIMIT) : dataset;
  const client = new ChromaClient({ path: CHROMA_URL });
  const col = await client.getCollection({ name: collectionName });

  let pass = 0;
  const failures = [];
  for (const entry of entries) {
    const qEmb = await generateEmbedding(entry.question_en);
    const res = await col.query({ queryEmbeddings: [qEmb], nResults: 9 });

    // first 3 DISTINCT parent sections (mirrors retrieval's parent dedup)
    const sections = [];
    for (const meta of res.metadatas?.[0] ?? []) {
      const title = meta?.section_title;
      if (title && !sections.includes(title)) sections.push(title);
      if (sections.length >= 3) break;
    }

    const want = sectionNumberOf(entry.expected_section);
    const ok = want && sections.some((s) => sectionNumberOf(s) === want);
    if (ok) pass += 1;
    else failures.push(`${entry.id}: expected ${entry.expected_section}, got [${sections.join(' | ')}]`);
  }

  const accuracy = pass / entries.length;
  return { total: entries.length, pass, accuracy, failures };
}

// ── Step F: prune old collections ───────────────────────────────

async function pruneOldCollections({ keep }) {
  const client = new ChromaClient({ path: CHROMA_URL });
  const listed = await client.listCollections();
  const names = listed.map((c) => (typeof c === 'string' ? c : c.name));

  const victims = names.filter((n) => isManagedCollection(n) && !keep.includes(n));
  for (const name of victims) {
    try {
      await client.deleteCollection({ name });
      console.log(`  🗑 deleted old collection "${name}"`);
    } catch (err) {
      console.warn(`  ! could not delete "${name}": ${err.message}`);
    }
  }
  return victims;
}

// ── Orchestration ───────────────────────────────────────────────

export async function runReindex() {
  const active = getActiveCollectionName();
  const next = nextCollectionName(active);

  console.log('── SahakarMitra blue-green reindex ──');
  console.log(`Active collection : ${active}`);
  console.log(`New collection    : ${next}`);
  console.log(`Validation gate   : golden dataset accuracy ≥ ${(MIN_ACCURACY * 100).toFixed(0)}%`);
  console.log('');

  // a. Apply flagged updates (no-op when pending-ingestion/ is empty)
  console.log('Step A — preparing flagged updates:');
  const { applied, skipped } = await prepareUpdates();
  for (const s of skipped) console.log(`  – skipped ${s.file}: ${s.reason}`);
  if (applied.length === 0 && skipped.length === 0) console.log('  (no pending documents — full corpus rebuild)');

  // b. Build the new collection (never touches the active one)
  console.log('');
  console.log('Step B — building new collection:');
  const built = await ingestToCollection({ collectionName: next });
  if (built.childCount === 0) {
    throw new Error('New collection is empty — aborting before validation.');
  }

  // c. Validate the new collection in isolation
  console.log('');
  console.log('Step C — validating against golden dataset:');
  const validation = await validateCollection(next);
  console.log(`  ${validation.pass}/${validation.total} questions retrieve their expected section (accuracy ${(validation.accuracy * 100).toFixed(1)}%)`);
  for (const f of validation.failures.slice(0, 5)) console.log(`    ✗ ${f}`);

  // d/e. Swap — or roll the whole build back
  if (validation.accuracy < MIN_ACCURACY) {
    console.error('');
    console.error(`❌ Validation FAILED (accuracy ${(validation.accuracy * 100).toFixed(1)}% < ${(MIN_ACCURACY * 100).toFixed(0)}% required).`);
    console.error(`   Active collection remains "${active}" — NO swap performed.`);
    rollbackUpdates(applied);
    try {
      const client = new ChromaClient({ path: CHROMA_URL });
      await client.deleteCollection({ name: next });
      console.error(`   Failed build "${next}" deleted; applied updates rolled back.`);
    } catch (err) {
      console.warn(`   Could not delete failed build "${next}": ${err.message}`);
    }
    const err = new Error(`reindex validation failed (accuracy ${(validation.accuracy * 100).toFixed(1)}%)`);
    err.code = 'REINDEX_VALIDATION_FAILED';
    throw err;
  }

  console.log('');
  console.log('Step D — swap:');
  setActiveCollectionName(next);

  console.log('');
  console.log('Step F — pruning old collections (keeping new + previous):');
  const pruned = await pruneOldCollections({ keep: [next, active] });

  console.log('');
  console.log('════════ REINDEX SUMMARY ════════');
  console.log(`  Updates applied : ${applied.length}${applied.length ? ` — ${applied.map((u) => u.base).join(', ')}` : ''}`);
  console.log(`  New collection  : ${next} (${built.childCount} child chunks / ${built.parentCount} parent sections)`);
  console.log(`  Validation      : PASSED (${(validation.accuracy * 100).toFixed(1)}%)`);
  console.log(`  Swap            : active-collection.json → "${next}" (live on next request, no restart)`);
  console.log(`  Pruned          : ${pruned.length ? pruned.join(', ') : 'none'}  (rollback option kept: "${active}")`);

  return { active: next, previous: active, validation, applied: applied.length, pruned };
}

// ── CLI entry ───────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runReindex()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('');
      console.error('Reindex failed:', err.message);
      if (err.code !== 'REINDEX_VALIDATION_FAILED') {
        console.error('The active collection was NOT modified.');
      }
      process.exit(1);
    });
}
