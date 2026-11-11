require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json({ limit: '50kb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, max: 120 }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/initiatives', require('./routes/initiatives'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/stats', require('./routes/stats'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`CivicConnect API running on http://localhost:${PORT}`));
