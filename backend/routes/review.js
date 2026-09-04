// ─────────────────────────────────────────────
// HITL (Human-in-the-Loop) review API — backs the /admin/review page.
//
//   GET  /api/review/flagged → flagged low-scoring translation entries
//                              from the latest validate-translations run,
//                              each merged with any existing manual review
//   POST /api/review/score   → persist a reviewer's manual scores
//                              (accuracy 1–5, fluency 1–5, legal meaning
//                              pass/fail) to data/review-scores.json
// ─────────────────────────────────────────────

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const RESULTS_FILE = path.join(dataDir, 'validation-results.json');
const SCORES_FILE = path.join(dataDir, 'review-scores.json');

const router = express.Router();

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    console.warn('[review] Failed to read', file, err.message);
  }
  return fallback;
}

function readScores() {
  const scores = readJson(SCORES_FILE, []);
  return Array.isArray(scores) ? scores : [];
}

// ── Flagged entries for manual review ───────────────────────────
router.get('/flagged', (req, res) => {
  const results = readJson(RESULTS_FILE, null);
  if (!results || !Array.isArray(results.entries)) {
    return res.status(404).json({
      error: 'No validation results found. Run "npm run validate:translations" first.',
    });
  }

  const scores = readScores();
  const flagged = results.entries
    .filter((e) => e.flagged)
    .map((e) => ({
      ...e,
      review: scores.find((s) => s.entry_id === e.id && s.language === e.language) || null,
    }));

  res.json({
    generated_at: results.generated_at,
    thresholds: results.thresholds,
    summary: results.summary,
    flagged_count: flagged.length,
    reviewed_count: flagged.filter((f) => f.review).length,
    flagged,
  });
});

// ── Persist a manual review score ───────────────────────────────
router.post('/score', (req, res) => {
  const { entry_id, language, accuracy, fluency, legal_meaning, reviewer = '' } = req.body ?? {};

  if (!entry_id || typeof entry_id !== 'string') {
    return res.status(400).json({ error: 'Field "entry_id" is required.' });
  }
  if (!['hi', 'mr', 'en'].includes(language)) {
    return res.status(400).json({ error: 'Field "language" must be one of: hi, mr, en.' });
  }
  if (!Number.isInteger(accuracy) || accuracy < 1 || accuracy > 5) {
    return res.status(400).json({ error: 'Field "accuracy" must be an integer 1–5.' });
  }
  if (!Number.isInteger(fluency) || fluency < 1 || fluency > 5) {
    return res.status(400).json({ error: 'Field "fluency" must be an integer 1–5.' });
  }
  if (legal_meaning !== 'pass' && legal_meaning !== 'fail') {
    return res.status(400).json({ error: 'Field "legal_meaning" must be "pass" or "fail".' });
  }

  const entry = {
    entry_id: entry_id.slice(0, 100),
    language,
    accuracy,
    fluency,
    legal_meaning,
    reviewer: String(reviewer).slice(0, 100) || 'anonymous',
    reviewed_at: new Date().toISOString(),
  };

  // Upsert by (entry_id, language) so re-reviewing an entry replaces the old score
  const scores = readScores();
  const idx = scores.findIndex((s) => s.entry_id === entry.entry_id && s.language === entry.language);
  if (idx >= 0) scores[idx] = entry;
  else scores.push(entry);

  try {
    fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2), 'utf-8');
  } catch (err) {
    console.error('[review] Could not persist review score:', err.message);
    return res.status(500).json({ error: 'Could not store review score.' });
  }

  res.json({ ok: true, review: entry });
});

export default router;
