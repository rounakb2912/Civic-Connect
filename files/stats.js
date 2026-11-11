const router = require('express').Router();
const { db } = require('../db');

router.get('/', (req, res) => {
  const count = (s) => db.complaints.filter((c) => c.status === s).length;
  const helpful = db.feedback.filter((f) => f.helpful).length;
  res.json({
    total: db.complaints.length,
    inProgress: count('In progress'),
    resolved: count('Resolved'),
    helpfulPercent: db.feedback.length ? Math.round((helpful / db.feedback.length) * 100) : null
  });
});

module.exports = router;
