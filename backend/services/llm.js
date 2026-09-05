// ─────────────────────────────────────────────
// LLM service, resilient multi-provider AI engine (OpenRouter + Groq)
// Supports instant token streaming, document/screenshot analysis,
// automatic provider fallback, and 100% grounded legal citations.
// ─────────────────────────────────────────────

import { franc } from 'franc';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_API_URL       = 'https://api.groq.com/openai/v1/chat/completions';

const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi (Devanagari script)',
  mr: 'Marathi (Devanagari script)',
};

// ─────────────────────────────────────────────
// Language detection + style mirroring — language-agnostic.
//
// 1. Script/text language via franc (any language → ISO 639-3, mapped to
//    the language-config codes). No per-language keyword logic.
// 2. Romanized forms (Hinglish, Tanglish, ...) cannot be caught by script
//    detection: when text is Latin-dominant, a marker-word table
//    (data/romanized-markers.json — data, not logic) decides
//    romanized_{language}; the LLM classifier is the fallback only when
//    the markers are ambiguous, to save API calls.
// 3. ONE generic prompt template mirrors whatever language+form the user
//    used — works for any of the 22 scheduled languages with zero
//    per-language prompt engineering.
// ─────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __llmDirname = path.dirname(fileURLToPath(import.meta.url));
const MARKERS_FILE = path.join(__llmDirname, '..', 'data', 'romanized-markers.json');

// ISO 639-3 → codes used in language-config.json / golden-dataset variants
const ISO3_TO_CONFIG = {
  hin: 'hi', mar: 'mr', tam: 'ta', tel: 'te', kan: 'kn', guj: 'gu',
  ben: 'bn', mal: 'ml', pan: 'pa', ori: 'or', asm: 'as', eng: 'en',
  urd: 'ur', npi: 'ne', san: 'sa', kas: 'ks', kok: 'gom', mai: 'mai',
  doi: 'doi', brx: 'brx', sat: 'sat', snd: 'sd', mni: 'mni', ssc: 'sd',
};

// Latin-script marker word counts per language (data-driven, extensible)
let romanizedMarkers = null;
function loadRomanizedMarkers() {
  if (!romanizedMarkers) {
    try {
      romanizedMarkers = JSON.parse(fs.readFileSync(MARKERS_FILE, 'utf-8'));
      delete romanizedMarkers._comment;
    } catch (err) {
      console.warn('[llm] romanized-markers.json unreadable:', err.message);
      romanizedMarkers = {};
    }
  }
  return romanizedMarkers;
}

const languageNameCache = new Map();
export function languageDisplayName(code) {
  if (!code) return 'English';
  if (!languageNameCache.has(code)) {
    try {
      languageNameCache.set(code, new Intl.DisplayNames(['en'], { type: 'language' }).of(code) || code);
    } catch {
      languageNameCache.set(code, code);
    }
  }
  return languageNameCache.get(code);
}

/**
 * Language-agnostic detection.
 * Returns { lang, form, mixed, ambiguous } where
 *   lang      — language-config code ('hi', 'ta', 'en', ...)
 *   form      — 'native' (native script) | 'romanized' (Roman script)
 *   mixed     — English words naturally mixed into Indic-script text
 *   ambiguous — heuristic was not confident; caller may use the LLM classifier
 */
export function detectLanguageStyle(text, uiLanguage = 'en') {
  const t = (text || '').trim();
  const fallbackLang = uiLanguage || 'en';
  if (!t) return { lang: fallbackLang, form: 'native', mixed: false, ambiguous: false };

  // Count ALL letters AND vowel-sign marks (Devanagari vowel signs are
  // \p{M}, not \p{L} — counting only \p{L} undercounts Indic script),
  // then Latin specifically
  const total = (t.match(/\p{L}|\p{M}/gu) || []).length;
  const latin = (t.match(/[A-Za-z]/g) || []).length;
  if (total === 0) return { lang: fallbackLang, form: 'native', mixed: false, ambiguous: false };

  // Non-Latin-dominant text — franc identifies the language (any script:
  // Devanagari, Tamil, Telugu, Urdu/Arabic, Bengali, ...)
  if (latin / total < 0.5) {
    const iso3 = franc(t);
    const lang = ISO3_TO_CONFIG[iso3];
    const mixed = latin / total > 0.08;
    // Mixed-script text (Indic script + English words) often confuses franc
    // into 'eng'/'und' — if a significant share of the text is Indic
    // script, treat as ambiguous and let the LLM classifier decide.
    if (!lang || iso3 === 'und' || (iso3 === 'eng' && (total - latin) / total > 0.15)) {
      return { lang: fallbackLang, form: 'native', mixed, ambiguous: true };
    }
    return { lang, form: 'native', mixed, ambiguous: false };
  }

  // Latin-dominant text — English or a romanized Indic language
  const markers = loadRomanizedMarkers();
  let bestLang = null;
  let bestCount = 0;
  for (const [lang, words] of Object.entries(markers)) {
    let count = 0;
    for (const w of words) {
      const hits = t.toLowerCase().match(new RegExp(`\\b${w}\\b`, 'g'));
      count += hits ? hits.length : 0;
    }
    if (count > bestCount) {
      bestCount = count;
      bestLang = lang;
    }
  }

  if (bestLang && bestCount >= 2) {
    return { lang: bestLang, form: 'romanized', mixed: true, ambiguous: false };
  }
  if (bestLang && bestCount === 1) {
    // Weak evidence — let the LLM classifier decide
    return { lang: bestLang, form: 'romanized', mixed: true, ambiguous: true };
  }
  return { lang: 'en', form: 'native', mixed: false, ambiguous: false };
}

