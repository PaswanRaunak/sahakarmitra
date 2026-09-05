// ─────────────────────────────────────────────
// Embeddings service, turns text into 384-dim vectors
// using the all-MiniLM-L6-v2 model (sentence-transformers)
// running fully locally via @xenova/transformers.
//
// The model is downloaded ONCE on first use (≈ 90 MB) and
// cached in your HuggingFace cache dir for subsequent runs.
// ─────────────────────────────────────────────

import { pipeline } from '@xenova/transformers';

let embedder = null;

/**
 * Lazily load the feature-extraction pipeline.
 * This is heavy on first call (~5s), so we cache it in-process.
 */
async function getEmbedder() {
  if (!embedder) {
    console.log('Loading embedding model: Xenova/all-MiniLM-L6-v2 ...');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('Embedding model ready.');
  }
  return embedder;
}

/**
 * Embed a single text string → 384-dim float array (L2-normalized).
 */
export async function generateEmbedding(text) {
  const extractor = await getEmbedder();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/**
 * Embed a batch of text strings in one call (much faster than looping).
 * Returns an array of 384-dim arrays, one per input text.
 */
export async function generateEmbeddings(texts) {
  const extractor = await getEmbedder();
  const output = await extractor(texts, { pooling: 'mean', normalize: true });

  // @xenova/transformers returns a flat Float32Array even for batches.
  // all-MiniLM-L6-v2 produces 384-dim vectors, so we slice it back into rows.
  const dim = 384;
  const result = [];
  for (let i = 0; i < texts.length; i++) {
    result.push(Array.from(output.data.slice(i * dim, (i + 1) * dim)));
  }
  return result;
}

/**
 * Hybrid child-chunk embedding for the parent-child pipeline.
 *
 * Blends each text's own embedding with the embedding of its
 * context-prefixed variant (section heading + body), 50/50, then
 * re-normalizes. Heading-phrased queries ("what are the effects of
 * registration?") match via the context component, while body-phrased
 * queries ("can I inspect the registers, books and accounts…") still
 * match the sub-clause text itself, pure concatenation breaks the
 * latter when a heading shares keywords with the query.
 *
 * @param {string[]} texts            Child chunk bodies
 * @param {string[]} contextPrefixed  Same texts, each prefixed with its parent heading
 * @returns {number[][]} Array of 384-dim normalized vectors
 */
export async function generateChildEmbeddings(texts, contextPrefixed) {
  if (texts.length !== contextPrefixed.length) {
    throw new Error('generateChildEmbeddings: texts and contextPrefixed must have equal length');
  }
  const bodyEmb = await generateEmbeddings(texts);
  const ctxEmb = await generateEmbeddings(contextPrefixed);
  return bodyEmb.map((a, i) => {
    const blended = a.map((x, j) => 0.5 * x + 0.5 * ctxEmb[i][j]);
    const norm = Math.hypot(...blended) || 1;
    return blended.map((x) => x / norm);
  });
}
