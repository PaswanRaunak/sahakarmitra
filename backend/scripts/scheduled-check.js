// ─────────────────────────────────────────────
// Scheduled legal-document update check — orchestrates the monitoring
// pipeline (Module 2):
//
//   1. scrapeAllSources()  — download latest PDFs from data/sources.json
//   2. detectChanges()     — MD5-diff against data/manifest.json, flag
//                            changed documents into data/pending-ingestion/
//   3. log results         — console summary + append to
//                            data/update-check-log.jsonl
//
// Three ways to run:
//   • Standalone / cron CLI :  npm run check:updates
//   • In-process scheduler  :  start with server.js (ENABLE_CRON=true,
//                              schedule via CRON_SCHEDULE, default 3 AM daily)
//   • Serverless / Lambda   :  import { runUpdateCheck } and call it —
//                              no timers, one shot, returns the summary
//
// Error policy: a failing source is logged and skipped, never fatal.
// NOTE: this module does NOT trigger re-ingestion — flagged documents
// sit in data/pending-ingestion/ for the blue-green module.
// ─────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeAllSources, SOURCES_FILE } from '../services/scraper.js';
import { detectChanges } from '../services/diffEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, '..', 'data', 'update-check-log.jsonl');

/**
 * One full monitoring pass: scrape → diff → log. Never throws on
 * per-source failures; only a catastrophic setup error (e.g. missing
 * sources config) rejects.
 * @returns {{ scrape: object[], diff: object, started_at: string, duration_ms: number }}
 */
export async function runUpdateCheck() {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  console.log(`── SahakarMitra legal-document update check — ${startedAt} ──`);

  // 1. Scrape (per-source failures are captured in each summary)
  const scrapeSummaries = await scrapeAllSources();

  const downloaded = scrapeSummaries.reduce((n, s) => n + s.downloaded, 0);
  const unreachable = scrapeSummaries.filter((s) => !s.ok);
  console.log('');
  console.log(`Scrape complete: ${scrapeSummaries.length} source(s), ${downloaded} document(s) downloaded, ${unreachable.length} unreachable.`);

  // 2. Diff against the manifest
  const sourceUrls = new Map(scrapeSummaries.map((s) => [s.source, s.url]));
  const diff = await detectChanges(sourceUrls);

  // 3. Log results
  const summary = {
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - t0,
    sources: scrapeSummaries.map(({ source, url, ok, pdf_links, downloaded, failed, errors }) => ({
      source, url, ok, pdf_links, downloaded, failed, errors,
    })),
    diff: {
      scanned: diff.scanned,
      new_docs: diff.new_docs,
      changed: diff.changed,
      unchanged: diff.unchanged,
      errors: diff.errors,
    },
  };

  console.log('');
  console.log('════════ UPDATE CHECK SUMMARY ════════');
  console.log(`  Documents scanned : ${diff.scanned}`);
  console.log(`  New (baseline)    : ${diff.new_docs.length}${diff.new_docs.length ? ` — ${diff.new_docs.join(', ')}` : ''}`);
  console.log(`  CHANGED (flagged) : ${diff.changed.length}${diff.changed.length ? ` — ${diff.changed.join(', ')}` : ''}`);
  console.log(`  Unchanged         : ${diff.unchanged}`);
  console.log(`  Sources skipped   : ${unreachable.map((s) => s.source).join(', ') || 'none'}`);
  if (diff.errors.length || scrapeSummaries.some((s) => s.errors.length)) {
    console.log('  Errors:');
    for (const s of scrapeSummaries) for (const e of s.errors) console.log(`    [${s.source}] ${e}`);
    for (const e of diff.errors) console.log(`    [diff] ${e}`);
  }
  console.log('  (Changed documents moved to data/pending-ingestion/ — re-ingestion NOT triggered.)');

  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(summary) + '\n', 'utf-8');
  } catch (err) {
    console.warn(`Could not append run log: ${err.message}`);
  }

  return summary;
}

/**
 * In-process cron scheduler (node-cron). Used by server.js when
 * ENABLE_CRON=true so a single deployment runs the monitor itself.
 * @returns {import('node-cron').ScheduledTask}
 */
export function startCron(schedule = process.env.CRON_SCHEDULE || '0 3 * * *') {
  // Lazy import so serverless consumers of runUpdateCheck don't need node-cron
  return import('node-cron').then((cron) => {
    if (!cron.validate(schedule)) {
      throw new Error(`Invalid CRON_SCHEDULE: "${schedule}"`);
    }
    const task = cron.schedule(schedule, () => {
      runUpdateCheck().catch((err) => console.error('[update-check] run failed:', err.message));
    });
    console.log(`[update-check] Scheduled legal-document monitoring active ("${schedule}").`);
    return task;
  });
}

// ── CLI entry ───────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!fs.existsSync(SOURCES_FILE)) {
    console.error(`Sources config not found: ${SOURCES_FILE}`);
    process.exit(1);
  }

  runUpdateCheck()
    .then((summary) => {
      // Exit 0 even with unreachable sources (that's an expected condition);
      // a flagged change is a positive outcome, not an error.
      process.exit(0);
    })
    .catch((err) => {
      console.error('Update check failed:', err.message);
      process.exit(1);
    });
}