/**
 * LLM fallback for ambiguous detection. Returns { lang, form } or null.
 */
export async function classifyStyleWithLLM(text) {
  const providers = getProviders();
  if (!providers.length || !text || !text.trim()) return null;

  for (const prov of providers) {
    try {
      const response = await callChatApi({
        url: prov.url,
        headers: prov.headers,
        model: prov.model,
        stream: false,
        messages: [
          {
            role: 'system',
            content: 'Identify the language of the user message and whether it is written in its native script or in Roman script (romanized). Reply with ONLY a JSON object: {"language": "<ISO 639-1 code like hi, ta, mr, en>", "form": "<native|romanized>"}. No explanations.',
          },
          { role: 'user', content: text.slice(0, 500) },
        ],
      });
      if (!response.ok) continue;
      const data = await response.json();
      const raw = (data.choices?.[0]?.message?.content || '').trim();
      const match = /"language"\s*:\s*"([a-z]{2,4})"/i.exec(raw);
      const form = /romanized/i.test(raw) ? 'romanized' : 'native';
      if (match) {
        return { lang: ISO3_TO_CONFIG[match[1]] || match[1], form, mixed: form === 'romanized', ambiguous: false };
      }
    } catch {
      // try next provider
    }
  }
  return null;
}

/**
 * ONE generic style-mirroring instruction — works for any detected
 * language and form. No per-language prompt engineering.
 */
function buildStyleInstruction(styleInfo) {
  const info = styleInfo || { lang: 'en', form: 'native', mixed: false };
  const name = languageDisplayName(info.lang);
  const formText = info.form === 'romanized'
    ? 'romanized form (written in Roman/Latin script instead of its native script)'
    : 'native script form';

  return `

── LANGUAGE STYLE MIRRORING ──
The user wrote their message in ${name}, in ${formText}. Respond in the SAME language and the SAME form (native script or romanized) as the user's input. Match their natural mixing style — if they used English legal terms naturally mixed in, do the same in your response. Do not switch to a different language or script than what the user used, and do not force overly formal pure-language translations of common legal terms that are commonly used in English even in casual speech (e.g., "AGM", "auditor", "registration" are commonly kept in English even in casual conversation — mirror this natural usage). Always keep statutory citations accurate (the correct section number and Act name).`;
}

/**
 * Build the system prompt that grounds the LLM in retrieved law text and user attachments.
 */
