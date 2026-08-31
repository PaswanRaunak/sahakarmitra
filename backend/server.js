// ─────────────────────────────────────────────
// SahakarMitra backend entry point
// Serves the REST API that the React frontend talks to.
// ─────────────────────────────────────────────

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import chatRoutes from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());                                  // allow the Vite dev server (5173) to call us
app.use(express.json({ limit: '1mb' }));          // parse JSON bodies (chat messages)

// Health-check endpoint — handy for curl/Postman smoke tests
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SahakarMitra API' });
});

// Main chat endpoint — POST /api/chat
app.use('/api/chat', chatRoutes);

app.listen(PORT, () => {
  console.log(`SahakarMitra backend running on http://localhost:${PORT}`);
  console.log(`  Health check : http://localhost:${PORT}/api/health`);
  console.log(`  Chat endpoint: http://localhost:${PORT}/api/chat`);
});
