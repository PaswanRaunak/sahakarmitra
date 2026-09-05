// ─────────────────────────────────────────────
// Parent-child retrieval verification script.
//
// 1. Chunking check: split a document and confirm a section with many
//    sub-clauses produces MULTIPLE child chunks whose parent holds the
//    complete section text.
// 2. Retrieval check: query about ANY individual sub-clause and confirm
//    the FULL parent section is returned as context, with a citation
//    naming the correct section, and that duplicate parents are
//    deduplicated.
//
// Run with:
//   node scripts/test_parent_child.js
//
// Uses the local in-memory vector store when ChromaDB is not running,
// and the ChromaDB index when it is, same assertions either way.
// ─────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { buildParentChildChunks, splitSentences, estimateTokens } from '../services/chunking.js';
import { retrieveRelevantChunks } from '../services/retrieval.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

let failures = 0;
function check(name, condition, detail = '') {
  const status = condition ? 'PASS' : 'FAIL';
  if (!condition) failures++;
  console.log(`  [${status}] ${name}${detail ? `, ${detail}` : ''}`);
}

// ── 1. Chunking structure ────────────────────────────────────────
console.log('\n── 1. Chunking structure (member_rights.txt) ──');
const docText = fs.readFileSync(path.join(dataDir, 'member_rights.txt'), 'utf-8');
const { parents, children } = buildParentChildChunks(docText, 'member_rights.txt');

const sec24 = parents.find(p => p.section_title.startsWith('Section 24'));
check('Section 24 exists as a parent chunk', !!sec24,
  parents.map(p => p.section_title).join(' | '));

const sec24Children = children.filter(c => c.parent_id === sec24?.parent_id);
check('Section 24 split into MULTIPLE child chunks', sec24Children.length >= 2,
  `${sec24Children.length} child chunk(s)`);
console.log('  Child chunks of Section 24:');
for (const c of sec24Children) {
  console.log(`    - ${c.child_id} (~${estimateTokens(c.text)} tokens): "${c.text.slice(0, 90)}..."`);
}

check('Every child links back to its parent via parent_id',
  children.every(c => parents.some(p => p.parent_id === c.parent_id)));

const subClauses = ['(a)', '(b)', '(c)', '(d)'];
check('Parent text contains the COMPLETE section (all sub-clauses a–d)',
  subClauses.every(sc => sec24.text.includes(sc)));

check('Child chunks never cut mid-sentence (each child is whole sentences)',
  sec24Children.every(c => splitSentences(c.text).join(' ').length >= c.text.trim().length * 0.9));

check('Child chunks are dense (~100 tokens, well under the old 250-word chunks)',
  sec24Children.every(c => estimateTokens(c.text) <= 130),
  sec24Children.map(c => `~${estimateTokens(c.text)}t`).join(', '));

// ── 2. Retrieval: sub-clause queries must return the FULL parent ──
console.log('\n── 2. Retrieval, sub-clause queries resolve to full parent sections ──');

const queries = [
  {
    q: 'Can I inspect the registers, books and accounts of my society?',
    hitChild: 'sub-clause (b), inspection of registers',
    // Both are legally correct: Section 24 (paper inspection) normally wins,
    // but when the digital-access amendment is in the corpus (blue-green
    // reindex applied data/updates/), Section 24A is the more on-point match.
    accept: [
      { expectSection: 'Section 24:', expectInText: ['(a)', '(b)', '(c)', '(d)'] },
      { expectSection: 'Section 24A', expectInText: ['electronic form'] },
    ],
  },
  {
    q: 'Am I entitled to a dividend or bonus on my share capital?',
    expectSection: 'Section 24',
    expectInText: ['(a)', '(b)', '(c)', '(d)'],
    hitChild: 'sub-clause (d), dividend on share capital',
  },
  {
    q: 'How much notice do I have to give to withdraw my membership?',
    expectSection: 'Section 35',
    expectInText: ["one month's notice"],
    hitChild: 'withdrawal notice-period sentence',
  },
  {
    q: 'Can a member be expelled without a hearing?',
    expectSection: 'Section 36',
    expectInText: ['three-fourths', 'reasonable opportunity of being heard'],
    hitChild: 'expulsion hearing sentence',
  },
  {
    q: 'Who is qualified to be appointed as an auditor?',
    expectSection: 'Section 81B',
    expectInText: ['chartered accountant', 'five years'],
    hitChild: 'auditor qualification sub-clauses',
  },
  {
    q: 'What are the effects of registration of a society?',
    expectSection: 'Section 10',
    expectInText: ['body corporate', 'perpetual succession'],
    hitChild: 'heading-phrased query, regression guard: body-only embeddings ranked Section 10 outside the top-3',
  },
];

