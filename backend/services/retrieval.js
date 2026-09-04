// ─────────────────────────────────────────────
// Retrieval service — parent-child vector search over the legal
// knowledge base.
//
// Search runs against CHILD chunks (~100-token sub-clauses, precise
// matching against the user's intent). Each matched child is then
// resolved to its PARENT section via parent_id, deduplicated, and the
// FULL parent text is returned — so the LLM always receives complete
// legal context and citations reference the whole section.
//
// Supports:
//   1. ChromaDB (when running at CHROMA_URL) — children live in the
//      ACTIVE collection (services/vectorStore.js reads
//      data/active-collection.json per request, enabling zero-downtime
//      blue-green swaps), parents in data/parents-{collection}.json
//      (written by scripts/ingest.js)
//   2. Built-in local in-memory vector index (zero external
//      dependencies, falls back seamlessly if ChromaDB is not running)
// ─────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChromaClient } from 'chromadb';
import { generateEmbedding, generateChildEmbeddings } from './embeddings.js';
import { buildParentChildChunks } from './chunking.js';
import { getActiveCollectionName, findParentStorePath, listCorpusFiles } from './vectorStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const cacheFilePath = path.join(dataDir, '.embeddings_cache.json');

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';

// Identifies how child-chunk embeddings were produced; changing the recipe
// must invalidate the on-disk cache, whose entries would otherwise look
// valid (ids + texts match) while carrying vectors from the old recipe.
const CHILD_EMBEDDING_RECIPE = 'hybrid-body-heading-50';

const client = new ChromaClient({ path: CHROMA_URL });
// When Chroma (or the active collection) is unreachable we back off for a
// short TTL instead of latching failure forever — the active collection can
// change under us at any moment via the blue-green swap.
const CHROMA_RETRY_TTL_MS = 30_000;
let chromaDownUntil = 0;

// In-memory local vector store fallback
let localStore = null;
let localParentMap = null; // parent_id → parent record (local mode)

// parents lookup cache, invalidated when the resolved file (or its mtime) changes
let parentFileCache = null; // { path, mtimeMs, map }

async function loadParentFileStore() {
  // The parent store belongs to the ACTIVE collection — resolved per call
  // so a blue-green swap repoints both the collection and its parents at once.
  const storePath = findParentStorePath(getActiveCollectionName());
  if (!storePath) return null;
  try {
    const mtimeMs = fs.statSync(storePath).mtimeMs;
    if (parentFileCache && parentFileCache.path === storePath && parentFileCache.mtimeMs === mtimeMs) {
      return parentFileCache.map;
    }
    const raw = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    const map = new Map(Object.entries(raw));
    parentFileCache = { path: storePath, mtimeMs, map };
    return map;
  } catch {
    return null; // parent store unreadable — caller degrades gracefully
  }
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

// ── Parent store (full sections, no embeddings) ────────────────

function parentRecord(p) {
  return {
    parent_id: p.parent_id,
    source_file: p.source_file,
    section_title: p.section_title,
    text: p.text,
  };
}

async function initLocalStore() {
  if (localStore) return localStore;

  console.log('[retrieval] Initializing local in-memory vector store from data directory...');

  if (!fs.existsSync(dataDir)) {
    console.warn(`[retrieval] Data directory not found: ${dataDir}`);
    localStore = [];
    localParentMap = new Map();
    return localStore;
  }

  const corpus = listCorpusFiles();
  const allChunks = [];
  const parentMap = new Map();

  for (const { file, path: filePath } of corpus) {
    const text = fs.readFileSync(filePath, 'utf-8');
    const { parents, children } = buildParentChildChunks(text, file);

    for (const p of parents) parentMap.set(p.parent_id, parentRecord(p));

    for (const c of children) {
      const parent = parentMap.get(c.parent_id);
      allChunks.push({
        id: c.child_id,
        text: c.text,
        metadata: {
          source_file:   file,
          section_title: parent?.section_title || 'Untitled',
          parent_id:     c.parent_id,
          chunk_type:    'child',
          chunk_text:    c.text,
        },
      });
    }
  }
  localParentMap = parentMap;

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

  // Cache is reusable only when ids, texts AND the embedding recipe all
  // match — chunk ids stay stable across strategy changes, so without the
  // recipe check stale vectors would be reused silently.
  const canUseCache = cachedData &&
    Array.isArray(cachedData) &&
    cachedData.length === allChunks.length &&
    cachedData.every((item, i) =>
      item.id === allChunks[i].id &&
      item.text === allChunks[i].text &&
      item.recipe === CHILD_EMBEDDING_RECIPE &&
      item.embedding?.length === 384);

  if (canUseCache) {
    console.log(`[retrieval] Loaded ${cachedData.length} cached embeddings for local store.`);
    localStore = cachedData;
    return localStore;
  }

  console.log(`[retrieval] Generating hybrid embeddings for ${allChunks.length} child chunks...`);
  // Same recipe as scripts/ingest.js: body ⊕ section-heading (50/50).
  const localChildren = allChunks.map(c => ({ text: c.metadata.chunk_text, section_title: c.metadata.section_title }));
  const embeddings = await generateChildEmbeddings(
    localChildren.map(c => c.text),
    localChildren.map(c => `${c.section_title}\n${c.text}`)
  );

  localStore = allChunks.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i],
    recipe: CHILD_EMBEDDING_RECIPE,
  }));

  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify(localStore), 'utf-8');
    console.log('[retrieval] Embeddings cache saved to disk.');
  } catch (err) {
    console.warn('[retrieval] Could not save embeddings cache:', err.message);
  }

  console.log(`[retrieval] Local vector store ready with ${localStore.length} child chunks across ${parentMap.size} parent sections.`);
  return localStore;
}