function buildSystemPrompt(retrievedChunks, language, attachmentContext = '', state = 'Maharashtra', style = null) {
  const resolvedStyle = style || { en: 'english', hi: 'pure_hindi', mr: 'pure_marathi' }[language] || 'english';
  const styleInstruction = buildStyleInstruction(resolvedStyle);

  const hasCrossStateChunks = (retrievedChunks || []).some(c => c.isCrossState || (c.metadata?.state && c.metadata.state !== state && c.metadata.state !== 'Multi-State'));

  const contextText = (retrievedChunks || [])
    .map((chunk, i) => {
      const source   = chunk.metadata?.source_file   || 'unknown';
      const section  = chunk.metadata?.section_title || 'unknown';
      const actName  = chunk.metadata?.act_name      || 'Cooperative Societies Act';
      const chunkState = chunk.metadata?.state       || state;
      const isCross  = chunk.isCrossState ? ' [CROSS-STATE FALLBACK]' : '';
      return `[Statutory Source ${i + 1}${isCross}, State: ${chunkState}, Act: ${actName}, Section: ${section}, file: ${source}]\n${chunk.text}`;
    })
    .join('\n\n---\n\n');

  let prompt = `You are SahakarMitra, an expert AI legal assistant for Indian cooperative societies.
The user is inquiring about cooperative societies under the jurisdiction of **${state}** (along with applicable provisions from the Multi-State Co-operative Societies Act, 2002).

Answer the user's inquiry directly using the provided statutory legal provisions${attachmentContext ? ' and the content extracted from the user\'s attached document/screenshot' : ''}.
Always cite the specific statutory section, State, and Act name you relied on, e.g. "According to Section <number>, <Act Name> (<State>), ...".`;

  if (hasCrossStateChunks) {
    prompt += `\n\n── CROSS-STATE PROVISION NOTICE ──\nSome retrieved provisions are from another state's Act because an exact matching clause was not found under the selected state (${state}). If you reference a cross-state provision, you MUST explicitly state in your answer:\n"This appears to be specific to {other state}'s Act ({Act Name}) — please confirm which state's regulations apply to your society."`;
  }

  if (attachmentContext) {
    prompt += `\n\n── USER ATTACHED DOCUMENT / SCREENSHOT EXTRACTED CONTENT ──\n${attachmentContext}\n\n── INSTRUCTIONS FOR ATTACHED DOCUMENTS/SCREENSHOTS ──\n1. Analyze the user's document/screenshot against the statutory legal provisions provided below.\n2. Address whether the notice, meeting, election, audit, dispute, or bylaw in the attachment aligns with the legal requirements.\n3. Directly reference key facts from the attachment (e.g. notice period, agenda, voting threshold, authority) and explain their legal validity.\n4. Provide concrete, actionable legal recommendations.`;
  }

  prompt += `\n\nIf the retrieved text does not contain enough information to answer, state clearly what is known from the knowledge base and what requires legal counsel, do NOT invent section numbers or facts.

Keep answers structured, clear, and actionable with exact section citations. Use clean Markdown headers (###), bullet points (- item), and bold text (**text**). Do NOT output raw HTML tags like <br> or pseudo-pipe syntax (| text |). Do NOT output internal scratchpads, thinking steps, or preambles like "Here's a thinking process:". Begin directly with your legal assessment.${styleInstruction}

── RETRIEVED STATUTORY LEGAL TEXT ──
${contextText}`;

  return prompt;
}

/**
 * Build the full message array sent to LLM:
 * system prompt → recent chat history → current question.
 */
function buildMessages(question, retrievedChunks, language, history = [], attachmentContext = '', state = 'Maharashtra', style = null) {
  const messages = [
    { role: 'system', content: buildSystemPrompt(retrievedChunks, language, attachmentContext, state, style) },
  ];

  const cleanHistory = (Array.isArray(history) ? history : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'bot') && typeof m.text === 'string' && m.text.trim().length > 0)
    .slice(-6);

  for (const m of cleanHistory) {
    messages.push({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text.slice(0, 800),
    });
  }

  const userQuery = (question && question.trim().length > 0)
    ? question.trim()
    : (attachmentContext ? `Please analyze the attached document/screenshot in detail under the ${state} cooperative society legal framework and provide a legal assessment with section references.` : 'Hello');

  messages.push({ role: 'user', content: userQuery });
  return messages;
}

function buildFallbackAnswer(question, retrievedChunks, language, attachmentContext = '', state = 'Maharashtra', style = null) {
  const primary = retrievedChunks?.[0];
  const section = primary?.metadata?.section_title || `${state} Cooperative Societies Act`;
  const actName = primary?.metadata?.act_name || `${state} Cooperative Societies Act`;
  const file = primary?.metadata?.source_file || 'law_document';
  
  if (language === 'hi' && style !== 'hinglish') {
    return `धारा [${section}] (${actName}, ${file}) के अनुसार:\n\n${primary?.text || 'विधिक ज्ञानकोष के अनुसार जानकारी उपलब्ध है।'}`;
  } else if (language === 'mr') {
    return `कलम [${section}] (${actName}, ${file}) नुसार:\n\n${primary?.text || 'कायदेशीर ज्ञानकोषानुसार माहिती उपलब्ध आहे.'}`;
  } else {
    return `According to ${section} (${actName}, ${file}):\n\n${primary?.text || 'Statutory provisions retrieved from the knowledge base.'}`;
  }
}

/**
 * Perform fetch to OpenAI-compatible chat API (Groq or OpenRouter).
 */
