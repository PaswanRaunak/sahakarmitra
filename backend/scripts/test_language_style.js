// ─────────────────────────────────────────────
// Language-style detection + mirroring test.
//
// Part 1 (offline): unit-tests the heuristic detector against known
// inputs, including the 4 canonical test queries.
// Part 2 (live): sends the 4 queries through /api/chat and reports the
// server-detected style plus the first lines of each answer, so the
// mirrored style can be eyeballed.
//
// Run:  npm run test:style
// ─────────────────────────────────────────────

import { detectLanguageStyle } from '../services/llm.js';

const CASES = [
  { q: 'AGM ke liye quorum kya hai?', expected: { lang: 'hi', form: 'romanized' } },
  { q: 'वार्षिक सर्वसाधारण सभेसाठी कोरम किती आहे?', expected: { lang: 'mr', form: 'native' } },
  { q: 'सोसाइटी की समिति के चुनाव कैसे संपन्न कराए जाते हैं?', expected: { lang: 'hi', form: 'native' } },
  { q: 'society register करायचं असेल तर काय प्रोसेस आहे?', expected: { lang: 'mr', form: 'native', mixed: true } },
  { q: 'What are the rights of members under Section 24?', expected: { lang: 'en', form: 'native' } },
  { q: 'Society ka auditor kaise appoint hota hai?', expected: { lang: 'hi', form: 'romanized' } },
  { q: 'सोसायटी साठी auditor कोण qualified आहे?', expected: { lang: 'mr', form: 'native', mixed: true } },
  { q: 'सदस्याचे हक्क आणि कर्तव्य काय आहेत?', expected: { lang: 'mr', form: 'native' } },
  { q: 'सोसाइटी के सदस्यों के अधिकार क्या हैं?', expected: { lang: 'hi', form: 'native' } },
  { q: 'How to register a society?', expected: { lang: 'en', form: 'native' } },
];

let failures = 0;
console.log('── 1. Heuristic detection ──');
for (const { q, expected } of CASES) {
  const got = detectLanguageStyle(q, 'en');
  const ok = got.lang === expected.lang && got.form === expected.form
    && (expected.mixed === undefined || got.mixed === expected.mixed);
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] "${q.slice(0, 55)}" -> ${JSON.stringify(got)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`);
}

console.log('\n── 2. Live mirror check (requires backend on :5000) ──');
const LIVE_QUERIES = CASES.slice(0, 4);
try {
  const health = await fetch('http://localhost:5000/api/health', { signal: AbortSignal.timeout(5000) });
  if (!health.ok) throw new Error('unhealthy');
} catch {
  console.log('  (skipped: backend not running — start it with npm start)');
  process.exit(failures ? 1 : 0);
}

for (const { q, expected } of LIVE_QUERIES) {
  try {
    const res = await fetch('http://localhost:5000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: q, language: 'en' }),
      signal: AbortSignal.timeout(120_000),
    });
    const data = await res.json();
    const answer = (data.answer || '').replace(/\n+/g, ' ').slice(0, 140);
    console.log(`\n  Q: "${q}"  (expected style: ${expected})`);
    console.log(`  A: ${answer}...`);
  } catch (err) {
    console.log(`  ERROR for "${q}": ${err.message}`);
    failures++;
  }
}

console.log('\n──────────────────────────────────');
if (failures === 0) {
  console.log('✅ ALL STYLE CHECKS PASSED.');
} else {
  console.log(`❌ ${failures} check(s) FAILED.`);
  process.exit(1);
}
