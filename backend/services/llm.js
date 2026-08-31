// ─────────────────────────────────────────────
// LLM service — calls the Groq API (OpenAI-compatible)
// to generate a grounded, citation-backed answer.
//
// The system prompt is the heart of the RAG grounding: it tells
// the model to answer ONLY from the retrieved legal text, to always
// cite the section, and to admit ignorance when the context is empty.
//
// Supports both a blocking call (generateAnswer) and a streaming
// call (generateAnswerStream) used by POST /api/chat/stream so the
// frontend can render tokens as they arrive.
// ─────────────────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi (Devanagari script)',
  mr: 'Marathi (Devanagari script)',
};

// Single source of truth for the model id. Override via GROQ_MODEL in .env.
function getModel() {
  return process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
}

/**
 * Build the system prompt that grounds the LLM in retrieved law text.
 */
function buildSystemPrompt(retrievedChunks, language) {
  const langName = LANGUAGE_NAMES[language] || 'English';

  // Format each chunk with a clear [Source N] tag + section heading
  const contextText = retrievedChunks
    .map((chunk, i) => {
      const source  = chunk.metadata?.source_file   || 'unknown';
      const section = chunk.metadata?.section_title || 'unknown';
      return `[Source ${i + 1} — file: ${source}, section: ${section}]\n${chunk.text}`;
    })
    .join('\n\n---\n\n');

  return `You are SahakarMitra, a legal assistant for Indian cooperative societies (especially the Maharashtra Cooperative Societies Act, 1960).

Answer the user's question using ONLY the legal text provided below. Always cite the section/source you relied on, e.g. "According to <section_title>, ...".

If the retrieved text does not contain enough information to answer, say clearly that you do not have information on this topic in the current knowledge base — do NOT guess, do NOT make up section numbers, and do NOT use outside knowledge.

Keep answers concise (3–6 sentences) but include the operative section reference. Respond in ${langName}.

Retrieved legal text:
${contextText}`;
}

/**
 * Build the full message array sent to Groq:
 * system prompt → recent chat history (for follow-up questions) → current question.
 * History is the previous turns of this session, NOT including the current question.
 */
function buildMessages(question, retrievedChunks, language, history = []) {
  const messages = [
    { role: 'system', content: buildSystemPrompt(retrievedChunks, language) },
  ];

  const cleanHistory = (Array.isArray(history) ? history : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'bot') && typeof m.text === 'string' && m.text.trim().length > 0)
    .slice(-6); // keep the last 6 turns to stay well within the context window

  for (const m of cleanHistory) {
    messages.push({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text.slice(0, 800), // cap each historical turn
    });
  }

  messages.push({ role: 'user', content: question });
  return messages;
}

function buildFallbackAnswer(question, retrievedChunks, language) {
  const primary = retrievedChunks[0];
  const section = primary?.metadata?.section_title || 'Relevant Legal Section';
  const file = primary?.metadata?.source_file || 'document';
  
  if (language === 'hi') {
    return `धारा [${section}] (${file}) के अनुसार:\n\n${primary?.text || 'कोई जानकारी उपलब्ध नहीं है।'}`;
  } else if (language === 'mr') {
    return `कलम [${section}] (${file}) नुसार:\n\n${primary?.text || 'कोणतीही माहिती उपलब्ध नाही.'}`;
  } else {
    return `According to ${section} (${file}):\n\n${primary?.text || 'No detailed text available.'}`;
  }
}

/**
 * Call the Groq API with the grounded system prompt + user question.
 * Returns the LLM's answer string (blocking).
 */
export async function generateAnswer(question, retrievedChunks, language = 'en', history = []) {
  if (!process.env.GROQ_API_KEY) {
    return buildFallbackAnswer(question, retrievedChunks, language);
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model: getModel(),
        messages: buildMessages(question, retrievedChunks, language, history),
        temperature: 0.2,   // low temp → less hallucination
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[llm] Groq API notice (${response.status}): ${errText}. Using retrieved context fallback.`);
      return buildFallbackAnswer(question, retrievedChunks, language);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (err) {
    console.warn(`[llm] Groq API call failed: ${err.message}. Using retrieved context fallback.`);
    return buildFallbackAnswer(question, retrievedChunks, language);
  }
}

/**
 * Streaming variant: same request but with stream:true.
 * Calls onToken(deltaText) for each token chunk as it arrives from Groq.
 * Resolves with the full concatenated answer.
 */
export async function generateAnswerStream(question, retrievedChunks, language = 'en', history = [], onToken = () => {}) {
  if (!process.env.GROQ_API_KEY) {
    const fallback = buildFallbackAnswer(question, retrievedChunks, language);
    onToken(fallback);
    return fallback;
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model: getModel(),
        messages: buildMessages(question, retrievedChunks, language, history),
        temperature: 0.2,
        max_tokens: 800,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[llm-stream] Groq API notice (${response.status}): ${errText}. Using retrieved context fallback.`);
      const fallback = buildFallbackAnswer(question, retrievedChunks, language);
      onToken(fallback);
      return fallback;
    }

    // Groq streams Server-Sent Events: lines of "data: {json}" ending with "data: [DONE]".
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    for await (const value of response.body) {
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep the (possibly incomplete) last line in the buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;

        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content || '';
          if (delta) {
            full += delta;
            onToken(delta);
          }
        } catch {
          // Ignore malformed partial JSON lines
        }
      }
    }

    return full;
  } catch (err) {
    console.warn(`[llm-stream] Groq stream failed: ${err.message}. Using retrieved context fallback.`);
    const fallback = buildFallbackAnswer(question, retrievedChunks, language);
    onToken(fallback);
    return fallback;
  }
}
