const jwt = require('jsonwebtoken');
const secret = () => process.env.JWT_SECRET || 'dev-secret-change-me';

const sign = (user) => jwt.sign({ id: user.id, email: user.email }, secret(), { expiresIn: '7d' });

function readToken(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), secret()); } catch { return null; }
}

// Attaches req.user if a valid token exists; never blocks.
const optionalAuth = (req, res, next) => { req.user = readToken(req); next(); };

// Blocks the request if there is no valid token.
const requireAuth = (req, res, next) => {
  req.user = readToken(req);
  if (!req.user) return res.status(401).json({ error: 'Please log in first.' });
  next();
};

const requireAdmin = (req, res, next) => {
  if (!process.env.ADMIN_KEY || req.headers['x-admin-key'] !== process.env.ADMIN_KEY)
    return res.status(403).json({ error: 'Admin access only.' });
  next();
};

module.exports = { sign, optionalAuth, requireAuth, requireAdmin };