async function callChatApi({ url, headers, model, messages, stream = false }) {
  const body = {
    model,
    messages,
    temperature: 0.2,
    max_tokens: 1400,
    ...(stream ? { stream: true } : {}),
  };

  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

/**
 * Build the ordered provider list (Groq first, then OpenRouter).
 * A GROQ_API_KEY that actually starts with "sk-or-" is treated as
 * an OpenRouter key, since those prefixes are how users paste keys.
 */
function getProviders() {
  const groqKey = process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.startsWith('sk-or-') ? process.env.GROQ_API_KEY : null;
  const openRouterKey = process.env.OPENROUTER_API_KEY || (process.env.GROQ_API_KEY?.startsWith('sk-or-') ? process.env.GROQ_API_KEY : null);

  const providers = [];

  if (groqKey) {
    providers.push({
      name: 'Groq',
      url: GROQ_API_URL,
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type':  'application/json',
      },
    });
  }

  if (openRouterKey) {
    providers.push({
      name: 'OpenRouter',
      url: OPENROUTER_API_URL,
      model: process.env.OPENROUTER_MODEL || 'openrouter/free',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'HTTP-Referer':  process.env.SITE_URL || 'http://localhost:5173',
        'X-Title':       'SahakarMitra',
        'Content-Type':  'application/json',
      },
    });
  }

  return providers;
}

export function isLlmConfigured() {
  return getProviders().length > 0;
}

/**
 * Translate a non-English query to English so it can be embedded
 * against the (English-only) law knowledge base. Falls back to the
 * original text on any failure, retrieval quality degrades, but
 * the request never breaks.
 */
export async function translateToEnglish(text) {
  const providers = getProviders();
  if (!providers.length || !text || !text.trim()) return text;

  for (const prov of providers) {
    try {
      const response = await callChatApi({
        url: prov.url,
        headers: prov.headers,
        model: prov.model,
        stream: false,
        messages: [
          {
            role: 'system',
            content: 'You translate user questions to English. Reply with ONLY the English translation of the question, no explanations, no quotes, no extra text.',
          },
          { role: 'user', content: text },
        ],
      });

      if (!response.ok) continue;

      const data = await response.json();
      const out = data.choices?.[0]?.message?.content?.trim();
      if (out) {
        // Strip wrapping quotes some models add
        return out.replace(/^["']|["']$/g, '').slice(0, 500);
      }
    } catch {
      // Try the next provider, else fall back to original text
    }
  }

  return text;
}

/**
 * Call LLM blocking response with automatic multi-provider fallback.
 */
export async function generateAnswer(question, retrievedChunks, language = 'en', history = [], attachmentContext = '', state = 'Maharashtra', style = null) {
  const messages = buildMessages(question, retrievedChunks, language, history, attachmentContext, state, style);

  for (const prov of getProviders()) {
    try {
      console.log(`[llm] Calling ${prov.name} (model: ${prov.model}) [State: ${state}]...`);
      const response = await callChatApi({
        url: prov.url,
        headers: prov.headers,
        model: prov.model,
        messages,
        stream: false,
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[llm] ${prov.name} failed (${response.status}): ${errText}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content && content.trim().length > 0) {
        console.log(`[llm] ${prov.name} succeeded (${content.length} chars)`);
        return content;
      }
    } catch (err) {
      console.warn(`[llm] ${prov.name} error:`, err.message);
    }
  }

  return buildFallbackAnswer(question, retrievedChunks, language, attachmentContext, state);
}

/**
 * Stream LLM tokens with automatic provider fallback.
 */
export async function generateAnswerStream(question, retrievedChunks, language = 'en', history = [], onToken = () => {}, attachmentContext = '', state = 'Maharashtra', style = null) {
  const messages = buildMessages(question, retrievedChunks, language, history, attachmentContext, state, style);

  for (const prov of getProviders()) {
    try {
      console.log(`[llm-stream] Calling ${prov.name} stream (model: ${prov.model}) [State: ${state}]...`);
      const response = await callChatApi({
        url: prov.url,
        headers: prov.headers,
        model: prov.model,
        messages,
        stream: true,
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[llm-stream] ${prov.name} notice (${response.status}): ${errText}`);
        continue;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      for await (const value of response.body) {
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep last partial line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') continue;

          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content || json.choices?.[0]?.text || '';
            if (delta) {
              full += delta;
              onToken(delta);
            }
          } catch {
            // Ignore malformed partial JSON lines
          }
        }
      }

      if (full.trim().length > 0) {
        console.log(`[llm-stream] ${prov.name} stream finished (${full.length} chars)`);
        return full;
      }
    } catch (err) {
      console.warn(`[llm-stream] ${prov.name} stream error:`, err.message);
    }
  }

  // Fallback if streaming produced no tokens
  const fallback = buildFallbackAnswer(question, retrievedChunks, language, attachmentContext, state);
  onToken(fallback);
  return fallback;
}
