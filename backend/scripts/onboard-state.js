// ─────────────────────────────────────────────
// State onboarding — add a new state's real Act to SahakarMitra.
//
//   npm run onboard-state -- "Tamil Nadu" "C:/legal/tamil-act-1983.pdf"
//   npm run onboard-state -- "Tamil Nadu" act1.pdf act2.pdf [--force]
//
// Pipeline (reuses ALL existing infrastructure):
//   1. Integrity check — the source document must actually BE that
//      state's Act (its header must carry the state/act name from
//      state-config.json). Refuses placeholder or wrong-state text.
//   2. Extract text (PDF via the same parser as chat attachments),
//      write to data/updates/<state_file>.txt, archive the original in
//      data/state-docs-applied/.
//   3. Reindex — the existing blue-green pipeline ingests the FULL
//      corpus (all states + the new one) into a NEW collection,
//      validates the golden dataset, and swaps only on pass.
//   4. Seed validation — 3-5 seed questions are derived from the
//      state's OWN ingested section titles (grounded in the real text,
//      flagged "needs real verification" for human review) and asked
//      through the live /api/chat with the state selected. Pass bar:
//      ≥ 90% of seeds retrieve their expected section, matching the
//      accuracy threshold already used by the blue-green gate.
//   5. On pass: state-config.json flips { enabled: true, validated:
//      true } and the UI state selector offers the jurisdiction.
//      On fail: no flip, applied updates rolled back, config unchanged.
//
// NOTE: seed questions derived here are placeholders pending human
// verification — they ARE grounded in the real ingested Act text, but
// a domain review is still recommended before trusting the pass.
// ─────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { parseAttachment } from '../services/documentParser.js';
import { runReindex } from './reindex.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(dataDir, 'state-config.json');
const PENDING_DIR = path.join(dataDir, 'pending-ingestion');
const UPDATES_DIR = path.join(dataDir, 'updates');
const APPLIED_DIR = path.join(dataDir, 'updates-applied');
const SEEDS_DIR = path.join(dataDir, 'state-seeds');

const SERVER_URL = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
const SEED_ACCURACY_THRESHOLD = 0.9; // same bar as the blue-green gate
const MAX_SEEDS = 5;

function loadStateConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}

function extractSectionNumber(title) {
  const m = /(?:Section|धारा|कलम)\s+(\d+[A-Z]?)/i.exec(String(title || ''));
  return m ? m[1] : null;
}

