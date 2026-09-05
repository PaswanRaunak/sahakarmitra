// ─────────────────────────────────────────────
// Vector store registry, the blue-green "swap" primitive.
//
// The ACTIVE ChromaDB collection is whatever data/active-collection.json
// says: { "active": "legal_docs_v1" }. Retrieval resolves the collection
// through getActiveCollectionName() on EVERY request (mtime-cached file
// read, never latched at server startup), so rewriting this one file,
// e.g. by scripts/reindex.js after a validated build, instantly
// redirects all traffic to the new collection with zero downtime.
//
// The parent store (full legal sections) is derived from the SAME
// pointer, data/parents-{collection}.json, so the collection and its
// parent store always swap together as one atomic unit.
// ─────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

export const ACTIVE_COLLECTION_FILE = path.join(dataDir, 'active-collection.json');
export const DEFAULT_COLLECTION = 'sahakarmitra_laws'; // pre-blue-green collection name

// mtime cache: re-read the pointer file only when it changes on disk
let activeCache = { mtimeMs: -1, value: null };

/**
 * Name of the currently live collection. Falls back to DEFAULT_COLLECTION
 * (with a one-time warning) when the pointer file is missing/unreadable,
 * a fresh clone with a plain "npm run ingest" keeps working.
 * @returns {string}
 */
export function getActiveCollectionName() {
  try {
    const stat = fs.statSync(ACTIVE_COLLECTION_FILE);
    if (activeCache.mtimeMs !== stat.mtimeMs || activeCache.value === null) {
      const { active } = JSON.parse(fs.readFileSync(ACTIVE_COLLECTION_FILE, 'utf-8'));
      if (typeof active !== 'string' || !active.trim()) {
        throw new Error('field "active" must be a non-empty string');
      }
      activeCache = { mtimeMs: stat.mtimeMs, value: active.trim() };
    }
    return activeCache.value;
  } catch {
    // Transient read failure (mid-write, AV scan, etc.): keep serving the
    // last-known-good pointer rather than reverting to the legacy default,
    // which may already have been pruned after a swap.
    if (activeCache.value !== null) {
      return activeCache.value;
    }
    console.warn(`[vectorStore] No valid active-collection pointer (${path.basename(ACTIVE_COLLECTION_FILE)}), using legacy default "${DEFAULT_COLLECTION}".`);
    return DEFAULT_COLLECTION;
  }
}

/** The swap itself: atomically repoint the live collection (write + rename). */
export function setActiveCollectionName(name) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('setActiveCollectionName: name must be a non-empty string');
  }
  const value = name.trim();
  fs.mkdirSync(path.dirname(ACTIVE_COLLECTION_FILE), { recursive: true });
  const tmp = `${ACTIVE_COLLECTION_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ active: value, updated_at: new Date().toISOString() }, null, 2), 'utf-8');
  fs.renameSync(tmp, ACTIVE_COLLECTION_FILE);
  activeCache = { mtimeMs: fs.statSync(ACTIVE_COLLECTION_FILE).mtimeMs, value };
  console.log(`[vectorStore] Active collection swapped → "${value}".`);
}

/** Versioned parent-store path for a collection (written by ingest). */
export function parentStorePathFor(collectionName) {
  return path.join(dataDir, `parents-${collectionName}.json`);
}

/**
 * Resolve the parent store for a collection: the versioned file if it
 * exists, else the legacy flat parents.json (pre-blue-green layouts).
 * @returns {string|null} absolute path, or null when neither exists.
 */
export function findParentStorePath(collectionName) {
  const versioned = parentStorePathFor(collectionName);
  if (fs.existsSync(versioned)) return versioned;
  const legacy = path.join(dataDir, 'parents.json');
  if (fs.existsSync(legacy)) return legacy;
  return null;
}

/**
 * Next versioned collection name: "legal_docs_v3" → "legal_docs_v4".
 * A non-versioned active name (e.g. the legacy default) starts at v1 of
 * the canonical base.
 */
export function nextCollectionName(activeName) {
  const m = /^(.*)_v(\d+)$/.exec(activeName);
  if (m) return `${m[1]}_v${parseInt(m[2], 10) + 1}`;
  return 'legal_docs_v1';
}

/** True for collections this pipeline manages (safe to prune). */
export function isManagedCollection(name) {
  return /^legal_docs_v\d+$/.test(name) || name === DEFAULT_COLLECTION;
}

/**
 * The ingestion corpus: curated data/*.txt plus extracted updates in
 * data/updates/*.txt (written by reindex from flagged documents). Both
 * ingest.js and the retrieval local fallback read this so the two never
 * diverge.
 * @returns {Array<{file: string, path: string}>}
 */
export function listCorpusFiles() {
  const out = [];
  for (const dir of [dataDir, path.join(dataDir, 'updates')]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.txt')) out.push({ file: f, path: path.join(dir, f) });
    }
  }
  return out;
}
