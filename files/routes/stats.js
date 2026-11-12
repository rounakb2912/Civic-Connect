const router = require('express').Router();
const { db } = require('../db');

router.get('/', (req, res) => {
  res.json(db.getStats());
});

module.exports = router;

