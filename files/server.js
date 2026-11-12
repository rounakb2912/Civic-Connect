require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDB } = require('./db');

async function main() {
  // Wait for the SQLite database to be ready
  await initDB();
  console.log('SQLite database initialised (civicconnect.db)');

  const app = express();

  // Security & parsing
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
  app.use(express.json({ limit: '50kb' }));
  app.use('/api/', rateLimit({ windowMs: 60_000, max: 120 }));

  // ── API routes ─────────────────────────────────────────────────
  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/initiatives', require('./routes/initiatives'));
  app.use('/api/complaints', require('./routes/complaints'));
  app.use('/api/feedback', require('./routes/feedback'));
  app.use('/api/stats', require('./routes/stats'));

  // ── Serve the frontend (index.html, CSS, JS, images) ──────────
  app.use(express.static(path.join(__dirname)));

  // Fallback: serve index.html for any non-API route
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/'))
      return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  // ── Error handlers ─────────────────────────────────────────────
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`CivicConnect running on https://civic-connect-3t8c.onrender.com/`));
}

main().catch((err) => { console.error('Failed to start:', err); process.exit(1); });
