// ─────────────────────────────────────────────
// Ingestion, parent-child chunking pipeline.
//
// For every corpus file (data/*.txt + data/updates/*.txt):
//   1. Split into PARENT chunks = whole legal sections.
//   2. Split each parent into CHILD chunks = ~100-token dense
//      sub-clauses, split on sentence boundaries.
//   3. Embed CHILD chunks with the hybrid recipe (body ⊕ section
//      heading, 50/50) and store them in the TARGET ChromaDB collection
//      with metadata { source_file, section_title, parent_id }.
//   4. Store PARENT chunks (full text, no embedding) in
//      data/parents-{collection}.json for retrieval-time resolution.
//
// Target selection:
//   • npm run ingest            → ingests into the ACTIVE collection
//                                 (dev loop; requires ChromaDB running)
//   • reindex.js                → calls ingestToCollection() with a NEW
//                                 versioned name (blue-green build)
//   • TARGET_COLLECTION=name    → override from the environment
//
// Prereq: ChromaDB server must be running. Start it with:
//   pip install chromadb
//   chroma run --path ./chroma_data --port 8000
// ─────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ChromaClient } from 'chromadb';
import { generateChildEmbeddings } from '../services/embeddings.js';
import { buildParentChildChunks, estimateTokens } from '../services/chunking.js';
import { getActiveCollectionName, parentStorePathFor, listCorpusFiles } from '../services/vectorStore.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir   = path.join(__dirname, '..', 'data');
const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';

/**
 * Build the parent/child corpus from all source files.
 * @returns {{ allParents: Map, allChildren: Array, files: string[] }}
 */
export function buildCorpus() {
  const allParents = new Map();   // parent_id → parent record
  const allChildren = [];         // { child_id, parent_id, text, source_file, section_title }
  const files = [];

  for (const { file, path: filePath } of listCorpusFiles()) {
    files.push(file);
    const text = fs.readFileSync(filePath, 'utf-8');
    const { parents, children } = buildParentChildChunks(text, file);

    for (const p of parents) allParents.set(p.parent_id, p);
    for (const c of children) {
      const parent = allParents.get(c.parent_id);
      allChildren.push({
        ...c,
        source_file:   file,
        section_title: parent?.section_title || 'Untitled',
        act_name:      parent?.act_name || 'Cooperative Societies Act',
        state:         parent?.state || 'Maharashtra',
      });
    }
    console.log(`- ${file}: ${parents.length} section(s) → ${parents.length} parent(s), ${children.length} child chunk(s) [State: ${parents[0]?.state || 'Maharashtra'}]`);
  }

  return { allParents, allChildren, files };
}

/**
 * Run the full ingestion into a (new or existing) collection.
 *
 * @param {object} [opts]
 * @param {string} [opts.collectionName] target collection; defaults to the
 *        ACTIVE collection (plain dev re-ingest) or TARGET_COLLECTION env
 * @returns {{ collection: string, parentsFile: string, parentCount: number, childCount: number, files: string[] }}
 */
export async function ingestToCollection({ collectionName } = {}) {
  const target = collectionName
    || process.env.TARGET_COLLECTION
    || getActiveCollectionName();

  console.log(`── SahakarMitra ingestion (multi-state parent-child) ──`);
  console.log(`Data dir:      ${dataDir}`);
  console.log(`ChromaDB URL:  ${CHROMA_URL}`);
  console.log(`Target:        ${target}${collectionName ? '  (explicit)' : '  (active collection)'}`);
  console.log('');

  const { allParents, allChildren, files } = buildCorpus();
  if (files.length === 0) {
    throw new Error('No .txt corpus files found (data/ and data/updates/).');
  }
  if (allChildren.length === 0) {
    throw new Error('No chunks produced from the corpus files, nothing to ingest.');
  }

  // Parent lookup table for this collection (full sections, no embeddings)
  const parentsFile = parentStorePathFor(target);
  fs.mkdirSync(path.dirname(parentsFile), { recursive: true });
  fs.writeFileSync(parentsFile, JSON.stringify(Object.fromEntries(allParents), null, 2), 'utf-8');
  console.log(`Parent store written: ${parentsFile} (${allParents.size} parent section(s))`);

  // Embed children (hybrid: body ⊕ section heading) and store in Chroma
  const client = new ChromaClient({ path: CHROMA_URL });

  // Drop existing target collection if present, so re-ingesting is idempotent
  try {
    await client.deleteCollection({ name: target });
    console.log(`Deleted existing collection "${target}".`);
  } catch {
    // Collection didn't exist, that's fine.
  }

  const collection = await client.createCollection({
    name: target,
    metadata: { description: 'Multi-State Cooperative Societies Act & State Laws (parent-child ingestion)' },
  });

  console.log(`Embedding ${allChildren.length} child chunk(s) (hybrid body+heading)...`);
  const embeddings = await generateChildEmbeddings(
    allChildren.map(c => c.text),
    allChildren.map(c => `${c.section_title}\n${c.text}`)
  );

  await collection.add({
    ids:        allChildren.map(c => c.child_id),
    embeddings,
    metadatas:  allChildren.map(c => ({
      source_file:   c.source_file,
      section_title: c.section_title,   // parent heading → citation stays section-accurate
      act_name:      c.act_name,
      state:         c.state,
      parent_id:     c.parent_id,
      chunk_type:    'child',
    })),
    documents:  allChildren.map(c => c.text),
  });

  const avgTokens = Math.round(
    allChildren.reduce((sum, c) => sum + estimateTokens(c.text), 0) / allChildren.length
  );
  console.log('');
  console.log(`✅ Ingested ${allChildren.length} child chunk(s) across ${allParents.size} parent section(s) from ${files.length} file(s) into "${target}".`);
  console.log(`   Parent store: ${path.basename(parentsFile)} (avg child ~${avgTokens} tokens)`);

  return {
    collection: target,
    parentsFile,
    parentCount: allParents.size,
    childCount: allChildren.length,
    files,
  };
}

// ── CLI entry ───────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ingestToCollection()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Ingestion failed:', err);
      console.error('');
      console.error('Troubleshooting:');
      console.error('  1. Is the ChromaDB server running? (chroma run --path ./chroma_data --port 8000)');
      console.error('  2. Is CHROMA_URL in .env pointing at the right host/port?');
      process.exit(1);
    });
}
