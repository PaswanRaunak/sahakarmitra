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
// Resp (JSON): { answer, sources: [{ section, source_file, excerpt }], parsedFiles: [] }
// Resp (SSE):  data: {type:"token"|"done"|"no_match"|"error"|"status", ...}
// ─────────────────────────────────────────────

import express from 'express';
import { retrieveRelevantChunks } from '../services/retrieval.js';
import { generateAnswer, generateAnswerStream, translateToEnglish } from '../services/llm.js';
import { parseAllAttachments } from '../services/documentParser.js';

const router = express.Router();

const ALLOWED_LANGS = new Set(['en', 'hi', 'mr']);
// Cosine-distance cutoff for the local MiniLM index (measured: on-topic
// queries land ~0.7–1.4, unrelated text ~1.9). Env-overridable.
const MAX_RELEVANCE_DISTANCE = parseFloat(process.env.RELEVANCE_MAX_DISTANCE || '1.5');
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
  if (!ALLOWED_LANGS.has(language)) {
    return { error: 'Field "language" must be one of: en, hi, mr.' };
  }

  const cleanHistory = Array.isArray(history)
    ? history
        .filter((m) => m && (m.role === 'user' || m.role === 'bot') && typeof m.text === 'string')
        .slice(-MAX_HISTORY_ITEMS)
        .map((m) => ({ role: m.role, text: m.text.slice(0, MAX_HISTORY_TEXT) }))
    : [];

  return { message: cleanMessage, language, state: typeof state === 'string' ? state.trim() : 'Maharashtra', history: cleanHistory, attachments: validAttachments };
}

// ── Relevance filter: drop chunks above the cosine-distance cutoff ──
function filterRelevant(chunks) {
  return chunks.filter(c => c.distance == null || c.distance <= MAX_RELEVANCE_DISTANCE);
}

// ── Build the retrieval query ────────────────────────────────
// Non-English queries are translated to English first (the embedding
// model is English-only). Short follow-up questions like "and the
// secretary's duties?" are prefixed with the previous user message so
// they retrieve against the full intent, not the bare fragment.
async function buildRetrievalQuery(message, attachmentContext, language, history, state = 'Maharashtra') {
  let query = message || attachmentContext.slice(0, 300) || `${state} cooperative societies rules`;

  if (message && language !== 'en') {
    const translated = await translateToEnglish(message);
    if (translated && translated !== message) {
      console.log(`[chat] Translated query: "${message.slice(0, 60)}" -> "${translated.slice(0, 60)}"`);
    }
    query = translated || query;
  }

  if (message) {
    const wordCount = query.split(/\s+/).filter(Boolean).length;
    if (wordCount <= 6 && history.length > 0) {
      const prevUser = [...history].reverse().find(m => m.role === 'user');
      if (prevUser && prevUser.text) {
        query = `${prevUser.text} ${query}`;
      }
    }
  }

  return query.trim() || `${state} cooperative societies rules`;
}

// ── Format sources for the frontend ──────────────────────────
function formatSources(chunks) {
  return chunks.map((c) => ({
    section:       c.metadata?.section_title || 'Unknown section',
    act_name:      c.metadata?.act_name      || 'Cooperative Societies Act',
    state:         c.metadata?.state         || 'Maharashtra',
    source_file:   c.metadata?.source_file   || 'unknown',
    isCrossState:  !!c.isCrossState,
    matchedState:  c.matchedState || c.metadata?.state,
    excerpt:       c.text.slice(0, 220) + (c.text.length > 220 ? '...' : ''),
  }));
}

const NO_MATCH_ANSWERS = {
  en: 'I could not find any relevant legal text for your question in the current knowledge base. Please try rephrasing your question, or consult official legal counsel.',
  hi: 'वर्तमान ज्ञान कोश में आपके प्रश्न से संबंधित कोई कानूनी पाठ नहीं मिला। कृपया प्रश्न दूसरे शब्दों में पूछें, या आधिकारिक कानूनी सलाह लें।',
  mr: 'सध्याच्या ज्ञानकोशात तुमच्या प्रश्नाशी संबंधित कोणताही कायदेशीर मजकूर सापडला नाही. कृपया प्रश्न दुसऱ्या शब्दांत विचारा किंवा अधिकृत कायदेशीर सल्ला घ्या.',
};

// ── Blocking endpoint ────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const parsed = parseChatRequest(req);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }
    const { message, language, state, history, attachments } = parsed;

    console.log(`[chat] q="${message.slice(0, 80)}" state=${state} attachments=${attachments.length} lang=${language}`);

    // Parse attachments (OCR images, parse PDFs, decode text files)
    const { combinedText: attachmentContext, parsedFiles } = await parseAllAttachments(attachments);

    // Build retrieval query (translate + follow-up context), then filter by relevance
    const retrievalQuery = await buildRetrievalQuery(message, attachmentContext, language, history, state);
    const chunks = filterRelevant(await retrieveRelevantChunks(retrievalQuery, 3, { state }));

    if (chunks.length === 0) {
      console.log(`[chat] No relevant chunks (cutoff=${MAX_RELEVANCE_DISTANCE}) — returning no-match answer.`);
      return res.json({ answer: NO_MATCH_ANSWERS[language] || NO_MATCH_ANSWERS.en, sources: [], parsedFiles });
    }

    const answer = await generateAnswer(message, chunks, language, history, attachmentContext, state);
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
  const { message, language, state, history, attachments } = parsed;

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    console.log(`[chat-stream] q="${message.slice(0, 80)}" state=${state} attachments=${attachments.length} lang=${language}`);

    if (attachments.length > 0) {
      send({ type: 'status', text: 'Processing attachments & OCR...' });
    }

    // Parse attachments (OCR for images, parsing for PDF)
    const { combinedText: attachmentContext } = await parseAllAttachments(attachments);

    // Build retrieval query (translate + follow-up context), then filter by relevance
    const retrievalQuery = await buildRetrievalQuery(message, attachmentContext, language, history, state);
    const chunks = filterRelevant(await retrieveRelevantChunks(retrievalQuery, 3, { state }));

    if (chunks.length === 0) {
      console.log(`[chat-stream] No relevant chunks (cutoff=${MAX_RELEVANCE_DISTANCE}) — sending no_match.`);
      send({ type: 'no_match' });
      send({ type: 'done', sources: [] });
      return res.end();
    }

    await generateAnswerStream(message, chunks, language, history, (token) => {
      if (token) {
        send({ type: 'token', text: token });
      }
    }, attachmentContext, state);

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