/**
 * Resolve the ACTIVE ChromaDB collection — on every call. The pointer is
 * read from data/active-collection.json (mtime-cached), which is exactly
 * what makes the blue-green swap live without a server restart. A missing
 * collection or down server backs off for CHROMA_RETRY_TTL_MS, then the
 * next request retries automatically.
 */
async function getChromaCollection() {
  if (Date.now() < chromaDownUntil) return null;

  try {
    const name = getActiveCollectionName();
    return await client.getCollection({ name });
  } catch (err) {
    chromaDownUntil = Date.now() + CHROMA_RETRY_TTL_MS;
    console.log(`[retrieval] ChromaDB not reachable or active collection missing (${err.message}) — using built-in local vector search (retrying in ${CHROMA_RETRY_TTL_MS / 1000}s).`);
    return null;
  }
}

/**
 * Resolve matched child chunks to their PARENT sections.
 *   - Looks up parent records via parent_id (in-memory map in local
 *     mode, parents.json in Chroma mode).
 *   - Deduplicates: multiple matched children sharing a parent yield
 *     that parent once, ranked by its best-matching child's distance.
 *   - Children with no resolvable parent (e.g. a legacy index without
 *     parent metadata) pass through unchanged so retrieval never breaks.
 */
async function resolveParents(childMatches) {
  const parentSource = localParentMap && localParentMap.size > 0
    ? localParentMap
    : await loadParentFileStore();

  const results = [];
  const seenParents = new Set();

  for (const match of childMatches) {
    const parentId = match.metadata?.parent_id;

    if (!parentId) {
      results.push(match);
      continue;
    }
    if (seenParents.has(parentId)) continue;
    seenParents.add(parentId);

    const parent = parentSource?.get?.(parentId);
    if (parent) {
      results.push({
        text: parent.text,
        metadata: {
          source_file:   parent.source_file,
          section_title: parent.section_title,
          parent_id:     parentId,
          chunk_type:    'parent',
        },
        distance: match.distance,
      });
    } else {
      // Parent record missing — degrade to the child fragment
      console.warn(`[retrieval] Parent "${parentId}" not found in parent store — returning child fragment.`);
      results.push(match);
    }
  }

  return results;
}

/**
 * Retrieve the top-K most relevant law PARENT sections for the query.
 *
 * Vector search matches against child chunks (fetching extra children
 * so that parent deduplication still leaves enough distinct sections),
 * then returns up to topK full parent sections as
 * { text, metadata, distance }, ranked by best matching child.
 */