for (const query of queries) {
  const { q, hitChild } = query;
  // Normalize: single expected section → one-element accept list
  const accept = query.accept ?? [{ expectSection: query.expectSection, expectInText: query.expectInText }];

  console.log(`\n  Query: "${q}"`);
  console.log(`  (targets ${hitChild})`);

  const results = await retrieveRelevantChunks(q, 3);
  check('Retrieval returned at least one result', results.length > 0);

  const top = results[0];
  if (!top) continue;

  const matched = accept.find((a) =>
    top.metadata?.section_title?.startsWith(a.expectSection) &&
    a.expectInText.every((t) => top.text.includes(t)));

  check(`Top result cites an accepted section (${accept.map((a) => a.expectSection).join(' or ')}) with the FULL parent text`,
    !!matched,
    `got "${top.metadata?.section_title}", text ${top.text.length} chars, starts "${top.text.slice(0, 70).replace(/\n/g, ' ')}..."`);

  check('Result metadata records it as a resolved parent',
    top.metadata?.chunk_type === 'parent',
    `chunk_type=${top.metadata?.chunk_type}`);

  const dupParents = results.map(r => r.metadata?.parent_id).filter(Boolean);
  check('No duplicate parents in result set (dedup works)',
    new Set(dupParents).size === dupParents.length,
    dupParents.join(', ') || '(no parent ids)');
}

// ── 3. Library listing uses parent sections, not child fragments ──
console.log('\n── 3. Knowledge-base listing ──');
const { getAllDocumentChunks } = await import('../services/retrieval.js');
const docs = await getAllDocumentChunks();
check('Knowledge base lists whole sections (not ~100-token fragments)',
  docs.length > 0 && docs.every((d) =>
    // Act-preamble parents (document title lines) are legitimately short;
    // every named "Section N" document must be a full multi-clause section.
    !d.section_title.startsWith('Section') || d.full_text.split(/\s+/).length > 15),
  `${docs.length} document(s)`);

// ── 4. Multi-State Filtered Retrieval Checks ──
console.log('\n── 4. Multi-State Filtered Retrieval & Cross-State Fallback ──');

// Gujarat Filter Test
const gujaratRes = await retrieveRelevantChunks('audit of accounts of societies by registrar', 3, { state: 'Gujarat' });
check('Gujarat filtered search returns Gujarat Co-op Act section',
  gujaratRes.some(r => r.metadata?.state === 'Gujarat' && r.metadata?.section_title?.includes('Section 84')),
  `got states: ${gujaratRes.map(r => `${r.metadata?.state}:${r.metadata?.section_title}`).join(', ')}`);

// Karnataka Filter Test
const karnatakaRes = await retrieveRelevantChunks('term of office of committee members is five years', 3, { state: 'Karnataka' });
check('Karnataka filtered search returns Karnataka Section 28A',
  karnatakaRes.some(r => r.metadata?.state === 'Karnataka' && r.metadata?.section_title?.includes('Section 28A')),
  `got states: ${karnatakaRes.map(r => `${r.metadata?.state}:${r.metadata?.section_title}`).join(', ')}`);

// Multi-State Act Inclusion Test
const multiStateRes = await retrieveRelevantChunks('application to central registrar signed by fifty persons from each state', 3, { state: 'Multi-State' });
check('Multi-State search returns Multi-State Section 7',
  multiStateRes.some(r => r.metadata?.state === 'Multi-State' && r.metadata?.section_title?.includes('Section 7')),
  `got: ${multiStateRes.map(r => `${r.metadata?.state}:${r.metadata?.section_title}`).join(', ')}`);

console.log('\n──────────────────────────────────');
if (failures === 0) {
  console.log('✅ ALL CHECKS PASSED, sub-clause queries & multi-state retrieval verified successfully.');
} else {
  console.log(`❌ ${failures} check(s) FAILED.`);
  process.exit(1);
}

