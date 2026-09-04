// ─────────────────────────────────────────────
// Translation quality validator — BLEU + semantic alignment.
//
// For every Golden Dataset entry, sends the Hindi and Marathi question
// through the LIVE /api/chat endpoint (language=hi/mr), then scores the
// system's actual response against the human-verified reference answer:
//
//   1. BLEU (1–4 grams, clipped precision + brevity penalty) —
//      n-gram overlap with the reference translation.
//   2. Semantic similarity — both texts embedded with the SAME
//      all-MiniLM-L6-v2 model used for RAG; cosine similarity of the
//      two embeddings verifies the core legal meaning survived
//      translation.
//
// Entries scoring below BLEU 0.78 or cosine 0.85 are flagged for
// manual review in the HITL interface (/admin/review).
//
// Re-run any time the RAG pipeline, translation layer, or ingestion
// changes:
//   npm run validate:translations
//
// Requires the backend server to be running (npm start).
// ─────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateEmbedding } from '../services/embeddings.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const DATASET_FILE = path.join(dataDir, 'golden-dataset.json');
const RESULTS_FILE = path.join(dataDir, 'validation-results.json');

const SERVER_URL = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
const CONCURRENCY = parseInt(process.env.VALIDATION_CONCURRENCY || '4', 10);
const REQUEST_TIMEOUT_MS = 180_000;

const BLEU_THRESHOLD = 0.78;   // from the validation matrix spec
const COSINE_THRESHOLD = 0.85; // semantic meaning-preservation floor
const LANGS = ['hi', 'mr'];

// ── BLEU ────────────────────────────────────────────────────────
// Standard sentence-level BLEU-4: clipped n-gram precisions (1..4),
// uniform weights, brevity penalty. Zero-match n-gram precisions use
// add-one smoothing so a single zero doesn't zero out the whole score.

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    // \p{L}/\p{N} keep Devanagari and Latin letters alike, drop markdown & punctuation
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function ngramCounts(tokens, n) {
  const counts = new Map();
  for (let i = 0; i + n <= tokens.length; i++) {
    const gram = tokens.slice(i, i + n).join(' ');
    counts.set(gram, (counts.get(gram) || 0) + 1);
  }
  return counts;
}

function sentenceBleu(candidate, reference) {
  const c = tokenize(candidate);
  const r = tokenize(reference);
  if (c.length === 0 || r.length === 0) return 0;

  let logPrecSum = 0;
  for (let n = 1; n <= 4; n++) {
    const cN = ngramCounts(c, n);
    const rN = ngramCounts(r, n);
    let clipped = 0;
    let total = 0;
    for (const [gram, count] of cN) {
      total += count;
      clipped += Math.min(count, rN.get(gram) || 0);
    }
    if (total === 0) return 0;
    // add-one smoothing only when there are zero matches at this n
    const p = clipped === 0 ? 1 / (total + 1) : clipped / total;
    logPrecSum += Math.log(p);
  }

  const bp = c.length > r.length ? 1 : Math.exp(1 - r.length / c.length);
  return bp * Math.exp(logPrecSum / 4);
}

// ── Semantic similarity (same embedder as RAG) ──────────────────
// generateEmbedding returns L2-normalized vectors → cosine = dot product.

async function semanticSimilarity(textA, textB) {
  const [a, b] = await Promise.all([generateEmbedding(textA), generateEmbedding(textB)]);
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return Math.max(0, Math.min(1, dot));
}

// ── API helpers ─────────────────────────────────────────────────

