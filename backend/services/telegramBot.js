// ─────────────────────────────────────────────
// Telegram bot — a messaging "frontend" for the existing SahakarMitra
// RAG pipeline. No webhook needed: long polling keeps this runnable
// alongside the web server without any extra infrastructure.
//
//   npm run telegram-bot        (requires TELEGRAM_BOT_TOKEN in .env)
//
// Per user (Telegram chat ID) it remembers the last selected state and
// language, so nobody has to re-state their jurisdiction every message:
//   /start           welcome + example questions
//   /help            the same, any time
//   /state           list enabled jurisdictions
//   /state Gujarat   switch jurisdiction
//   /language        list enabled languages
//   /language hi     switch response language hint
//
// Every free-text message goes through the SAME pipeline as the web
// chat: style detection → translation → parent-child retrieval →
// grounded answer (services/chatPipeline.js).
// ─────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TelegramBot from 'node-telegram-bot-api';
import { runChatPipeline } from './chatPipeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stateConfigPath = path.join(__dirname, '..', 'data', 'state-config.json');
const languageConfigPath = path.join(__dirname, '..', 'data', 'language-config.json');

// In-memory session store: chatId → { state, language }
const sessions = new Map();

function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, { state: 'Maharashtra', language: 'en' });
  }
  return sessions.get(chatId);
}

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return {};
  }
}

function enabledStates() {
  const cfg = loadJson(stateConfigPath);
  return Object.entries(cfg)
    .filter(([name, flags]) => !name.startsWith('_') && flags.enabled)
    .map(([name, flags]) => ({ name, act_name: flags.act_name }));
}

function enabledLanguages() {
  const cfg = loadJson(languageConfigPath);
  return Object.entries(cfg)
    .filter(([code, flags]) => !code.startsWith('_') && flags.enabled)
    .map(([code]) => code);
}

