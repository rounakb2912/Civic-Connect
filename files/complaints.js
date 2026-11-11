const router = require('express').Router();
const { db, newRef } = require('../db');
const { optionalAuth, requireAuth, requireAdmin } = require('../middleware/auth');

const CATEGORIES = ['Water supply', 'Roads and streetlights', 'Sanitation and waste', 'Electricity', 'Consumer issue', 'Other public service'];
const STATUSES = ['Submitted', 'In progress', 'Resolved'];
const publicView = (c) => ({ reference: c.reference, category: c.category, location: c.location,
  subject: c.subject, status: c.status, createdAt: c.createdAt, updates: c.updates });

// Save a complaint record (works logged in or not). This does NOT forward it to any government body.
router.post('/', optionalAuth, (req, res) => {
  const { category, location, subject, details } = req.body || {};
  if (!CATEGORIES.includes(category) || !location || !subject || !details)
    return res.status(400).json({ error: 'Category, location, subject and details are required.' });
  if (subject.length > 100 || details.length > 1500)
    return res.status(400).json({ error: 'Subject or details are too long.' });
  const now = new Date().toISOString();
  const c = { reference: newRef(), userId: req.user ? req.user.id : null, category,
    location: location.trim(), subject: subject.trim(), details: details.trim(),
    status: 'Submitted', createdAt: now, updates: [{ status: 'Submitted', note: 'Complaint record created.', at: now }] };
  db.complaints.push(c);
  res.status(201).json(publicView(c));
});

// Logged-in user's own complaints
router.get('/mine', requireAuth, (req, res) =>
  res.json(db.complaints.filter((c) => c.userId === req.user.id).map(publicView).reverse()));

// Track by reference number (public, details are not exposed)
router.get('/track/:reference', (req, res) => {
  const c = db.complaints.find((x) => x.reference === req.params.reference.trim().toUpperCase());
  c ? res.json(publicView(c)) : res.status(404).json({ error: 'No complaint found with that reference number.' });
});

// Update status (for your admin tool / staff). Send header: x-admin-key
router.patch('/:reference/status', requireAdmin, (req, res) => {
  const c = db.complaints.find((x) => x.reference === req.params.reference);
  const { status, note } = req.body || {};
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (!STATUSES.includes(status)) return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(', ')}` });
  c.status = status;
  c.updates.push({ status, note: note || '', at: new Date().toISOString() });
  res.json(publicView(c));
});

module.exports = router;
