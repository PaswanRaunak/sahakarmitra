// ─────────────────────────────────────────────
// LLM service — resilient multi-provider AI engine (OpenRouter + Groq)
// Supports instant token streaming, document/screenshot analysis,
// automatic provider fallback, and 100% grounded legal citations.
// ─────────────────────────────────────────────

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_API_URL       = 'https://api.groq.com/openai/v1/chat/completions';

const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi (Devanagari script)',
  mr: 'Marathi (Devanagari script)',
};

/**
 * Build the system prompt that grounds the LLM in retrieved law text and user attachments.
 */
function buildSystemPrompt(retrievedChunks, language, attachmentContext = '') {
  const langName = LANGUAGE_NAMES[language] || 'English';

  const contextText = (retrievedChunks || [])
    .map((chunk, i) => {
      const source  = chunk.metadata?.source_file   || 'unknown';
      const section = chunk.metadata?.section_title || 'unknown';
      return `[Statutory Source ${i + 1} — file: ${source}, section: ${section}]\n${chunk.text}`;
    })
    .join('\n\n---\n\n');

  let prompt = `You are SahakarMitra, an expert AI legal assistant for Indian cooperative societies (specializing in the Maharashtra Cooperative Societies Act, 1960).

Answer the user's inquiry directly using the provided statutory legal provisions${attachmentContext ? ' and the content extracted from the user\'s attached document/screenshot' : ''}. Always cite the specific section/source you relied on, e.g. "According to <section_title>, ...".`;

  if (attachmentContext) {
    prompt += `\n\n── USER ATTACHED DOCUMENT / SCREENSHOT EXTRACTED CONTENT ──\n${attachmentContext}\n\n── INSTRUCTIONS FOR ATTACHED DOCUMENTS/SCREENSHOTS ──\n1. Analyze the user's document/screenshot against the statutory legal provisions provided below.\n2. Address whether the notice, meeting, election, audit, dispute, or bylaw in the attachment aligns with the legal requirements.\n3. Directly reference key facts from the attachment (e.g. notice period, agenda, voting threshold, authority) and explain their legal validity.\n4. Provide concrete, actionable legal recommendations.`;
  }

  prompt += `\n\nIf the retrieved text does not contain enough information to answer, state clearly what is known from the knowledge base and what requires legal counsel — do NOT invent section numbers or facts.

Keep answers structured, clear, and actionable with exact section citations. Use clean Markdown headers (###), bullet points (- item), and bold text (**text**). Do NOT output raw HTML tags like <br> or pseudo-pipe syntax (| text |). Do NOT output internal scratchpads, thinking steps, or preambles like "Here's a thinking process:". Begin directly with your legal assessment. Respond in ${langName}.

── RETRIEVED STATUTORY LEGAL TEXT ──
${contextText}`;

  return prompt;
}

/**
 * Build the full message array sent to LLM:
 * system prompt → recent chat history → current question.
 */
function buildMessages(question, retrievedChunks, language, history = [], attachmentContext = '') {
  const messages = [
    { role: 'system', content: buildSystemPrompt(retrievedChunks, language, attachmentContext) },
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
    : (attachmentContext ? 'Please analyze the attached document/screenshot in detail under the Maharashtra Cooperative Societies Act, 1960 and provide a legal assessment with section references.' : 'Hello');

  messages.push({ role: 'user', content: userQuery });
  return messages;
}

function buildFallbackAnswer(question, retrievedChunks, language, attachmentContext = '') {
  const primary = retrievedChunks?.[0];
  const section = primary?.metadata?.section_title || 'Maharashtra Cooperative Societies Act, 1960';
  const file = primary?.metadata?.source_file || 'law_document';
  
  if (language === 'hi') {
    return `धारा [${section}] (${file}) के अनुसार:\n\n${primary?.text || 'विधिक ज्ञानकोष के अनुसार जानकारी उपलब्ध है।'}`;
  } else if (language === 'mr') {
    return `कलम [${section}] (${file}) नुसार:\n\n${primary?.text || 'कायदेशीर ज्ञानकोषानुसार माहिती उपलब्ध आहे.'}`;
  } else {
    return `According to ${section} (${file}):\n\n${primary?.text || 'Statutory provisions retrieved from the knowledge base.'}`;
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
 * original text on any failure — retrieval quality degrades, but
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
            content: 'You translate user questions to English. Reply with ONLY the English translation of the question — no explanations, no quotes, no extra text.',
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
export async function generateAnswer(question, retrievedChunks, language = 'en', history = [], attachmentContext = '') {
  const messages = buildMessages(question, retrievedChunks, language, history, attachmentContext);

  for (const prov of getProviders()) {
    try {
      console.log(`[llm] Calling ${prov.name} (model: ${prov.model})...`);
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

  return buildFallbackAnswer(question, retrievedChunks, language, attachmentContext);
}

/**
 * Stream LLM tokens with automatic provider fallback.
 */
export async function generateAnswerStream(question, retrievedChunks, language = 'en', history = [], onToken = () => {}, attachmentContext = '') {
  const messages = buildMessages(question, retrievedChunks, language, history, attachmentContext);

  for (const prov of getProviders()) {
    try {
      console.log(`[llm-stream] Calling ${prov.name} stream (model: ${prov.model})...`);
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
  const fallback = buildFallbackAnswer(question, retrievedChunks, language, attachmentContext);
  onToken(fallback);
  return fallback;
}
