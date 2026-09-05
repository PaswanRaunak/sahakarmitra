// ─────────────────────────────────────────────
// SahakarMitra backend entry point
// Serves the REST API that the React frontend talks to.
// ─────────────────────────────────────────────

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import chatRoutes from './routes/chat.js';
import reviewRoutes from './routes/review.js';
import geoRoutes from './routes/geo.js';
import { isLlmConfigured } from './services/llm.js';
import { getAllDocumentChunks } from './services/retrieval.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// ── Simple in-memory rate limiter (per IP, fixed window) ─────
// RATE_LIMIT_MAX is env-overridable so bulk validation runs
// (validate:citations / validate:translations) can go through /api/chat.
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '60', 10);

const rateBuckets = new Map(); // ip -> { count, resetAt }

// Periodically drop expired buckets so the map can't grow unbounded
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS).unref();

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();

  let bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateBuckets.set(ip, bucket);
  }

  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a few minutes and try again.',
    });
  }
  next();
}

// Middleware
app.use(cors());                                  // allow the Vite dev server (5173) to call us
app.use(express.json({ limit: '25mb' }));         // parse JSON bodies (chat messages & attachments)
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health-check endpoint, reports real readiness, not just liveness:
//   llm: whether at least one AI provider key is configured
//   knowledgeBase: how many law text files are available for retrieval
app.get('/api/health', (req, res) => {
  const dataDir = path.join(__dirname, 'data');
  const dataFiles = fs.existsSync(dataDir)
    ? fs.readdirSync(dataDir).filter(f => f.endsWith('.txt')).length
    : 0;

  res.json({
    status: isLlmConfigured() && dataFiles > 0 ? 'ok' : 'degraded',
    service: 'SahakarMitra API',
    llmConfigured: isLlmConfigured(),
    knowledgeBaseFiles: dataFiles,
  });
});

// Rate-limited API surface (chat = LLM cost, feedback = write path)
app.use('/api/chat', rateLimit, chatRoutes);
app.use('/api/geo', geoRoutes);

// ── HITL Translation Review (admin) ────────────────────────────
app.use('/api/review', reviewRoutes);
app.get('/admin/review', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'review.html'));
});

// ── Knowledge Repository Endpoint ──────────────────────────────
// Retrieves ALL documents/chunks currently stored in ChromaDB
app.get('/api/library', async (req, res) => {
  try {
    const { state } = req.query;
    const documents = await getAllDocumentChunks({ state });
    res.json(documents);
  } catch (err) {
    console.error('[library] Failed to fetch documents:', err.message);
    res.status(500).json({ error: 'Failed to retrieve library documents.' });
  }
});

// ── State rollout config ────────────────────────────────────────
// Drives the state selector: enabled jurisdictions selectable,
// disabled greyed as "coming soon". Coverage counts come straight
// from state-config.json — honest, live progress.
const stateConfigPath = path.join(__dirname, 'data', 'state-config.json');

app.get('/api/states', (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(stateConfigPath, 'utf-8'));
    const states = Object.entries(config)
      .filter(([name]) => !name.startsWith('_'))
      .map(([name, flags]) => ({
        id: name,
        name,
        enabled: !!flags.enabled,
        validated: !!flags.validated,
        act_name: flags.act_name || null,
        description: flags.description || null,
      }))
      .sort((a, b) => (a.enabled === b.enabled ? a.name.localeCompare(b.name) : a.enabled ? -1 : 1));
    const enabledCount = states.filter((s) => s.enabled).length;
    res.json({ states, coverage: { enabled: enabledCount, total: states.length } });
  } catch (err) {
    console.error('[states] Failed to read state config:', err.message);
    res.status(500).json({ error: 'Could not load state configuration.' });
  }
});

// ── Language rollout config ─────────────────────────────────────
// Drives the language selector: enabled languages are selectable,
// disabled ones are shown greyed as "coming soon". Names come from
// Intl.DisplayNames (no hardcoded per-language maps).
const languageConfigPath = path.join(__dirname, 'data', 'language-config.json');

app.get('/api/languages', (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(languageConfigPath, 'utf-8'));
    const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
    const languages = Object.entries(config)
      .filter(([code]) => !code.startsWith('_'))
      .map(([code, flags]) => ({
        code,
        name: displayNames.of(code) || code,
        enabled: !!flags.enabled,
        validated: !!flags.validated,
      }))
      .sort((a, b) => (a.enabled === b.enabled ? a.name.localeCompare(b.name) : a.enabled ? -1 : 1));
    res.json(languages);
  } catch (err) {
    console.error('[languages] Failed to read language config:', err.message);
    res.status(500).json({ error: 'Could not load language configuration.' });
  }
});

