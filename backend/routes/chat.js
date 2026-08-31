// ─────────────────────────────────────────────
// POST /api/chat        → blocking JSON response
// POST /api/chat/stream → Server-Sent Events token stream
//
// Body: {
//   message: string,
//   language: "en"|"hi"|"mr",
//   history?: [{role, text}],
//   attachments?: [{ name, type, data, size }]
// }
// Resp (JSON): { answer, sources: [{ section, source_file, excerpt }], parsedAttachments: [] }
// Resp (SSE):  data: {type:"token"|"done"|"no_match"|"error"|"status", ...}
// ─────────────────────────────────────────────

import express from 'express';
import { retrieveRelevantChunks } from '../services/retrieval.js';
import { generateAnswer, generateAnswerStream } from '../services/llm.js';
import { parseAllAttachments } from '../services/documentParser.js';

const router = express.Router();

const ALLOWED_LANGS = new Set(['en', 'hi', 'mr']);
const MAX_RELEVANCE_DISTANCE = parseFloat(process.env.RELEVANCE_MAX_DISTANCE || '1.2');

// ── Shared request validation ────────────────────────────────
function parseChatRequest(req) {
  const { message = '', language = 'en', history = [], attachments = [] } = req.body ?? {};

  const cleanMessage = typeof message === 'string' ? message.trim() : '';
  const validAttachments = Array.isArray(attachments)
    ? attachments.filter(a => a && typeof a.data === 'string' && a.data.length > 0)
    : [];

  if (!cleanMessage && validAttachments.length === 0) {
    return { error: 'Please provide a question or attach a file/screenshot.' };
  }
  if (!ALLOWED_LANGS.has(language)) {
    return { error: 'Field "language" must be one of: en, hi, mr.' };
  }

  const cleanHistory = Array.isArray(history)
    ? history
        .filter((m) => m && (m.role === 'user' || m.role === 'bot') && typeof m.text === 'string')
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }))
    : [];

  return { message: cleanMessage, language, history: cleanHistory, attachments: validAttachments };
}

// ── Format sources for the frontend ──────────────────────────
function formatSources(chunks) {
  return chunks.map((c) => ({
    section:      c.metadata?.section_title || 'Unknown section',
    source_file:  c.metadata?.source_file   || 'unknown',
    excerpt:      c.text.slice(0, 220) + (c.text.length > 220 ? '...' : ''),
  }));
}

// ── GET-less router: blocking endpoint ───────────────────────
router.post('/', async (req, res) => {
  try {
    const parsed = parseChatRequest(req);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }
    const { message, language, history, attachments } = parsed;

    console.log(`[chat] q="${message.slice(0, 80)}" attachments=${attachments.length} lang=${language}`);

    // Parse attachments (OCR images, parse PDFs, decode text files)
    const { combinedText: attachmentContext, parsedFiles } = await parseAllAttachments(attachments);

    // Build retrieval query: combine user prompt + key terms from document
    const retrievalQuery = (message || attachmentContext.slice(0, 300)).trim() || 'Maharashtra cooperative societies rules';
    const chunks = await retrieveRelevantChunks(retrievalQuery, 3);

    const answer = await generateAnswer(message, chunks, language, history, attachmentContext);
    const sources = formatSources(chunks);

    console.log(`[chat] OK  answer_len=${answer.length}  sources=${sources.length}`);
    return res.json({ answer, sources, parsedFiles });
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
  const { message, language, history, attachments } = parsed;

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    console.log(`[chat-stream] q="${message.slice(0, 80)}" attachments=${attachments.length} lang=${language}`);

    if (attachments.length > 0) {
      send({ type: 'status', text: 'Processing attachments & OCR...' });
    }

    // Parse attachments (OCR for images, parsing for PDF)
    const { combinedText: attachmentContext } = await parseAllAttachments(attachments);

    // Hybrid vector retrieval
    const retrievalQuery = (message || attachmentContext.slice(0, 300)).trim() || 'Maharashtra cooperative societies';
    const chunks = await retrieveRelevantChunks(retrievalQuery, 3);

    let tokensSent = 0;
    await generateAnswerStream(message, chunks, language, history, (token) => {
      if (token) {
        tokensSent++;
        send({ type: 'token', text: token });
      }
    }, attachmentContext);

    // If 0 tokens were streamed, fallback to blocking answer
    if (tokensSent === 0) {
      console.log('[chat-stream] Stream yielded 0 tokens, fetching fallback response...');
      const fallbackAns = await generateAnswer(message, chunks, language, history, attachmentContext);
      if (fallbackAns) {
        send({ type: 'token', text: fallbackAns });
      }
    }

    send({ type: 'done', sources: formatSources(chunks) });
    console.log(`[chat-stream] OK (tokensSent=${tokensSent})`);
    res.end();
  } catch (err) {
    console.error('[chat-stream] ERROR:', err);
    send({ type: 'error', error: err.message });
    res.end();
  }
});

export default router;
