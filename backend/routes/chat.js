// ─────────────────────────────────────────────
// POST /api/chat        → blocking JSON response
// POST /api/chat/stream → Server-Sent Events token stream
//
// Body: {
//   message: string,
//   language: "en"|"hi"|"mr"|... (any language-config code),
//   state?: string,
//   history?: [{role, text}],
//   attachments?: [{ name, type, data, size }]
// }
// Resp (JSON): { answer, sources: [...], parsedFiles: [] }
// Resp (SSE):  data: {type:"token"|"done"|"no_match"|"error"|"status", ...}
//
// The heavy lifting (style detection, retrieval, generation) lives in
// services/chatPipeline.js so the Telegram bot and the web frontend
// share one RAG engine.
// ─────────────────────────────────────────────

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { retrieveRelevantChunks } from '../services/retrieval.js';
import { generateAnswerStream } from '../services/llm.js';
import { parseAllAttachments } from '../services/documentParser.js';
import {
  runChatPipeline,
  resolveStyle,
  buildRetrievalQuery,
  filterRelevant,
  formatSources,
} from '../services/chatPipeline.js';

const router = express.Router();

const __routeDirname = path.dirname(fileURLToPath(import.meta.url));

// All languages declared in language-config.json are accepted at the API
// layer (validation must be able to test a language BEFORE it is enabled);
// the frontend only offers languages where enabled: true.
let KNOWN_LANGS = new Set(['en', 'hi', 'mr']);
try {
  const cfg = JSON.parse(fs.readFileSync(path.join(__routeDirname, '..', 'data', 'language-config.json'), 'utf-8'));
  KNOWN_LANGS = new Set(Object.keys(cfg).filter((k) => !k.startsWith('_')));
} catch (err) {
  console.warn('[chat] language-config.json unreadable, using default languages:', err.message);
}

const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_ITEMS = 6;
const MAX_HISTORY_TEXT = 1000;
const MAX_ATTACHMENTS = 5;

// ── Shared request validation ────────────────────────────────
function parseChatRequest(req) {
  const { message = '', language = 'en', state = 'Maharashtra', history = [], attachments = [] } = req.body ?? {};

  const cleanMessage = typeof message === 'string' ? message.trim().slice(0, MAX_MESSAGE_LENGTH) : '';
  const validAttachments = Array.isArray(attachments)
    ? attachments
        .filter(a => a && typeof a.data === 'string' && a.data.length > 0)
        .slice(0, MAX_ATTACHMENTS)
    : [];

  if (!cleanMessage && validAttachments.length === 0) {
    return { error: 'Please provide a question or attach a file/screenshot.' };
  }
  if (!KNOWN_LANGS.has(language)) {
    return { error: `Field "language" must be a supported language code (${[...KNOWN_LANGS].join(', ')}).` };
  }

  const cleanHistory = Array.isArray(history)
    ? history
        .filter((m) => m && (m.role === 'user' || m.role === 'bot') && typeof m.text === 'string')
        .slice(-MAX_HISTORY_ITEMS)
        .map((m) => ({ role: m.role, text: m.text.slice(0, MAX_HISTORY_TEXT) }))
    : [];

  return { message: cleanMessage, language, state: typeof state === 'string' ? state.trim() : 'Maharashtra', history: cleanHistory, attachments: validAttachments };
}

// ── Blocking endpoint ────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const parsed = parseChatRequest(req);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }
    const { message, language, state, history, attachments } = parsed;

    const result = await runChatPipeline({ message, language, state, history, attachments, logTag: 'chat' });
    return res.json({ answer: result.answer, sources: result.sources, parsedFiles: result.parsedFiles });
  } catch (err) {
    console.error('[chat] ERROR:', err);
    return res.status(500).json({
      error: 'Failed to generate answer.',
      details: err.message,
    });
  }
});

// ── Streaming endpoint (SSE) — used by the frontend chat ─────
router.post('/stream', async (req, res) => {
  const parsed = parseChatRequest(req);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }
  const { message, language, state, history, attachments } = parsed;

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const style = await resolveStyle(message, language);
    console.log(`[chat-stream] q="${message.slice(0, 80)}" state=${state} attachments=${attachments.length} lang=${language} style=${style.lang}/${style.form}`);

    if (attachments.length > 0) {
      send({ type: 'status', text: 'Processing attachments & OCR...' });
    }

    // Parse attachments (OCR for images, parsing for PDF)
    const { combinedText: attachmentContext } = await parseAllAttachments(attachments);

    // Build retrieval query (translate + follow-up context), then filter
    const retrievalQuery = await buildRetrievalQuery(message, attachmentContext, language, history, state, style);
    const chunks = filterRelevant(await retrieveRelevantChunks(retrievalQuery, 3, { state }));

    if (chunks.length === 0) {
      console.log(`[chat-stream] No relevant chunks — sending no_match.`);
      send({ type: 'no_match' });
      send({ type: 'done', sources: [] });
      return res.end();
    }

    await generateAnswerStream(message, chunks, language, history, (token) => {
      if (token) {
        send({ type: 'token', text: token });
      }
    }, attachmentContext, state, style);

    send({ type: 'done', sources: formatSources(chunks) });
    console.log(`[chat-stream] OK`);
    res.end();
  } catch (err) {
    console.error('[chat-stream] ERROR:', err);
    send({ type: 'error', error: err.message });
    res.end();
  }
});

export default router;