export async function retrieveRelevantChunks(query, topK = 3) {
  const queryEmbedding = await generateEmbedding(query);
  const nChildren = Math.min(topK * 3, 12);
  let childMatches = [];

  // 1. Try ChromaDB first
  try {
    const col = await getChromaCollection();
    if (col) {
      const results = await col.query({
        queryEmbeddings: [queryEmbedding],
        nResults: nChildren,
      });

      const docs      = results.documents?.[0] ?? [];
      const metas     = results.metadatas?.[0] ?? [];
      const distances = results.distances?.[0] ?? [];

      childMatches = docs.map((text, i) => ({
        text,
        metadata: metas[i] ?? {},
        distance: distances[i] ?? null,
      }));
    }
  } catch (chromaErr) {
    console.warn('[retrieval] ChromaDB query failed, falling back to local store:', chromaErr.message);
  }

  // 2. Fallback to local in-memory vector store
  if (childMatches.length === 0) {
    const store = await initLocalStore();
    if (!store || store.length === 0) return [];

    childMatches = store
      .map(item => ({
        text: item.text,
        metadata: item.metadata,
        distance: cosineDistance(queryEmbedding, item.embedding),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, nChildren);
  }

  const parents = await resolveParents(childMatches);
  return parents.slice(0, topK);
}

function determineCategory(sourceFile = '', sectionTitle = '', fullText = '') {
  const file = String(sourceFile).toLowerCase();
  const title = String(sectionTitle).toLowerCase();
  const text = String(fullText).toLowerCase();

  if (file.includes('election') || title.includes('election')) {
    return 'Elections';
  }
  if (title.includes('agm') || title.includes('annual general meeting') || text.includes('annual general meeting') || title.includes('section 81a') || text.includes('section 81a')) {
    return 'AGM';
  }
  if (file.includes('audit') || title.includes('audit') || text.includes('auditor')) {
    return 'Auditing';
  }
  if (file.includes('registration') || title.includes('registration') || title.includes('section 5') || title.includes('section 6')) {
    return 'Registration';
  }
  if (file.includes('member_rights') || title.includes('member') || title.includes('rights') || title.includes('privilege') || title.includes('section 24')) {
    return 'Member Rights';
  }
  if (file.includes('dispute') || file.includes('winding') || title.includes('dispute') || title.includes('appeal') || title.includes('winding')) {
    return 'Disputes';
  }
  return 'Registration';
}

function parentsToDocuments(parents, actName) {
  return [...parents].map(p => ({
    id: p.parent_id,
    section_title: p.section_title,
    act_name: actName,
    full_text: p.text,
    category: determineCategory(p.source_file, p.section_title, p.text),
    source_file: p.source_file,
  }));
}

/**
 * Retrieve ALL parent sections currently in the knowledge base
 * (parents are the full legal sections — what the /library endpoint
 * displays — not the small searchable child fragments).
 * Reads the parent store written by ingest; falls back to the local
 * in-memory store when ChromaDB is not running.
 * Returns array of { id, section_title, act_name, full_text, category, source_file }.
 */
export async function getAllDocumentChunks() {
  const actName = 'Maharashtra Cooperative Societies Act, 1960';

  // 1. ChromaDB mode — parents come from the ingest-written parent store
  try {
    const col = await getChromaCollection();
    if (col) {
      const parentStore = await loadParentFileStore();
      if (parentStore && parentStore.size > 0) {
        return parentsToDocuments(parentStore.values(), actName);
      }

      // Legacy index (no parent store): return whatever Chroma has
      console.warn('[retrieval] Parent store missing — listing legacy chunks from ChromaDB. Re-run "npm run ingest".');
      const getRes = await col.get({ include: ['documents', 'metadatas'] });
      if (getRes && getRes.ids && getRes.ids.length > 0) {
        return getRes.ids.map((id, i) => {
          const doc = getRes.documents?.[i] || '';
          const meta = getRes.metadatas?.[i] || {};
          const text = doc || meta.chunk_text || '';
          const sectionTitle = meta.section_title || 'Untitled';
          const sourceFile = meta.source_file || id.split('::')[0] || '';
          return {
            id,
            section_title: sectionTitle,
            act_name: actName,
            full_text: text,
            category: determineCategory(sourceFile, sectionTitle, text),
            source_file: sourceFile,
          };
        });
      }
      return [];
    }
  } catch (err) {
    console.warn('[retrieval] ChromaDB get failed, falling back to local vector store:', err.message);
  }

  // 2. Local mode — build parents in memory from the same chunking
  await initLocalStore();
  if (!localParentMap || localParentMap.size === 0) return [];
  return parentsToDocuments(localParentMap.values(), actName);
}