async function chat(message, language) {
  const res = await fetch(`${SERVER_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, language }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  console.log('── SahakarMitra translation validation (Golden Dataset) ──');
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Thresholds: BLEU ≥ ${BLEU_THRESHOLD}, cosine ≥ ${COSINE_THRESHOLD}`);
  console.log('');

  const dataset = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf-8'));
  console.log(`Loaded ${dataset.length} golden entries × ${LANGS.length} language(s).`);

  try {
    const health = await fetch(`${SERVER_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
    if (!health.ok) throw new Error(`health returned ${health.status}`);
  } catch {
    console.error(`❌ Backend server not reachable at ${SERVER_URL}.`);
    console.error('   Start it first:  npm start   (in the backend/ directory)');
    process.exit(1);
  }

  // Load the embedding model once before the run
  console.log('Preloading embedding model for semantic scoring...');
  await generateEmbedding('warmup');
  console.log('');

  const jobs = [];
  for (const entry of dataset) {
    for (const lang of LANGS) jobs.push({ entry, lang });
  }
  console.log(`Testing ${jobs.length} question(s) through /api/chat (concurrency ${CONCURRENCY})...`);

  const results = await mapWithConcurrency(jobs, CONCURRENCY, async ({ entry, lang }) => {
    const question = lang === 'hi' ? entry.question_hi : entry.question_mr;
    const reference = lang === 'hi' ? entry.reference_answer_hi : entry.reference_answer_mr;
    const base = {
      id: entry.id,
      category: entry.category,
      language: lang,
      question,
      reference_answer: reference,
      system_answer: null,
      bleu: null,
      cosine: null,
      flagged: false,
      flag_reasons: [],
      error: null,
    };

    try {
      const resp = await chat(question, lang);
      const systemAnswer = resp.answer || '';
      base.system_answer = systemAnswer;
      base.bleu = sentenceBleu(systemAnswer, reference);
      base.cosine = await semanticSimilarity(systemAnswer, reference);
      if (base.bleu < BLEU_THRESHOLD) base.flag_reasons.push(`BLEU ${base.bleu.toFixed(3)} < ${BLEU_THRESHOLD}`);
      if (base.cosine < COSINE_THRESHOLD) base.flag_reasons.push(`cosine ${base.cosine.toFixed(3)} < ${COSINE_THRESHOLD}`);
      base.flagged = base.flag_reasons.length > 0;
    } catch (err) {
      base.error = err.message;
      base.flagged = true;
      base.flag_reasons.push(`API error: ${err.message}`);
    }
    return base;
  });

  const scored = results.filter((r) => r.error === null);
  const avg = (arr, key) => (arr.length ? arr.reduce((s, r) => s + r[key], 0) / arr.length : 0);
  const avgBleu = avg(scored, 'bleu');
  const avgCosine = avg(scored, 'cosine');
  const flagged = results.filter((r) => r.flagged);

  console.log('');
  console.log('════════ TRANSLATION QUALITY REPORT ════════');
  console.log(`  Total tested      : ${results.length}`);
  console.log(`  Scored            : ${scored.length}`);
  console.log(`  Average BLEU      : ${avgBleu.toFixed(3)}   (target ≥ ${BLEU_THRESHOLD})`);
  console.log(`  Average cosine    : ${avgCosine.toFixed(3)}   (target ≥ ${COSINE_THRESHOLD})`);
  for (const lang of LANGS) {
    const rs = scored.filter((r) => r.language === lang);
    if (rs.length) {
      console.log(`    ${lang}: BLEU ${avg(rs, 'bleu').toFixed(3)} | cosine ${avg(rs, 'cosine').toFixed(3)}`);
    }
  }
  console.log(`  Flagged for review: ${flagged.length}`);
  console.log('');

  if (flagged.length > 0) {
    console.log('── Flagged cases (below threshold — send to /admin/review) ──');
    for (const f of flagged) {
      console.log(`  [${f.id}] (${f.language}) ${f.flag_reasons.join('; ')}`);
    }
    console.log('');
  }

  const report = {
    generated_at: new Date().toISOString(),
    server_url: SERVER_URL,
    thresholds: { bleu: BLEU_THRESHOLD, cosine: COSINE_THRESHOLD },
    summary: {
      total: results.length,
      scored: scored.length,
      flagged_count: flagged.length,
      avg_bleu: parseFloat(avgBleu.toFixed(4)),
      avg_cosine: parseFloat(avgCosine.toFixed(4)),
      by_language: Object.fromEntries(
        LANGS.map((lang) => {
          const rs = scored.filter((r) => r.language === lang);
          return [lang, {
            count: rs.length,
            avg_bleu: parseFloat(avg(rs, 'bleu').toFixed(4)),
            avg_cosine: parseFloat(avg(rs, 'cosine').toFixed(4)),
          }];
        })
      ),
    },
    entries: results,
  };
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`Results saved: ${RESULTS_FILE}`);
  console.log(`Flagged entries are now listed in the HITL review interface: ${SERVER_URL}/admin/review`);
}

main().catch((err) => {
  console.error('Validation failed:', err.message);
  process.exit(1);
});
