// ─────────────────────────────────────────────
// Ingestion script
//
// Reads every .txt file from backend/data/, splits each one into
// ~250-word chunks (preserving paragraph boundaries), generates an
// embedding per chunk using all-MiniLM-L6-v2, and stores the chunks
// in ChromaDB with metadata { source_file, section_title, chunk_text }.
//
// Run with:
//   npm run ingest
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
import { generateEmbeddings } from '../services/embeddings.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir   = path.join(__dirname, '..', 'data');
const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const COLLECTION_NAME = 'sahakarmitra_laws';

// ─────────────────────────────────────────────
// Text chunker
//   - Split on blank lines into paragraphs
//   - Greedily accumulate paragraphs into chunks of ~targetWords
//   - Never split a paragraph across chunks
// ─────────────────────────────────────────────
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

// The first non-empty line of a chunk is treated as the section title.
// This works for our placeholder data files where each section starts
// with a heading like "Section 73: Conduct of elections".
function extractSectionTitle(chunk) {
  const firstLine = chunk.split('\n').find(l => l.trim().length > 0);
  if (!firstLine) return 'Untitled';
  return firstLine.trim().slice(0, 120);
}

async function main() {
  console.log('── SahakarMitra ingestion ──');
  console.log(`Data dir:    ${dataDir}`);
  console.log(`ChromaDB URL: ${CHROMA_URL}`);
  console.log('');

  if (!fs.existsSync(dataDir)) {
    console.error(`Data directory not found: ${dataDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.txt'));
  if (files.length === 0) {
    console.error('No .txt files found in data/. Add some legal text files first.');
    process.exit(1);
  }
  console.log(`Found ${files.length} text file(s): ${files.join(', ')}`);
  console.log('');

  // Connect to ChromaDB and create/recreate the collection
  const client = new ChromaClient({ path: CHROMA_URL });

  // Drop existing collection if present, so re-running ingest is idempotent
  try {
    await client.deleteCollection({ name: COLLECTION_NAME });
    console.log(`Deleted existing collection "${COLLECTION_NAME}".`);
  } catch {
    // Collection didn't exist — that's fine.
  }

  const collection = await client.createCollection({
    name: COLLECTION_NAME,
    metadata: { description: 'Maharashtra Cooperative Societies Act chunks' },
  });

  let totalChunks = 0;

  for (const file of files) {
    const text   = fs.readFileSync(path.join(dataDir, file), 'utf-8');
    const chunks = chunkText(text);
    console.log(`- ${file}: ${chunks.length} chunk(s)`);

    // Batch embed — one model call per file, much faster than per-chunk.
    const embeddings = await generateEmbeddings(chunks);

    const ids       = chunks.map((_, i) => `${file}::${i}`);
    const metadatas = chunks.map(c => ({
      source_file:   file,
      section_title: extractSectionTitle(c),
      chunk_text:    c,
    }));

    await collection.add({
      ids,
      embeddings,
      metadatas,
      documents: chunks,   // ChromaDB stores the raw text too
    });

    totalChunks += chunks.length;
  }

  console.log('');
  console.log(`✅ Ingested ${totalChunks} chunks from ${files.length} document(s) into ChromaDB.`);
  console.log(`   Collection: ${COLLECTION_NAME}`);
}

main().catch(err => {
  console.error('Ingestion failed:', err);
  console.error('');
  console.error('Troubleshooting:');
  console.error('  1. Is the ChromaDB server running? (chroma run --path ./chroma_data --port 8000)');
  console.error('  2. Is CHROMA_URL in .env pointing at the right host/port?');
  process.exit(1);
});
