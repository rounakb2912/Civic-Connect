const router = require('express').Router();
// TODO: move this JSON into a database table when you want an admin panel to edit it.
const initiatives = require('../data/initiatives.json');

router.get('/', (req, res) => res.json(initiatives));
router.get('/:key', (req, res) =>
  initiatives[req.params.key] ? res.json(initiatives[req.params.key]) : res.status(404).json({ error: 'Initiative not found' }));

module.exports = router;
