const router = require('express').Router();
const { db, newRef } = require('../db');
const { optionalAuth, requireAuth, requireAdmin } = require('../middleware/auth');

const CATEGORIES = ['Water supply', 'Roads and streetlights', 'Sanitation and waste', 'Electricity', 'Consumer issue', 'Other public service'];
const STATUSES   = ['Submitted', 'In progress', 'Resolved'];

const publicView = (c) => ({
  reference: c.reference, category: c.category, location: c.location,
  subject: c.subject, status: c.status, createdAt: c.created_at || c.createdAt,
  updates: c.updates || []
});

// Save a complaint record (works logged in or not)
router.post('/', optionalAuth, (req, res) => {
  const { category, location, subject, details } = req.body || {};
  if (!CATEGORIES.includes(category) || !location || !subject || !details)
    return res.status(400).json({ error: 'Category, location, subject and details are required.' });
  if (subject.length > 100 || details.length > 1500)
    return res.status(400).json({ error: 'Subject or details are too long.' });

  const c = db.createComplaint({
    reference: newRef(),
    userId: req.user ? req.user.id : null,
    category,
    location: location.trim(),
    subject: subject.trim(),
    details: details.trim()
  });
  res.status(201).json(publicView(c));
});

// Logged-in user's own complaints
router.get('/mine', requireAuth, (req, res) =>
  res.json(db.findComplaintsByUser(req.user.id).map(publicView))
);

// Track by reference number (public)
router.get('/track/:reference', (req, res) => {
  const c = db.findComplaintByRef(req.params.reference.trim().toUpperCase());
  c ? res.json(publicView(c)) : res.status(404).json({ error: 'No complaint found with that reference number.' });
});

// Update status (admin only)
router.patch('/:reference/status', requireAdmin, (req, res) => {
  const { status, note } = req.body || {};
  if (!STATUSES.includes(status))
    return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(', ')}` });
  const c = db.updateComplaintStatus(req.params.reference, status, note);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(publicView(c));
});

module.exports = router;