// ── Markdown → Telegram HTML ─────────────────────────────────
// The LLM emits GitHub-style markdown (### headers, **bold**, `code`,
// - bullets). Telegram's HTML parse mode is the most robust target:
// escape everything first, then convert the known constructs.

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function markdownToTelegramHtml(text) {
  if (!text) return '';

  // Pull out fenced code blocks before escaping
  const blocks = [];
  let s = String(text).replace(/```([\s\S]*?)```/g, (_, code) => {
    blocks.push(`<pre>${escapeHtml(code.trim())}</pre>`);
    return `\u0000B${blocks.length - 1}\u0000`;
  });

  s = escapeHtml(s);

  // Inline code
  s = s.replace(/`([^`\n]+)`/g, (_, c) => `<code>${c}</code>`);

  // Headers (### Title) → bold lines
  s = s.replace(/^#{1,6}\s*(.+)$/gm, '<b>$1</b>');

  // Bold **text**
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');

  // Restore fenced blocks
  s = s.replace(/\u0000B(\d+)\u0000/g, (_, i) => blocks[Number(i)] || '');

  return s;
}

function formatCitations(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return '';
  const lines = sources.map((s, i) => {
    const state = s.matchedState || s.state || '';
    return `${i + 1}. ${s.section}${state ? ` (${state})` : ''}`;
  });
  return `\n\n<b>Verified sources</b>\n${escapeHtml(lines.join('\n'))}`;
}

const WELCOME = [
  '<b>SahakarMitra Cooperative Legal Assistant</b>',
  '',
  'Ask me anything about cooperative society laws, and I will answer with verified statutory citations.',
  '',
  '<b>Try asking:</b>',
  '• What are the rights of society members?',
  '• How are society elections conducted?',
  '• How can a dispute be resolved?',
  '• Who is qualified to be appointed as an auditor?',
  '',
  '<b>Commands:</b>',
  '/state — view or switch your jurisdiction',
  '/language — view or switch your language',
  '/help — this message',
  '',
  'Answers are informational; always verify with official legal counsel.',
].join('\n');

// ── Bot factory ──────────────────────────────────────────────

export function startTelegramBot(token) {
  const bot = new TelegramBot(token, { polling: true });

  bot.on('polling_error', (err) => {
    console.warn('[telegram] polling error:', err.message);
  });

  // /start and /help
  const sendWelcome = (msg) => bot.sendMessage(msg.chat.id, WELCOME, { parse_mode: 'HTML', disable_web_page_preview: true });
  bot.onText(/^\/start/, sendWelcome);
  bot.onText(/^\/help/, sendWelcome);

  // /state            → list enabled jurisdictions
  // /state Gujarat    → switch jurisdiction (only enabled ones accepted)
  bot.onText(/^\/state(\s+.*)?$/, (msg, match) => {
    const chatId = msg.chat.id;
    const arg = (match[1] || '').trim();
    const enabled = enabledStates();

    if (!arg) {
      const list = enabled.map((s) => `• /state ${s.name} — ${s.act_name}`).join('\n');
      const current = getSession(chatId).state;
      return bot.sendMessage(chatId, `<b>Your jurisdiction:</b> ${escapeHtml(current)}\n\n<b>Enabled jurisdictions:</b>\n${escapeHtml(list)}\n\nUse /state &lt;name&gt; to switch.`, { parse_mode: 'HTML' });
    }

    const matchState = enabled.find((s) => s.name.toLowerCase() === arg.toLowerCase());
    if (!matchState) {
      return bot.sendMessage(chatId, `"${escapeHtml(arg)}" is not available yet.\n\nEnabled jurisdictions:\n${escapeHtml(enabled.map((s) => `• ${s.name}`).join('\n'))}`, { parse_mode: 'HTML' });
    }
    getSession(chatId).state = matchState.name;
    bot.sendMessage(chatId, `Jurisdiction set to <b>${escapeHtml(matchState.name)}</b> (${escapeHtml(matchState.act_name)}).`, { parse_mode: 'HTML' });
  });

  // /language           → list enabled languages
  // /language hi        → switch language hint
  bot.onText(/^\/language(\s+.*)?$/, (msg, match) => {
    const chatId = msg.chat.id;
    const arg = (match[1] || '').trim().toLowerCase();
    const enabled = enabledLanguages();

    if (!arg) {
      const current = getSession(chatId).language;
      return bot.sendMessage(chatId, `<b>Your language:</b> ${escapeHtml(current)}\n\n<b>Enabled languages:</b> ${escapeHtml(enabled.join(', '))}\n\nUse /language &lt;code&gt; to switch. You can also just write in your own language or style and the bot will mirror it.`, { parse_mode: 'HTML' });
    }

    if (!enabled.includes(arg)) {
      return bot.sendMessage(chatId, `"${escapeHtml(arg)}" is not available yet.\n\nEnabled languages: ${escapeHtml(enabled.join(', '))}`, { parse_mode: 'HTML' });
    }
    getSession(chatId).language = arg;
    bot.sendMessage(chatId, `Language set to <b>${escapeHtml(arg)}</b>.`, { parse_mode: 'HTML' });
  });

  // Free-text messages → RAG pipeline
  bot.on('message', async (msg) => {
    // Ignore non-text and command messages (commands are handled above)
    if (!msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const session = getSession(chatId);
    console.log(`[telegram] chat=${chatId} q="${msg.text.slice(0, 80)}" state=${session.state} lang=${session.language}`);

    let status;
    try {
      status = await bot.sendMessage(chatId, 'Searching the statute database…');
    } catch {
      status = null;
    }

    try {
      const { answer, sources, style } = await runChatPipeline({
        message: msg.text,
        language: session.language,
        state: session.state,
        history: [],
        attachments: [],
        logTag: 'telegram',
      });

      // Remember the language the user is actually conversing in
      if (style?.lang) session.language = session.language === 'en' && style.lang !== 'en' ? style.lang : session.language;

      const html = markdownToTelegramHtml(answer) + formatCitations(sources);
      if (status) await bot.deleteMessage(chatId, status.message_id).catch(() => {});
      await bot.sendMessage(chatId, html, { parse_mode: 'HTML', disable_web_page_preview: true });
      console.log(`[telegram] OK  answer_len=${answer.length}`);
    } catch (err) {
      console.error('[telegram] pipeline error:', err.message);
      if (status) await bot.deleteMessage(chatId, status.message_id).catch(() => {});
      await bot.sendMessage(chatId, 'Sorry, something went wrong while processing your question. Please try again.').catch(() => {});
    }
  });

  console.log('[telegram] Bot is listening (long polling).');
  return bot;
}
