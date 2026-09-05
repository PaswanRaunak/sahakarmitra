// ─────────────────────────────────────────────
// Telegram bot entry point — runs the bot as its OWN process next to
// the web server, without interfering with it:
//
//   Terminal 1: npm start          (web server, :5000)
//   Terminal 2: npm run telegram-bot
//
// Requires TELEGRAM_BOT_TOKEN in backend/.env (create a bot with
// @BotFather on Telegram, then paste the token here).
// ─────────────────────────────────────────────

import 'dotenv/config';
import { startTelegramBot } from '../services/telegramBot.js';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN is not set.');
  console.error('');
  console.error('Setup (2 minutes, free):');
  console.error('  1. Open Telegram and message @BotFather');
  console.error('  2. Send /newbot and follow the prompts');
  console.error('  3. Copy the token it gives you');
  console.error('  4. Add it to backend/.env:  TELEGRAM_BOT_TOKEN=123456:ABC-DEF...');
  console.error('  5. Run:  npm run telegram-bot');
  process.exit(1);
}

startTelegramBot(token);
