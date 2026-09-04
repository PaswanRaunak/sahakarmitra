// ─────────────────────────────────────────────
// Citation accuracy validator — the Golden Dataset regression gate.
//
// Runs every question_en from data/golden-dataset.json through the
// LIVE /api/chat endpoint and checks that the cited section (from the
// deterministic retrieval `sources`, not the LLM prose) matches the
// dataset's expected_section.
//
// Re-run any time the RAG pipeline, chunking, or ingestion changes:
//   npm run validate:citations
//
// Requires the backend server to be running (npm start).
// Exits non-zero if any citation check fails (regression gate).
// ─────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const DATASET_FILE = path.join(dataDir, 'golden-dataset.json');
const REPORT_FILE = path.join(dataDir, 'citation-report.json');

const SERVER_URL = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
const CONCURRENCY = parseInt(process.env.VALIDATION_CONCURRENCY || '4', 10);
const REQUEST_TIMEOUT_MS = 180_000;

// "Section 73B: ..." / "Section 24" → "73B"
function extractSectionNumber(text) {
  const m = /Section\s+(\d+[A-Z]?)/i.exec(String(text || ''));
  return m ? m[1].toUpperCase() : null;
}

async function chat(message, language = 'en') {
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

/** Run async work over items with bounded concurrency, preserving order. */
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
  console.log('── SahakarMitra citation validation (Golden Dataset) ──');
  console.log(`Server: ${SERVER_URL}`);
  console.log('');

  const dataset = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf-8'));
  console.log(`Loaded ${dataset.length} golden entries.`);
  console.log('');

  // Server health check with a clear message if it's not running
  try {
    const health = await fetch(`${SERVER_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
    if (!health.ok) throw new Error(`health returned ${health.status}`);
  } catch {
    console.error(`❌ Backend server not reachable at ${SERVER_URL}.`);
    console.error('   Start it first:  npm start   (in the backend/ directory)');
    process.exit(1);
  }

  console.log(`Testing ${dataset.length} question(s) through /api/chat (concurrency ${CONCURRENCY})...`);

  const results = await mapWithConcurrency(dataset, CONCURRENCY, async (entry) => {
    try {
      const resp = await chat(entry.question_en, 'en');
      const citedSections = (resp.sources || []).map((s) => s.section);
      const citedNumbers = citedSections.map(extractSectionNumber).filter(Boolean);
      const expectedNumber = extractSectionNumber(entry.expected_section);
      const noMatch = !resp.sources || resp.sources.length === 0;

      return {
        id: entry.id,
        category: entry.category,
        question: entry.question_en,
        expected_section: entry.expected_section,
        expected_number: expectedNumber,
        cited_sections: citedSections,
        cited_numbers: citedNumbers,
        top1_number: citedNumbers[0] || null,
        pass: !noMatch && !!expectedNumber && citedNumbers.includes(expectedNumber),
        top1_pass: !noMatch && !!expectedNumber && citedNumbers[0] === expectedNumber,
        no_match: noMatch,
        error: null,
      };
    } catch (err) {
      return {
        id: entry.id,
        category: entry.category,
        question: entry.question_en,
        expected_section: entry.expected_section,
        expected_number: extractSectionNumber(entry.expected_section),
        cited_sections: [],
        cited_numbers: [],
        top1_number: null,
        pass: false,
        top1_pass: false,
        no_match: false,
        error: err.message,
      };
    }
  });

  const passCount = results.filter((r) => r.pass).length;
  const failCount = results.length - passCount;
  const top1Count = results.filter((r) => r.top1_pass).length;
  const accuracy = ((passCount / results.length) * 100).toFixed(1);
  const top1Accuracy = ((top1Count / results.length) * 100).toFixed(1);
  const failures = results.filter((r) => !r.pass);

  console.log('');
  console.log('════════ CITATION ACCURACY REPORT ════════');
  console.log(`  Total tested : ${results.length}`);
  console.log(`  Passed       : ${passCount}`);
  console.log(`  Failed       : ${failCount}`);
  console.log(`  Accuracy     : ${accuracy}%  (top-1 citation accuracy: ${top1Accuracy}%)`);
  console.log('');

  if (failures.length > 0) {
    console.log('── Failed cases ──');
    for (const f of failures) {
      console.log('');
      console.log(`  [${f.id}] (${f.category})`);
      console.log(`    Q        : ${f.question}`);
      console.log(`    Expected : ${f.expected_section}${f.error ? `  — API ERROR: ${f.error}` : ''}`);
      console.log(`    Actual   : ${f.cited_sections.length ? f.cited_sections.join(' | ') : '(no sources returned)'}`);
    }
    console.log('');
  }

  const report = {
    generated_at: new Date().toISOString(),
    server_url: SERVER_URL,
    dataset_file: path.basename(DATASET_FILE),
    total: results.length,
    pass: passCount,
    fail: failCount,
    accuracy_pct: parseFloat(accuracy),
    top1_accuracy_pct: parseFloat(top1Accuracy),
    results,
  };
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`Report saved: ${REPORT_FILE}`);

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Validation failed:', err.message);
  process.exit(1);
});
