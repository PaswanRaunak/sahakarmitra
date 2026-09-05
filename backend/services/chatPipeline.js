// ─────────────────────────────────────────────
// Chat pipeline — the shared RAG "engine" used by every frontend:
// the web routes (routes/chat.js), the Telegram bot
// (services/telegramBot.js), and any future integration.
//
// One pipeline, no duplication: style detection → retrieval query
// (translated when needed) → parent-child retrieval → relevance filter
// → grounded answer generation.
// ─────────────────────────────────────────────

import { retrieveRelevantChunks } from './retrieval.js';
import {
  generateAnswer,
  translateToEnglish,
  detectLanguageStyle,
  classifyStyleWithLLM,
} from './llm.js';
import { parseAllAttachments } from './documentParser.js';

// Cosine-distance cutoff for the local MiniLM index (measured: on-topic
// queries land ~0.7-1.4, unrelated text ~1.9). Env-overridable.
const MAX_RELEVANCE_DISTANCE = parseFloat(process.env.RELEVANCE_MAX_DISTANCE || '1.5');

export const NO_MATCH_ANSWERS = {
  en: 'I could not find any relevant legal text for your question in the current knowledge base. Please try rephrasing your question, or consult official legal counsel.',
  hi: 'वर्तमान ज्ञान कोश में आपके प्रश्न से संबंधित कोई कानूनी पाठ नहीं मिला। कृपया प्रश्न दूसरे शब्दों में पूछें, या आधिकारिक कानूनी सलाह लें।',
  mr: 'सध्याच्या ज्ञानकोशात तुमच्या प्रश्नाशी संबंधित कोणताही कायदेशीर मजकूर सापडला नाही. कृपया प्रश्न दुसऱ्या शब्दांत विचारा किंवा अधिकृत कायदेशीर सल्ला घ्या.',
};

// ── Relevance filter: drop chunks above the cosine-distance cutoff ──
export function filterRelevant(chunks) {
  return chunks.filter(c => c.distance == null || c.distance <= MAX_RELEVANCE_DISTANCE);
}

// ── Language style resolution ────────────────────────────────
// Heuristic detection of the user's input style; LLM classification
// only when the heuristic is ambiguous. The detected style mirrors the
// response style AND decides whether retrieval translation is needed.
export async function resolveStyle(message, language) {
  let style = detectLanguageStyle(message, language);
  if (style.ambiguous) {
    style = (await classifyStyleWithLLM(message)) || style;
  }
  return style;
}

// ── Build the retrieval query ────────────────────────────────
// Non-English-style queries are translated to English first (the
// embedding model is English-only). Short follow-up questions like
// "and the secretary's duties?" are prefixed with the previous user
// message so they retrieve against the full intent, not the fragment.
export async function buildRetrievalQuery(message, attachmentContext, language, history, state = 'Maharashtra', style = { lang: 'en', form: 'native' }) {
  let query = message || (attachmentContext || '').slice(0, 300) || `${state} cooperative societies rules`;

  if (message && (style.lang !== 'en' || style.form === 'romanized')) {
    const translated = await translateToEnglish(message);
    if (translated && translated !== message) {
      console.log(`[pipeline] Translated query: "${message.slice(0, 60)}" -> "${translated.slice(0, 60)}"`);
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

// ── Format sources for any frontend ──────────────────────────
export function formatSources(chunks) {
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

/**
 * Run the full RAG pipeline for one user message.
 *
 * @param {object} opts
 * @param {string}   opts.message       The user's question
 * @param {string}   [opts.language]    UI language hint ('en'|'hi'|'mr')
 * @param {string}   [opts.state]       Selected jurisdiction
 * @param {Array}    [opts.history]     [{role, text}] recent turns
 * @param {Array}    [opts.attachments] [{name, type, data, size}] base64 files
 * @param {string}   [opts.logTag]      Log prefix ('chat', 'telegram', ...)
 * @returns {Promise<{answer, sources, parsedFiles, style, noMatch}>}
 */
export async function runChatPipeline({ message, language = 'en', state = 'Maharashtra', history = [], attachments = [], logTag = 'pipeline' }) {
  const style = await resolveStyle(message, language);
  console.log(`[${logTag}] q="${String(message).slice(0, 80)}" state=${state} attachments=${attachments.length} lang=${language} style=${style.lang}/${style.form}`);

  // Parse attachments (OCR images, parse PDFs, decode text files)
  const { combinedText: attachmentContext, parsedFiles } = await parseAllAttachments(attachments);

  // Build retrieval query (translate + follow-up context), then filter
  const retrievalQuery = await buildRetrievalQuery(message, attachmentContext, language, history, state, style);
  const chunks = filterRelevant(await retrieveRelevantChunks(retrievalQuery, 3, { state }));

  if (chunks.length === 0) {
    console.log(`[${logTag}] No relevant chunks (cutoff=${MAX_RELEVANCE_DISTANCE}) — returning no-match answer.`);
    return {
      answer: NO_MATCH_ANSWERS[language] || NO_MATCH_ANSWERS.en,
      sources: [],
      parsedFiles,
      style,
      noMatch: true,
    };
  }

  const answer = await generateAnswer(message, chunks, language, history, attachmentContext, state, style);
  const sources = formatSources(chunks);

  console.log(`[${logTag}] OK  answer_len=${answer.length}  sources=${sources.length}`);
  return { answer, sources, parsedFiles, style, noMatch: false };
}
