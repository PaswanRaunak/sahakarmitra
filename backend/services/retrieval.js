// ─────────────────────────────────────────────
// Retrieval service — vector search over legal knowledge base.
//
// Supports:
//   1. ChromaDB (when running at CHROMA_URL)
//   2. Built-in local in-memory vector index (zero external dependencies,
//      falls back seamlessly if ChromaDB is not running)
// ─────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChromaClient } from 'chromadb';
import { generateEmbedding, generateEmbeddings } from './embeddings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const cacheFilePath = path.join(dataDir, '.embeddings_cache.json');

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const COLLECTION_NAME = 'sahakarmitra_laws';

const client = new ChromaClient({ path: CHROMA_URL });
let chromaCollection = null;
let chromaAvailable = null; // null = untried, true/false = cached status

// In-memory local vector store fallback
let localStore = null;

function chunkText(text, targetWords = 250) {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let current = '';
  let currentWordCount = 0;

  for (const para of paragraphs) {
    const words = para.split(/\s+/).length;
    if (currentWordCount + words > targetWords && current.length > 0) {
      chunks.push(current.trim());
      current = para;
      currentWordCount = words;
    } else {
      current += (current ? '\n\n' : '') + para;
      currentWordCount += words;
    }
  }
  if (current.trim().length > 0) chunks.push(current.trim());
  return chunks;
}

function extractSectionTitle(chunk) {
  const firstLine = chunk.split('\n').find(l => l.trim().length > 0);
  if (!firstLine) return 'Untitled';
  return firstLine.trim().slice(0, 120);
}

// Dot product between two L2-normalized vectors = cosine similarity
function cosineDistance(vecA, vecB) {
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  // Clamp between -1 and 1 for numerical precision
  const sim = Math.max(-1, Math.min(1, dot));
  return 1 - sim;
}

async function initLocalStore() {
  if (localStore) return localStore;

  console.log('[retrieval] Initializing local in-memory vector store from data directory...');

  if (!fs.existsSync(dataDir)) {
    console.warn(`[retrieval] Data directory not found: ${dataDir}`);
    localStore = [];
    return localStore;
  }

  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.txt'));
  const allChunks = [];

  for (const file of files) {
    const text = fs.readFileSync(path.join(dataDir, file), 'utf-8');
    const chunks = chunkText(text);
    for (let i = 0; i < chunks.length; i++) {
      allChunks.push({
        id: `${file}::${i}`,
        text: chunks[i],
        metadata: {
          source_file: file,
          section_title: extractSectionTitle(chunks[i]),
          chunk_text: chunks[i],
        },
      });
    }
  }

  if (allChunks.length === 0) {
    console.warn('[retrieval] No text documents found in data directory.');
    localStore = [];
    return localStore;
  }

  // Check if we have a valid disk cache for embeddings
  let cachedData = null;
  if (fs.existsSync(cacheFilePath)) {
    try {
      cachedData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
    } catch {
      cachedData = null;
    }
  }

  // If cache matches the chunk ids, reuse embeddings
  const canUseCache = cachedData &&
    Array.isArray(cachedData) &&
    cachedData.length === allChunks.length &&
    cachedData.every((item, i) => item.id === allChunks[i].id && item.embedding?.length === 384);

  if (canUseCache) {
    console.log(`[retrieval] Loaded ${cachedData.length} cached embeddings for local store.`);
    localStore = cachedData;
    return localStore;
  }

  console.log(`[retrieval] Generating embeddings for ${allChunks.length} chunks...`);
  const texts = allChunks.map(c => c.text);
  const embeddings = await generateEmbeddings(texts);

  localStore = allChunks.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i],
  }));

  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify(localStore), 'utf-8');
    console.log('[retrieval] Embeddings cache saved to disk.');
  } catch (err) {
    console.warn('[retrieval] Could not save embeddings cache:', err.message);
  }

  console.log(`[retrieval] Local vector store ready with ${localStore.length} chunks.`);
  return localStore;
}

async function getChromaCollection() {
  if (chromaAvailable === false) return null;
  if (chromaCollection) return chromaCollection;

  try {
    chromaCollection = await client.getCollection({ name: COLLECTION_NAME });
    chromaAvailable = true;
    return chromaCollection;
  } catch (err) {
    chromaAvailable = false;
    console.log(`[retrieval] ChromaDB not reachable (${err.message}) — using built-in local vector search.`);
    return null;
  }
}

/**
 * Retrieve the top-K most relevant law chunks for the query.
 * Returns an array of { text, metadata, distance }.
 */
export async function retrieveRelevantChunks(query, topK = 3) {
  const queryEmbedding = await generateEmbedding(query);

  // 1. Try ChromaDB first
  try {
    const col = await getChromaCollection();
    if (col) {
      const results = await col.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
      });

      const docs = results.documents?.[0] ?? [];
      const metas = results.metadatas?.[0] ?? [];
      const distances = results.distances?.[0] ?? [];

      if (docs.length > 0) {
        return docs.map((text, i) => ({
          text,
          metadata: metas[i] ?? {},
          distance: distances[i] ?? null,
        }));
      }
    }
  } catch (chromaErr) {
    console.warn('[retrieval] ChromaDB query failed, falling back to local store:', chromaErr.message);
  }

  // 2. Fallback to local in-memory vector store
  const store = await initLocalStore();
  if (!store || store.length === 0) return [];

  const scored = store.map(item => ({
    text: item.text,
    metadata: item.metadata,
    distance: cosineDistance(queryEmbedding, item.embedding),
  }));

  scored.sort((a, b) => a.distance - b.distance);

  return scored.slice(0, topK);
}
