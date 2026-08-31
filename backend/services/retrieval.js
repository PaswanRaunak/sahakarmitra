// ─────────────────────────────────────────────
// Retrieval service — vector search over ChromaDB.
//
// Given a user question, we:
//   1. embed the question with the same model used at ingest time
//   2. query ChromaDB for the top-K most similar law chunks
//   3. return them with metadata (source file, section title, text)
// ─────────────────────────────────────────────

import { ChromaClient } from 'chromadb';
import { generateEmbedding } from './embeddings.js';

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const COLLECTION_NAME = 'sahakarmitra_laws';

const client = new ChromaClient({ path: CHROMA_URL });
let collection = null;

async function getCollection() {
  if (!collection) {
    // Collection must already exist (created by ingest.js). If you see
    // "collection not found", run: npm run ingest
    collection = await client.getCollection({ name: COLLECTION_NAME });
  }
  return collection;
}

/**
 * Retrieve the top-K most relevant law chunks for the query.
 * Returns an array of { text, metadata, distance }.
 */
export async function retrieveRelevantChunks(query, topK = 3) {
  const col = await getCollection();
  const queryEmbedding = await generateEmbedding(query);

  const results = await col.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
  });

  // ChromaDB's response shape:
  //   {
  //     ids:        [[id1, id2, id3]],
  //     documents:  [[text1, text2, text3]],
  //     metadatas:  [[meta1, meta2, meta3]],
  //     distances:  [[d1, d2, d3]]
  //   }
  // (Each field is an array-of-arrays because queryEmbeddings accepts batches.)
  const docs      = results.documents?.[0]   ?? [];
  const metas     = results.metadatas?.[0]    ?? [];
  const distances = results.distances?.[0]    ?? [];

  if (docs.length === 0) return [];

  return docs.map((text, i) => ({
    text,
    metadata: metas[i] ?? {},
    distance: distances[i] ?? null,
  }));
}
