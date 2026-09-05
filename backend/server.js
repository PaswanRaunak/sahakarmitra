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

// ── Bookmarks Endpoints ─────────────────────────────────────────
const bookmarksPath = path.join(__dirname, 'data', 'bookmarks.json');

function readBookmarks() {
  try {
    if (fs.existsSync(bookmarksPath)) {
      const raw = fs.readFileSync(bookmarksPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[bookmarks] Failed to read bookmarks:', err.message);
  }
  return [];
}

function writeBookmarks(bookmarks) {
  try {
    fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[bookmarks] Failed to write bookmarks:', err.message);
  }
}

app.get('/api/bookmarks', (req, res) => {
  const bookmarks = readBookmarks();
  res.json(bookmarks);
});

app.post('/api/bookmarks', (req, res) => {
  const item = req.body;
  if (!item || (!item.id && !item.section_title)) {
    return res.status(400).json({ error: 'Invalid bookmark item' });
  }
  let bookmarks = readBookmarks();
  const existingIndex = bookmarks.findIndex(b => b.id === item.id || b.section_title === item.section_title);
  if (existingIndex >= 0) {
    bookmarks.splice(existingIndex, 1);
  } else {
    bookmarks.unshift({
      ...item,
      bookmarkedAt: new Date().toISOString(),
    });
  }
  writeBookmarks(bookmarks);
  res.json(bookmarks);
});

app.delete('/api/bookmarks/:id', (req, res) => {
  const { id } = req.params;
  let bookmarks = readBookmarks();
  bookmarks = bookmarks.filter(b => b.id !== id && b.section_title !== id);
  writeBookmarks(bookmarks);
  res.json(bookmarks);
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

