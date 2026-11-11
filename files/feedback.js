const router = require('express').Router();
const { db } = require('../db');
const initiatives = require('../data/initiatives.json');

router.post('/', (req, res) => {
  const { initiativeKey, helpful, comment } = req.body || {};
  if (!initiatives[initiativeKey] || typeof helpful !== 'boolean')
    return res.status(400).json({ error: 'Invalid feedback.' });
  db.feedback.push({ initiativeKey, helpful, comment: (comment || '').slice(0, 500), createdAt: new Date().toISOString() });
  res.status(201).json({ ok: true });
});

module.exports = router;
