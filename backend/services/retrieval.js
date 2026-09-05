// ─────────────────────────────────────────────
// Retrieval service, parent-child vector search over the legal
// knowledge base.
//
// Search runs against CHILD chunks (~100-token sub-clauses, precise
// matching against the user's intent). Each matched child is then
// resolved to its PARENT section via parent_id, deduplicated, and the
// FULL parent text is returned, so the LLM always receives complete
// legal context and citations reference the whole section.
//
// Supports:
//   1. ChromaDB (when running at CHROMA_URL), children live in the
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
// short TTL instead of latching failure forever, the active collection can
// change under us at any moment via the blue-green swap.
const CHROMA_RETRY_TTL_MS = 30_000;
let chromaDownUntil = 0;

// In-memory local vector store fallback
let localStore = null;
let localParentMap = null; // parent_id → parent record (local mode)

// parents lookup cache, invalidated when the resolved file (or its mtime) changes
let parentFileCache = null; // { path, mtimeMs, map }

async function loadParentFileStore() {
  // The parent store belongs to the ACTIVE collection, resolved per call
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
    return null; // parent store unreadable, caller degrades gracefully
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
    act_name: p.act_name || 'Maharashtra Cooperative Societies Act, 1960',
    state: p.state || 'Maharashtra',
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
          act_name:      parent?.act_name || 'Maharashtra Cooperative Societies Act, 1960',
          state:         parent?.state || 'Maharashtra',
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
 * Resolve the ACTIVE ChromaDB collection, on every call. The pointer is
 * read from data/active-collection.json (mtime-cached).
 */
async function getChromaCollection() {
  if (Date.now() < chromaDownUntil) return null;

  try {
    const name = getActiveCollectionName();
    return await client.getCollection({ name });
  } catch (err) {
    chromaDownUntil = Date.now() + CHROMA_RETRY_TTL_MS;
    console.log(`[retrieval] ChromaDB not reachable or active collection missing (${err.message}), using built-in local vector search (retrying in ${CHROMA_RETRY_TTL_MS / 1000}s).`);
    return null;
  }
}

/**
 * Resolve matched child chunks to their PARENT sections.
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
          act_name:      parent.act_name || match.metadata?.act_name || 'Maharashtra Cooperative Societies Act, 1960',
          state:         parent.state || match.metadata?.state || 'Maharashtra',
          parent_id:     parentId,
          chunk_type:    'parent',
        },
        distance: match.distance,
      });
    } else {
      console.warn(`[retrieval] Parent "${parentId}" not found in parent store, returning child fragment.`);
      results.push(match);
    }
  }

  return results;
}

/**
 * Perform raw vector query either on Chroma or Local Store.
 */
async function queryVectorStore(queryEmbedding, nChildren, stateFilter = null) {
  let childMatches = [];

  // Try ChromaDB
  try {
    const col = await getChromaCollection();
    if (col) {
      let whereClause = undefined;
      if (stateFilter && Array.isArray(stateFilter) && stateFilter.length > 0) {
        whereClause = stateFilter.length === 1
          ? { state: stateFilter[0] }
          : { state: { "$in": stateFilter } };
      }

      const results = await col.query({
        queryEmbeddings: [queryEmbedding],
        nResults: nChildren,
        ...(whereClause ? { where: whereClause } : {}),
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

  // Fallback to local in-memory store
  if (childMatches.length === 0) {
    const store = await initLocalStore();
    if (!store || store.length === 0) return [];

    let candidates = store;
    if (stateFilter && Array.isArray(stateFilter) && stateFilter.length > 0) {
      candidates = store.filter(item => {
        const itemState = item.metadata?.state || 'Maharashtra';
        return stateFilter.includes(itemState);
      });
    }

    childMatches = candidates
      .map(item => ({
        text: item.text,
        metadata: item.metadata,
        distance: cosineDistance(queryEmbedding, item.embedding),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, nChildren);
  }

  return childMatches;
}

/**
 * Retrieve the top-K most relevant law PARENT sections for the query.
 * Filters by user's selected state + Multi-State Act.
 * Falls back to cross-state search if no relevant match is found in the selected state.
 *
 * @param {string} query
 * @param {number} topK
 * @param {object} [options]
 * @param {string} [options.state] 'Maharashtra' | 'Gujarat' | 'Karnataka' | 'Multi-State' | 'All'
 */
export async function retrieveRelevantChunks(query, topK = 3, options = {}) {
  const requestedState = options.state || 'Maharashtra';
  const queryEmbedding = await generateEmbedding(query);
  const nChildren = Math.min(topK * 3, 12);
  const maxDistanceCutoff = parseFloat(process.env.RELEVANCE_MAX_DISTANCE || '1.5');

  // 1. Primary Search: Filtered to requested state + Multi-State
  let allowedStates = null;
  if (requestedState && requestedState !== 'All') {
    allowedStates = requestedState === 'Multi-State'
      ? ['Multi-State']
      : [requestedState, 'Multi-State'];
  }

  let childMatches = await queryVectorStore(queryEmbedding, nChildren, allowedStates);
  let parents = await resolveParents(childMatches);

  // Check if primary results have a good match within distance cutoff
  const hasGoodMatch = parents.some(p => p.distance == null || p.distance <= maxDistanceCutoff);

  // 2. Cross-State Fallback: If no good match within selected state, search other states
  if ((!hasGoodMatch || parents.length === 0) && requestedState !== 'All') {
    console.log(`[retrieval] No strong match in state "${requestedState}", executing cross-state search...`);
    const fallbackChildren = await queryVectorStore(queryEmbedding, nChildren, null);
    const fallbackParents = await resolveParents(fallbackChildren);

    const validFallback = fallbackParents.filter(p => p.distance == null || p.distance <= maxDistanceCutoff);
    if (validFallback.length > 0) {
      // Mark as cross-state match
      const crossStateResults = validFallback.slice(0, topK).map(p => ({
        ...p,
        isCrossState: true,
        requestedState,
        matchedState: p.metadata?.state || 'Another State',
      }));
      return crossStateResults;
    }
  }

  return parents.slice(0, topK);
}

function determineCategory(sourceFile = '', sectionTitle = '', fullText = '') {
  const file = String(sourceFile).toLowerCase();
  const title = String(sectionTitle).toLowerCase();
  const text = String(fullText).toLowerCase();

  if (file.includes('election') || title.includes('election') || text.includes('election of')) {
    return 'Elections';
  }
  if (title.includes('agm') || title.includes('annual general meeting') || text.includes('annual general meeting') || title.includes('section 81a') || title.includes('section 77') || title.includes('section 27')) {
    return 'AGM';
  }
  if (file.includes('audit') || title.includes('audit') || text.includes('auditor') || title.includes('section 84') || title.includes('section 63') || title.includes('section 70')) {
    return 'Auditing';
  }
  if (file.includes('registration') || title.includes('registration') || title.includes('section 4') || title.includes('section 5') || title.includes('section 6') || title.includes('section 7') || title.includes('section 9')) {
    return 'Registration';
  }
  if (file.includes('member') || title.includes('member') || title.includes('rights') || title.includes('privilege') || title.includes('section 22') || title.includes('section 24') || title.includes('section 25') || title.includes('section 28') || title.includes('section 29') || title.includes('section 36')) {
    return 'Member Rights';
  }
  if (file.includes('dispute') || file.includes('winding') || title.includes('dispute') || title.includes('appeal') || title.includes('winding') || title.includes('section 96') || title.includes('section 107') || title.includes('section 72') || title.includes('section 84') || title.includes('section 86')) {
    return 'Disputes';
  }
  return 'Registration';
}

function parentsToDocuments(parents) {
  return [...parents].map(p => ({
    id: p.parent_id,
    section_title: p.section_title,
    act_name: p.act_name || 'Maharashtra Cooperative Societies Act, 1960',
    state: p.state || 'Maharashtra',
    full_text: p.text,
    category: determineCategory(p.source_file, p.section_title, p.text),
    source_file: p.source_file,
  }));
}

/**
 * Retrieve ALL parent sections currently in the knowledge base.
 * @param {object} [options]
 * @param {string} [options.state] 'all' or specific state name
 */
export async function getAllDocumentChunks(options = {}) {
  let allDocs = [];

  // 1. ChromaDB mode
  try {
    const col = await getChromaCollection();
    if (col) {
      const parentStore = await loadParentFileStore();
      if (parentStore && parentStore.size > 0) {
        allDocs = parentsToDocuments(parentStore.values());
      } else {
        const getRes = await col.get({ include: ['documents', 'metadatas'] });
        if (getRes && getRes.ids && getRes.ids.length > 0) {
          allDocs = getRes.ids.map((id, i) => {
            const doc = getRes.documents?.[i] || '';
            const meta = getRes.metadatas?.[i] || {};
            const text = doc || meta.chunk_text || '';
            const sectionTitle = meta.section_title || 'Untitled';
            const sourceFile = meta.source_file || id.split('::')[0] || '';
            const state = meta.state || 'Maharashtra';
            const actName = meta.act_name || 'Maharashtra Cooperative Societies Act, 1960';
            return {
              id,
              section_title: sectionTitle,
              act_name: actName,
              state,
              full_text: text,
              category: determineCategory(sourceFile, sectionTitle, text),
              source_file: sourceFile,
            };
          });
        }
      }
    }
  } catch (err) {
    console.warn('[retrieval] ChromaDB get failed, falling back to local vector store:', err.message);
  }

  // 2. Local mode fallback
  if (allDocs.length === 0) {
    await initLocalStore();
    if (localParentMap && localParentMap.size > 0) {
      allDocs = parentsToDocuments(localParentMap.values());
    }
  }

  if (options.state && options.state.toLowerCase() !== 'all') {
    return allDocs.filter(d => (d.state || 'Maharashtra').toLowerCase() === options.state.toLowerCase());
  }

  return allDocs;
}
