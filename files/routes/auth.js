const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { db, uid } = require('../db');
const { sign, requireAuth } = require('../middleware/auth');

router.use(rateLimit({ windowMs: 15 * 60_000, max: 30 }));
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');

// ── Register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !emailOk(email) || (password || '').length < 8)
    return res.status(400).json({ error: 'Enter a name, a valid email and a password of 8+ characters.' });

  if (db.findUserByEmail(email.toLowerCase()))
    return res.status(409).json({ error: 'An account with this email already exists.' });

  const id = uid();
  const passwordHash = await bcrypt.hash(password, 10);
  const user = db.createUser(id, name.trim(), email.toLowerCase(), passwordHash);
  res.status(201).json({ token: sign(user), user: { id: user.id, name: user.name, email: user.email } });
});

// ── Login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = db.findUserByEmail((email || '').toLowerCase());
  if (!user || !(await bcrypt.compare(password || '', user.password_hash)))
    return res.status(401).json({ error: 'Incorrect email or password.' });
  res.json({ token: sign(user), user: { id: user.id, name: user.name, email: user.email } });
});

// ── Current user ───────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) return res.status(401).json({ error: 'Account not found.' });
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

module.exports = router;

