// ─────────────────────────────────────────────
// Parent-Child chunking for legal text.
//
// Shared by scripts/ingest.js and services/retrieval.js so the ChromaDB
// index and the local in-memory fallback are always chunked identically.
//
//   PARENT chunks  → whole legal sections ("Section 24: Rights and
//                    privileges of members" + its complete text). These
//                    keep contextual integrity and are what gets passed
//                    to the LLM and cited to the user.
//   CHILD chunks   → ~100-token dense sub-clauses split on sentence
//                    boundaries (never mid-sentence). These carry the
//                    embeddings and are what vector search matches on.
// ─────────────────────────────────────────────

// A section heading looks like "Section 24: Rights and privileges of
// members", "Section 73B: Right to contest elections", "Rule 5: ...".
const SECTION_HEADING_RE = /^(?:Section|Rule|Chapter|Article)\s+\d+[A-Z]?\s*[:.]\s*/;

// Rough token estimate; ~4 characters per token for English legal prose.
export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Split a legal document into sections at section headings.
 * Text before the first heading (the document title / preamble) becomes
 * its own section, titled after the document's first non-empty line.
 * Returns [{ title, text }] in document order.
 */
export function splitIntoSections(text) {
  const lines = text.split('\n');
  const sections = [];
  let current = null;

  for (const line of lines) {
    if (SECTION_HEADING_RE.test(line.trim())) {
      if (current) sections.push(current);
      current = { title: line.trim(), text: '' };
    } else if (current) {
      current.text += line + '\n';
    } else {
      // Preamble, starts with the document title line
      current = { title: '', text: line + '\n' };
    }
  }
  if (current) sections.push(current);

  return sections
    .map((s) => {
      const body = s.text.replace(/\n+$/, '').trim();
      // For the preamble, the title is its first non-empty line
      const title = s.title || body.split('\n').find((l) => l.trim())?.trim() || 'Untitled';
      return { title: title.slice(0, 200), text: body };
    })
    .filter((s) => s.text.length > 0);
}

/**
 * Sentence-boundary-aware splitter for legal prose.
 * Breaks on newlines (which separate sub-clauses like "(a) ...") and
 * after sentence-ending punctuation (.!?;) when followed by a new
 * sentence starting with an uppercase letter or a sub-clause marker.
 * Never cuts mid-sentence.
 */
export function splitSentences(text) {
  const sentences = [];
  for (const line of text.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/(?<=[.!?;])\s+(?=[A-Z(])/);
    for (const part of parts) {
      const s = part.trim();
      if (s) sentences.push(s);
    }
  }
  return sentences;
}

/**
 * Infer state and statutory Act name from file name and document header.
 */
export function inferDocumentMetadata(text = '', sourceFile = '') {
  const fileLower = String(sourceFile).toLowerCase();
  const firstLine = (text.split('\n')[0] || '').toLowerCase();

  if (fileLower.includes('gujarat') || firstLine.includes('gujarat')) {
    return {
      state: 'Gujarat',
      act_name: 'Gujarat Co-operative Societies Act, 1961',
    };
  }
  if (fileLower.includes('karnataka') || firstLine.includes('karnataka')) {
    return {
      state: 'Karnataka',
      act_name: 'Karnataka Co-operative Societies Act, 1959',
    };
  }
  if (fileLower.includes('multistate') || fileLower.includes('multi-state') || firstLine.includes('multi-state')) {
    return {
      state: 'Multi-State',
      act_name: 'Multi-State Co-operative Societies Act, 2002',
    };
  }
  // Default is Maharashtra
  return {
    state: 'Maharashtra',
    act_name: 'Maharashtra Cooperative Societies Act, 1960',
  };
}

/**
 * Build parent and child chunks for one legal document.
 *
 * @param {string} text       Full document text
 * @param {string} sourceFile File name, used as the id namespace
 * @param {object} opts
 * @param {number} opts.childTokenTarget  Target size of each child's body (~100 tokens)
 * @returns {{ parents: Array<{parent_id, source_file, section_title, act_name, state, text}>,
 *              children: Array<{child_id, parent_id, text, state, act_name}> }}
 *
 * child.text is the section BODY only (no heading). The heading is still
 * baked into the embedding, generateChildEmbeddings() blends a
 * title-prefixed embedding with the body embedding, so queries phrased
 * after the heading ("what are the effects of registration?") match
 * Section 10 without heading keywords crowding out body-phrased queries
 * ("can I inspect the registers, books and accounts…").
 */
export function buildParentChildChunks(text, sourceFile, { childTokenTarget = 100 } = {}) {
  const parents = [];
  const children = [];
  const { state, act_name } = inferDocumentMetadata(text, sourceFile);

  const sections = splitIntoSections(text);
  sections.forEach((section, sIdx) => {
    const parent = {
      parent_id: `${sourceFile}::p${sIdx}`,
      source_file: sourceFile,
      section_title: section.title,
      act_name,
      state,
      text: `${section.title}\n${section.text}`,
    };
    parents.push(parent);

    // Fragment the section body into dense sentence-accurate children
    const sentences = splitSentences(section.text);
    let childText = '';
    let childIdx = 0;

    const flush = () => {
      if (childText.trim()) {
        children.push({
          child_id: `${parent.parent_id}::c${childIdx++}`,
          parent_id: parent.parent_id,
          state,
          act_name,
          text: childText.trim(),
        });
      }
      childText = '';
    };

    for (const sentence of sentences) {
      const candidate = childText ? `${childText} ${sentence}` : sentence;
      if (childText && estimateTokens(candidate) > childTokenTarget) {
        flush();
        childText = sentence;
      } else {
        childText = candidate;
      }
    }
    flush();
  });

  return { parents, children };
}