function slug(state) {
  return state.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

// ── Step 1-2: source docs → verified text in data/updates/ ──────

async function prepareStateDocs(state, meta, docPaths, { force }) {
  if (meta.enabled && !force) {
    throw new Error(`"${state}" is already onboarded. Use --force to re-onboard with new source documents.`);
  }

  const applied = [];   // { updatesFile, pendingName }
  const approved = [];  // { file, chars, title }

  fs.mkdirSync(UPDATES_DIR, { recursive: true });
  fs.mkdirSync(APPLIED_DIR, { recursive: true });

  for (const docPath of docPaths) {
    const abs = path.resolve(docPath);
    if (!fs.existsSync(abs)) {
      console.warn(`  ! skipping missing file: ${docPath}`);
      continue;
    }

    // Read raw text (PDF via the same parser used for chat attachments)
    let text = '';
    if (abs.toLowerCase().endsWith('.pdf')) {
      const buf = fs.readFileSync(abs);
      const parsed = await parseAttachment({
        name: path.basename(abs),
        type: 'application/pdf',
        data: buf.toString('base64'),
        size: buf.length,
      });
      text = /^\[.*\]$/.test(parsed.extractedText.trim()) ? '' : parsed.extractedText;
    } else {
      text = fs.readFileSync(abs, 'utf-8');
    }

    if (!text || text.trim().length < 200) {
      throw new Error(`"${path.basename(abs)}" yielded no usable legal text (${text.length} chars). Refusing to onboard from an empty/failed extraction — source the real Act document.`);
    }

    // INTEGRITY CHECK: the document must actually be this state's Act.
    // Its header must carry the state name or the configured act_name.
    const firstLine = (text.split('\n')[0] || '').toLowerCase();
    const stateLower = state.toLowerCase();
    const actLower = (meta.act_name || '').toLowerCase();
    if (!firstLine.includes(stateLower) && !(actLower && firstLine.includes(actLower))) {
      throw new Error(
        `Integrity check failed for "${path.basename(abs)}": the document header does not mention ${state}` +
        (meta.act_name ? ` or "${meta.act_name}"` : '') +
        `. Onboarding requires the state's REAL Act text — refusing to continue.`
      );
    }

    // Archive the source and write the extracted text as an updates file
    const appliedName = `${slug(state)}-${path.basename(abs)}`;
    fs.renameSync(abs, path.join(APPLIED_DIR, appliedName));
    const updatesFile = path.join(UPDATES_DIR, appliedName);
    fs.writeFileSync(updatesFile, text.trim(), 'utf-8');

    applied.push({ updatesFile, pendingName: appliedName });
    approved.push({ file: path.basename(abs), chars: text.length, title: (text.split('\n')[0] || '').trim() });
    console.log(`  + accepted: ${path.basename(abs)} (${text.length} chars)`);
  }

  if (applied.length === 0) {
    throw new Error('No source documents were accepted — nothing to onboard.');
  }
  return { applied, approved };
}

function rollbackStateDocs(applied) {
  for (const u of applied) {
    try {
      if (fs.existsSync(u.updatesFile)) fs.unlinkSync(u.updatesFile);
      const archive = path.join(APPLIED_DIR, u.pendingName);
      if (fs.existsSync(archive)) {
        // back to a pending-style name so the source is not lost
        fs.renameSync(archive, path.join(dataDir, 'pending-ingestion', u.pendingName));
      }
    } catch (err) {
      console.warn(`  ! rollback incomplete for ${u.updatesFile}: ${err.message}`);
    }
  }
}

// ── Step 4: derive + validate seed questions ────────────────────

async function deriveAndValidateSeeds(state, meta, collectionName) {
  const parentsFile = path.join(dataDir, `parents-${collectionName}.json`);
  const parents = JSON.parse(fs.readFileSync(parentsFile, 'utf-8'));
  const stateParents = Object.values(parents).filter((p) => p.state === state && p.section_title);

  if (stateParents.length === 0) {
    throw new Error(`No sections for "${state}" found in collection "${collectionName}" — the ingestion may have failed for the state's documents.`);
  }

  // Seeds are derived from the state's OWN section titles — grounded in
  // the real ingested text, not invented. Flagged for human review.
  const seeds = stateParents
    .filter((p) => extractSectionNumber(p.section_title))
    .slice(0, MAX_SEEDS)
    .map((p) => ({
      // The section TITLE is the strongest retrieval signal — leading with
      // the full Act name instead makes the preamble out-rank the section
      // (its parent title IS the act name).
      question: `What does "${p.section_title}" say?`,
      expected_section: extractSectionNumber(p.section_title),
      derived_from: p.section_title,
      needs_real_verification: true,
      derived_automatically: true,
    }));

  fs.mkdirSync(SEEDS_DIR, { recursive: true });
  const seedsFile = path.join(SEEDS_DIR, `${slug(state)}.json`);
  fs.writeFileSync(seedsFile, JSON.stringify({
    state,
    generated_at: new Date().toISOString(),
    needs_real_verification: true,
    note: 'Questions auto-derived from ingested section titles. Answers come from the real source text via retrieval. Human review recommended.',
    seeds,
  }, null, 2), 'utf-8');
  console.log(`  + ${seeds.length} seed question(s) written: ${path.basename(seedsFile)} (flagged needs_real_verification)`);

  // Validate through the live chat endpoint with the state selected
  let pass = 0;
  const failures = [];
  for (const seed of seeds) {
    const res = await fetch(`${SERVER_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: seed.question, language: 'en', state }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      failures.push(`${seed.derived_from}: API ${res.status}`);
      continue;
    }
    const data = await res.json();
    const citedStates = (data.sources || []).map((s) => s.matchedState || s.state);
    const citedSections = (data.sources || [])
      .map((s) => (extractSectionNumber(s.section) || '').toUpperCase());
    const stateOk = citedStates.includes(state);
    const sectionOk = !seed.expected_section || citedSections.includes(seed.expected_section.toUpperCase());
    if (stateOk && sectionOk) {
      pass += 1;
    } else {
      failures.push(`${seed.derived_from}: cited [${(data.sources || []).map((s) => `${s.section} (${s.matchedState || s.state})`).join('; ')}]`);
    }
  }

  const accuracy = seeds.length ? pass / seeds.length : 0;
  return { seedsFile, seedCount: seeds.length, pass, accuracy, failures };
}

// ── Orchestration ───────────────────────────────────────────────

export async function onboardState(state, docPaths, { force = false } = {}) {
  const config = loadStateConfig();
  const meta = config[state];
  if (!meta) {
    throw new Error(`Unknown jurisdiction "${state}". See data/state-config.json for the list.`);
  }
  if (!docPaths || docPaths.length === 0) {
    throw new Error('No source documents provided. Pass the state\'s real Act file(s): npm run onboard-state -- "Tamil Nadu" act.pdf');
  }

  console.log(`── SahakarMitra state onboarding: "${state}" ──`);
  console.log(`Act (from config): ${meta.act_name || 'NOT CONFIRMED — the source document must state it'}`);
  console.log('');

  // Steps 1-2
  console.log('Step 1-2 — integrity check + document preparation:');
  const { applied } = await prepareStateDocs(state, meta, docPaths, { force });

  // Step 3: blue-green reindex (builds + validates globally + swaps)
  console.log('');
  console.log('Step 3 — blue-green reindex with the new corpus:');
  let reindexed;
  try {
    reindexed = await runReindex();
  } catch (err) {
    // Reindex failed mid-flight: roll back the applied docs. The active
    // collection was never swapped, so account data is untouched.
    rollbackStateDocs(applied);
    throw err;
  }

  // Step 4: state seed validation against the live API
  console.log('');
  console.log('Step 4 — state seed validation:');
  let validation;
  try {
    validation = await deriveAndValidateSeeds(state, meta, reindexed.active);
  } catch (err) {
    rollbackStateDocs(applied);
    throw err;
  }
  console.log(`  Seed accuracy: ${validation.pass}/${validation.seedCount} (${(validation.accuracy * 100).toFixed(0)}%)`);

  // Step 5: flip or roll back
  if (validation.accuracy < SEED_ACCURACY_THRESHOLD) {
    rollbackStateDocs(applied);
    const err = new Error(`Seed validation failed (${(validation.accuracy * 100).toFixed(0)}% < ${(SEED_ACCURACY_THRESHOLD * 100).toFixed(0)}%) — "${state}" remains DISABLED. Updates rolled back.`);
    err.code = 'ONBOARD_VALIDATION_FAILED';
    throw err;
  }

  const freshConfig = loadStateConfig();
  freshConfig[state] = {
    ...freshConfig[state],
    enabled: true,
    validated: true,
    onboarded_at: new Date().toISOString(),
  };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(freshConfig, null, 2), 'utf-8');

  console.log('');
  console.log('════════ ONBOARDING SUMMARY ════════');
  console.log(`  State        : ${state} — NOW ENABLED`);
  console.log(`  Documents    : ${applied.length} ingested via blue-green reindex`);
  console.log(`  New collection: ${reindexed.active} (golden gate passed, swapped live)`);
  console.log(`  Seed accuracy : ${(validation.accuracy * 100).toFixed(0)}% (bar ${(SEED_ACCURACY_THRESHOLD * 100).toFixed(0)}%)`);
  console.log(`  Seeds file    : data/state-seeds/${slug(state)}.json — flagged needs_real_verification`);
  console.log('');

  return { state, collection: reindexed.active, validation };
}

// ── CLI ─────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const positional = args.filter((a) => a !== '--force');
  const state = positional.shift();

  if (!state) {
    console.error('Usage: npm run onboard-state -- "<State Name>" <source-doc.pdf|txt> [more-docs...] [--force]');
    process.exit(1);
  }

  onboardState(state, positional, { force })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('');
      console.error('Onboarding failed:', err.message);
      if (err.code !== 'ONBOARD_VALIDATION_FAILED' && err.code !== 'INTEGRITY_FAILED') {
        console.error('The state remains DISABLED in state-config.json.');
      }
      process.exit(1);
    });
}