// ── Bookmarks Endpoints (per-account) ───────────────────────────
// Bookmarks are scoped to the signed-in account (email). The store is
// { [email]: [items] }; a legacy flat-array bookmarks.json (which mixed
// accounts) is discarded rather than attributed.
const bookmarksPath = path.join(__dirname, 'data', 'bookmarks.json');

function readBookmarkStore() {
  try {
    if (fs.existsSync(bookmarksPath)) {
      const raw = JSON.parse(fs.readFileSync(bookmarksPath, 'utf-8'));
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
      // Legacy flat array (pre-account-scoping): unattributable, drop it
    }
  } catch (err) {
    console.warn('[bookmarks] Failed to read bookmarks:', err.message);
  }
  return {};
}

function writeBookmarkStore(store) {
  try {
    fs.writeFileSync(bookmarksPath, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[bookmarks] Failed to write bookmarks:', err.message);
  }
}

function emailOf(req, body = {}) {
  return String(req.query.email || body.email || 'anonymous').toLowerCase().slice(0, 200);
}

app.get('/api/bookmarks', (req, res) => {
  const store = readBookmarkStore();
  res.json(store[emailOf(req)] || []);
});

app.post('/api/bookmarks', (req, res) => {
  const item = req.body;
  if (!item || (!item.id && !item.section_title)) {
    return res.status(400).json({ error: 'Invalid bookmark item' });
  }
  const email = emailOf(req, item);
  const store = readBookmarkStore();
  const list = store[email] || [];
  const existingIndex = list.findIndex(b => b.id === item.id || b.section_title === item.section_title);
  if (existingIndex >= 0) {
    list.splice(existingIndex, 1);
  } else {
    list.unshift({
      id: item.id,
      section_title: item.section_title,
      act_name: item.act_name,
      category: item.category,
      source_file: item.source_file,
      excerpt: item.excerpt,
      bookmarkedAt: new Date().toISOString(),
    });
  }
  store[email] = list;
  writeBookmarkStore(store);
  res.json(list);
});

app.delete('/api/bookmarks/:id', (req, res) => {
  const email = emailOf(req);
  const store = readBookmarkStore();
  const list = store[email] || [];
  store[email] = list.filter(b => b.id !== req.params.id && b.section_title !== req.params.id);
  writeBookmarkStore(store);
  res.json(store[email]);
});

// ── Feedback endpoint, persists thumbs up/down for later analysis ──
const feedbackPath = path.join(__dirname, 'data', 'feedback.jsonl');

app.post('/api/feedback', rateLimit, (req, res) => {
  const { messageId, rating, question = '', answer = '' } = req.body ?? {};

  if (!messageId || (rating !== 'up' && rating !== 'down')) {
    return res.status(400).json({ error: 'Fields "messageId" and "rating" (up|down) are required.' });
  }

  const entry = {
    messageId: String(messageId).slice(0, 100),
    rating,
    question: String(question).slice(0, 2000),
    answer: String(answer).slice(0, 4000),
    ts: new Date().toISOString(),
  };

  try {
    fs.appendFileSync(feedbackPath, JSON.stringify(entry) + '\n', 'utf-8');
  } catch (err) {
    console.warn('[feedback] Could not persist feedback:', err.message);
    return res.status(500).json({ error: 'Could not store feedback.' });
  }

  return res.json({ ok: true });
});

// ── Scheduled legal-document monitoring (Module 2) ─────────────
// Opt-in: set ENABLE_CRON=true to run the scraper + diff engine on a
// cron schedule inside this process (see scripts/scheduled-check.js).
if (process.env.ENABLE_CRON === 'true') {
  import('./scripts/scheduled-check.js')
    .then(({ startCron }) => startCron())
    .catch((err) => console.warn('[server] Could not start update-check scheduler:', err.message));
}

app.listen(PORT, () => {
  console.log(`SahakarMitra backend running on http://localhost:${PORT}`);
  console.log(`  Health check : http://localhost:${PORT}/api/health`);
  console.log(`  Chat endpoint: http://localhost:${PORT}/api/chat`);
  console.log(`  Library API  : http://localhost:${PORT}/api/library`);
  console.log(`  Rate limit   : ${RATE_LIMIT_MAX} requests / ${RATE_LIMIT_WINDOW_MS / 60000} min per IP`);
  console.log(`  Review (HITL): http://localhost:${PORT}/admin/review`);
});

