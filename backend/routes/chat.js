// ─────────────────────────────────────────────
// POST /api/chat        → blocking JSON response
// POST /api/chat/stream → Server-Sent Events token stream
//
// Body: { message: string, language: "en"|"hi"|"mr", history?: [{role, text}] }
// Resp (JSON): { answer, sources: [{ section, source_file, excerpt }] }
// Resp (SSE):  data: {type:"token"|"done"|"no_match"|"error", ...}
//
// Pipeline:
//   1. validate request
//   2. embed the question  (embeddings.js)
//   3. vector-search ChromaDB for top-3 law chunks (retrieval.js)
//   3b. reject weak matches via a relevance-distance threshold
//   4. send chunks + history + question to Groq LLM (llm.js)
//   5. return answer + sources
// ─────────────────────────────────────────────

import express from 'express';
import { retrieveRelevantChunks } from '../services/retrieval.js';
import { generateAnswer, generateAnswerStream } from '../services/llm.js';

const router = express.Router();

const ALLOWED_LANGS = new Set(['en', 'hi', 'mr']);

// Cosine distance (0 = identical, 2 = opposite) above which we treat the best
// retrieved chunk as "not relevant enough" and refuse to answer, instead of
// risking a confident guess from weak context. Tune via .env.
const MAX_RELEVANCE_DISTANCE = parseFloat(process.env.RELEVANCE_MAX_DISTANCE || '1.1');

// ── Shared request validation ────────────────────────────────
function parseChatRequest(req) {
  const { message, language = 'en', history = [] } = req.body ?? {};

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return { error: 'Field "message" is required.' };
  }
  if (!ALLOWED_LANGS.has(language)) {
    return { error: 'Field "language" must be one of: en, hi, mr.' };
  }

  // History: only the last 6 turns are forwarded to the LLM (see llm.js).
  const cleanHistory = Array.isArray(history)
    ? history
        .filter((m) => m && (m.role === 'user' || m.role === 'bot') && typeof m.text === 'string')
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }))
    : [];

  return { message, language, history: cleanHistory };
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
    const { message, language, history } = parsed;

    console.log(`[chat] q="${message.slice(0, 80)}${message.length > 80 ? '...' : ''}" lang=${language}`);

    const chunks = await retrieveRelevantChunks(message, 3);

    if (chunks.length === 0) {
      // Either ChromaDB is empty or the collection doesn't exist.
      return res.json({
        answer: 'I could not find any relevant legal text for your question. Please ensure the ingest script has been run (npm run ingest) and ChromaDB is populated.',
        sources: [],
      });
    }

    // Refuse to answer from weak matches — better an honest "I don't know"
    // than a confident-sounding guess (the core promise of this product).
    if (chunks[0].distance != null && chunks[0].distance > MAX_RELEVANCE_DISTANCE) {
      console.log(`[chat] weak match (distance=${chunks[0].distance.toFixed(3)} > ${MAX_RELEVANCE_DISTANCE}) — refusing`);
      return res.json({
        answer: 'I could not find any relevant legal text for your question in the current knowledge base. Please try rephrasing, or consult official legal counsel.',
        sources: [],
      });
    }

    const answer = await generateAnswer(message, chunks, language, history);
    const sources = formatSources(chunks);

    console.log(`[chat] OK  answer_len=${answer.length}  sources=${sources.length}`);
    return res.json({ answer, sources });
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
  const { message, language, history } = parsed;

  // Switch the response to a Server-Sent Events stream.
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    console.log(`[chat-stream] q="${message.slice(0, 80)}${message.length > 80 ? '...' : ''}" lang=${language}`);

    const chunks = await retrieveRelevantChunks(message, 3);

    if (chunks.length === 0 || (chunks[0].distance != null && chunks[0].distance > MAX_RELEVANCE_DISTANCE)) {
      // Frontend renders this as a localized "no close match" message.
      send({ type: 'no_match' });
      res.end();
      return;
    }

    await generateAnswerStream(message, chunks, language, history, (token) => {
      send({ type: 'token', text: token });
    });

    send({ type: 'done', sources: formatSources(chunks) });
    console.log(`[chat-stream] OK`);
    res.end();
  } catch (err) {
    console.error('[chat-stream] ERROR:', err);
    // If headers are already sent we can only signal via the stream.
    send({ type: 'error', error: err.message });
    res.end();
  }
});

export default router;
