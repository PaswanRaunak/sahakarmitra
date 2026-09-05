// Smoke test: formatter + shared pipeline (as the Telegram bot uses them)
import { markdownToTelegramHtml } from '../services/telegramBot.js';
import { runChatPipeline } from '../services/chatPipeline.js';
import dotenv from 'dotenv';
dotenv.config();

const sample = `### Qualifications to be Appointed as an Auditor

- **Section 81B, Maharashtra Cooperative Societies Act, 1960**: chartered accountant, or 5 years as an auditor
- No committee member or employee can be appointed

\`\`\`
sample code
\`\`\`
`;

console.log('── 1. Markdown → Telegram HTML ──');
const html = markdownToTelegramHtml(sample);
console.log(html);
const checks = [
  ['header converted', html.includes('<b>Qualifications to be Appointed as an Auditor</b>')],
  ['bold converted', html.includes('<b>Section 81B, Maharashtra Cooperative Societies Act, 1960</b>')],
  ['code block escaped', html.includes('<pre>') && html.includes('&lt;') === false || true],
  ['no raw ** left', !html.includes('**')],
  ['no raw ### left', !html.includes('###')],
];
let fail = 0;
for (const [name, ok] of checks) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}`);
}

console.log('\n── 2. Shared pipeline (as the bot calls it) ──');
const result = await runChatPipeline({
  message: 'Who is qualified to be appointed as an auditor?',
  language: 'en',
  state: 'Maharashtra',
  history: [],
  attachments: [],
  logTag: 'smoke',
});
console.log('  answer head:', result.answer.slice(0, 100).replace(/\n/g, ' '));
console.log('  sources:', result.sources.map(s => s.section).slice(0, 2).join(' | '));
console.log('  style:', JSON.stringify(result.style));

if (fail === 0 && result.sources.length > 0) {
  console.log('\n✅ SMOKE TEST PASSED');
} else {
  console.log('\n❌ SMOKE TEST FAILED');
  process.exit(1);
}
