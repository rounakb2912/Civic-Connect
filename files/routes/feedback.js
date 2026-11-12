const router      = require('express').Router();
const { db }      = require('../db');
const initiatives = require('../data/initiatives.json');

router.post('/', (req, res) => {
  const { initiativeKey, helpful, comment } = req.body || {};
  if (!initiatives[initiativeKey] || typeof helpful !== 'boolean')
    return res.status(400).json({ error: 'Invalid feedback.' });
  db.createFeedback(initiativeKey, helpful, comment);
  res.status(201).json({ ok: true });
});

module.exports = router;

