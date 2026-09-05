// ─────────────────────────────────────────────
// Language rollout gate — validate ONE language's golden-dataset variants
// and flip its `enabled` flag automatically on pass.
//
//   npm run validate-language ta
//
// Gate (all must hold):
//   1. The language has golden-dataset variants (variants keys whose
//      language prefix matches the target code)
//   2. Every variant scored successfully against the live /api/chat
//   3. Average BLEU ≥ REINDEX-style threshold (0.78) and average
//      cosine ≥ 0.85 across all its variants
//
// On pass: language-config.json flips { enabled: true, validated: true }
// and the language becomes selectable in the UI. On fail: config keeps
// it disabled and exit code is 1.
// ─────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateEmbedding } from '../services/embeddings.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(dataDir, 'language-config.json');
const DATASET_FILE = path.join(dataDir, 'golden-dataset.json');

const SERVER_URL = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
const CONCURRENCY = parseInt(process.env.VALIDATION_CONCURRENCY || '4', 10);
const REQUEST_TIMEOUT_MS = 180_000;

const BLEU_THRESHOLD = 0.78;
const COSINE_THRESHOLD = 0.85;

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function sentenceBleu(candidate, reference) {
  const c = tokenize(candidate);
  const r = tokenize(reference);
  if (c.length === 0 || r.length === 0) return 0;

  let logPrecSum = 0;
  for (let n = 1; n <= 4; n++) {
    const cN = new Map(), rN = new Map();
    for (let i = 0; i + n <= c.length; i++) { const g = c.slice(i, i + n).join(' '); cN.set(g, (cN.get(g) || 0) + 1); }
    for (let i = 0; i + n <= r.length; i++) { const g = r.slice(i, i + n).join(' '); rN.set(g, (rN.get(g) || 0) + 1); }
    let clipped = 0, total = 0;
    for (const [gram, count] of cN) { total += count; clipped += Math.min(count, rN.get(gram) || 0); }
    if (total === 0) return 0;
    logPrecSum += Math.log(clipped === 0 ? 1 / (total + 1) : clipped / total);
  }

  const bp = c.length > r.length ? 1 : Math.exp(1 - r.length / c.length);
  return bp * Math.exp(logPrecSum / 4);
}

async function semanticSimilarity(textA, textB) {
  const [a, b] = await Promise.all([generateEmbedding(textA), generateEmbedding(textB)]);
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return Math.max(0, Math.min(1, dot));
}

async function chat(message, language) {
  const res = await fetch(`${SERVER_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, language }),
    signal: AbortSignal.timeout(180_000),
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

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: npm run validate-language <code>   (e.g. ta, te, bn)');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  if (!config[target]) {
    console.error(`Unknown language code "${target}". Known codes: ${Object.keys(config).filter(k => !k.startsWith('_')).join(', ')}`);
    process.exit(1);
  }
  if (target === 'en') {
    console.error('"en" is the base language and cannot be gated.');
    process.exit(1);
  }

  console.log(`── Language rollout gate: "${target}" (${target === 'ur' ? 'Urdu' : target}) ──`);

  const dataset = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf-8'));
  const jobs = [];
  for (const entry of dataset) {
    for (const [variantKey, v] of Object.entries(entry.variants || {})) {
      if (variantKey.split('_')[0] === target && v?.question && v?.reference_answer) {
        jobs.push({ entry, variantKey, question: v.question, reference: v.reference_answer });
      }
    }
  }

  if (jobs.length === 0) {
    console.error(`❌ No golden-dataset variants found for "${target}".`);
    console.error(`   Add variants (keys prefixed "${target}") to data/golden-dataset.json first, then re-run.`);
    process.exit(1);
  }
  console.log(`Found ${jobs.length} variant(s) for ${target}.`);

  try {
    const health = await fetch(`${SERVER_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
    if (!health.ok) throw new Error(`health returned ${health.status}`);
  } catch {
    console.error(`❌ Backend server not reachable at ${SERVER_URL}. Start it with: npm start`);
    process.exit(1);
  }

  const results = await mapWithConcurrency(jobs, CONCURRENCY, async ({ entry, variantKey, question, reference }) => {
    try {
      const resp = await chat(question, target);
      const systemAnswer = resp.answer || '';
      const bleu = sentenceBleu(systemAnswer, reference);
      const cosine = await semanticSimilarity(systemAnswer, reference);
      return { id: entry.id, variant: variantKey, bleu, cosine, error: null };
    } catch (err) {
      return { id: entry.id, variant: variantKey, bleu: 0, cosine: 0, error: err.message };
    }
  });

  const scored = results.filter((r) => !r.error);
  const avg = (key) => (scored.length ? scored.reduce((s, r) => s + r[key], 0) / scored.length : 0);
  const avgBleu = avg('bleu');
  const avgCosine = avg('cosine');
  const passed = scored.length === results.length && avgBleu >= BLEU_THRESHOLD && avgCosine >= COSINE_THRESHOLD;

  console.log('');
  console.log(`  Scored            : ${scored.length}/${results.length}`);
  console.log(`  Average BLEU      : ${avgBleu.toFixed(3)}   (≥ ${BLEU_THRESHOLD})`);
  console.log(`  Average cosine    : ${avgCosine.toFixed(3)}   (≥ ${COSINE_THRESHOLD})`);

  if (passed) {
    config[target] = { enabled: true, validated: true };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    console.log('');
    console.log(`✅ "${target}" PASSED the rollout gate and is now ENABLED in the UI.`);
    process.exit(0);
  }

  config[target] = { ...(config[target] || {}), enabled: false, validated: false };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  console.log('');
  console.log(`❌ "${target}" FAILED the rollout gate. It remains DISABLED.`);
  for (const r of results.filter((r) => r.error)) console.log(`    error [${r.id}]: ${r.error}`);
  process.exit(1);
}

main().catch((err) => {
  console.error('Language validation failed:', err.message);
  process.exit(1);
});
