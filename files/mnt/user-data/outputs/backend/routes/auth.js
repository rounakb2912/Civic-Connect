const router = require('express').Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { db, uid } = require('../db');
const { sign, requireAuth } = require('../middleware/auth');

router.use(rateLimit({ windowMs: 15 * 60_000, max: 30 }));
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !emailOk(email) || (password || '').length < 8)
    return res.status(400).json({ error: 'Enter a name, a valid email and a password of 8+ characters.' });
  if (db.users.some((u) => u.email === email.toLowerCase()))
    return res.status(409).json({ error: 'An account with this email already exists.' });
  const user = { id: uid(), name: name.trim(), email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 10), createdAt: new Date().toISOString() };
  db.users.push(user);
  res.status(201).json({ token: sign(user), user: { id: user.id, name: user.name, email: user.email } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = db.users.find((u) => u.email === (email || '').toLowerCase());
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash)))
    return res.status(401).json({ error: 'Incorrect email or password.' });
  res.json({ token: sign(user), user: { id: user.id, name: user.name, email: user.email } });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(401).json({ error: 'Account not found.' });
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

module.exports = router;
