// Persistent SQLite database via sql.js (pure JavaScript, no native build needed).
// Data is saved to civicconnect.db and survives server restarts.
const initSqlJs = require('sql.js');
const crypto    = require('crypto');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = path.join(__dirname, 'civicconnect.db');

let _db = null;          // will hold the sql.js Database instance
let _ready = null;       // promise that resolves when DB is initialised

// ── Initialise the database ────────────────────────────────────
function initDB() {
  if (_ready) return _ready;
  _ready = initSqlJs().then((SQL) => {
    // Load existing file or create a new one
    if (fs.existsSync(DB_PATH)) {
      const buf = fs.readFileSync(DB_PATH);
      _db = new SQL.Database(buf);
    } else {
      _db = new SQL.Database();
    }

    // Create tables if they don't exist
    _db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at    TEXT NOT NULL
      );
    `);
    _db.run(`
      CREATE TABLE IF NOT EXISTS complaints (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        reference  TEXT NOT NULL UNIQUE,
        user_id    TEXT,
        category   TEXT NOT NULL,
        location   TEXT NOT NULL,
        subject    TEXT NOT NULL,
        details    TEXT NOT NULL,
        status     TEXT NOT NULL DEFAULT 'Submitted',
        created_at TEXT NOT NULL
      );
    `);
    _db.run(`
      CREATE TABLE IF NOT EXISTS complaint_updates (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id INTEGER NOT NULL,
        status       TEXT NOT NULL,
        note         TEXT NOT NULL DEFAULT '',
        created_at   TEXT NOT NULL
      );
    `);
    _db.run(`
      CREATE TABLE IF NOT EXISTS feedback (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        initiative_key TEXT NOT NULL,
        helpful        INTEGER NOT NULL,
        comment        TEXT NOT NULL DEFAULT '',
        created_at     TEXT NOT NULL
      );
    `);

    save();   // persist the schema
    return _db;
  });
  return _ready;
}

// Persist current DB state to disk
function save() {
  if (!_db) return;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Helper: run a query that returns rows
function all(sql, params = []) { return _db.exec(sql) ; }
function getRows(sql, params = []) {
  const stmt = _db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
function getOne(sql, params = []) {
  const rows = getRows(sql, params);
  return rows.length ? rows[0] : null;
}
function run(sql, params = []) {
  _db.run(sql, params);
  save();
}

// ── Helper: generate a reference number ────────────────────────
const newRef = () =>
  `CC-${new Date().getFullYear()}-${crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')}`;

const uid = () => crypto.randomUUID();

// ── Public API (used by route files) ───────────────────────────
const db = {
  // Users
  createUser(id, name, email, passwordHash) {
    const now = new Date().toISOString();
    run(`INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)`,
        [id, name, email, passwordHash, now]);
    return { id, name, email, createdAt: now };
  },
  findUserByEmail(email) {
    return getOne(`SELECT * FROM users WHERE email = ?`, [email]);
  },
  findUserById(id) {
    return getOne(`SELECT * FROM users WHERE id = ?`, [id]);
  },

  // Complaints
  createComplaint({ reference, userId, category, location, subject, details }) {
    const now = new Date().toISOString();
    run(`INSERT INTO complaints (reference, user_id, category, location, subject, details, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'Submitted', ?)`,
        [reference, userId || null, category, location, subject, details, now]);
    const row = getOne(`SELECT id FROM complaints WHERE reference = ?`, [reference]);
    run(`INSERT INTO complaint_updates (complaint_id, status, note, created_at) VALUES (?, 'Submitted', 'Complaint record created.', ?)`,
        [row.id, now]);
    return { reference, userId, category, location, subject, details, status: 'Submitted', createdAt: now,
             updates: [{ status: 'Submitted', note: 'Complaint record created.', at: now }] };
  },
  findComplaintByRef(ref) {
    const c = getOne(`SELECT * FROM complaints WHERE reference = ?`, [ref]);
    if (!c) return null;
    c.updates = getRows(`SELECT status, note, created_at AS at FROM complaint_updates WHERE complaint_id = ? ORDER BY created_at ASC`, [c.id]);
    return c;
  },
  findComplaintsByUser(userId) {
    const rows = getRows(`SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
    return rows.map(c => {
      c.updates = getRows(`SELECT status, note, created_at AS at FROM complaint_updates WHERE complaint_id = ? ORDER BY created_at ASC`, [c.id]);
      return c;
    });
  },
  updateComplaintStatus(reference, status, note) {
    const c = getOne(`SELECT * FROM complaints WHERE reference = ?`, [reference]);
    if (!c) return null;
    const now = new Date().toISOString();
    run(`UPDATE complaints SET status = ? WHERE reference = ?`, [status, reference]);
    run(`INSERT INTO complaint_updates (complaint_id, status, note, created_at) VALUES (?, ?, ?, ?)`,
        [c.id, status, note || '', now]);
    return db.findComplaintByRef(reference);
  },

  // Feedback
  createFeedback(initiativeKey, helpful, comment) {
    const now = new Date().toISOString();
    run(`INSERT INTO feedback (initiative_key, helpful, comment, created_at) VALUES (?, ?, ?, ?)`,
        [initiativeKey, helpful ? 1 : 0, (comment || '').slice(0, 500), now]);
  },

  // Stats
  getStats() {
    const total      = getOne(`SELECT COUNT(*) AS c FROM complaints`).c;
    const inProgress = getOne(`SELECT COUNT(*) AS c FROM complaints WHERE status = 'In progress'`).c;
    const resolved   = getOne(`SELECT COUNT(*) AS c FROM complaints WHERE status = 'Resolved'`).c;
    const fbTotal    = getOne(`SELECT COUNT(*) AS c FROM feedback`).c;
    const fbHelpful  = getOne(`SELECT COUNT(*) AS c FROM feedback WHERE helpful = 1`).c;
    return {
      total, inProgress, resolved,
      helpfulPercent: fbTotal ? Math.round((fbHelpful / fbTotal) * 100) : null
    };
  }
};

module.exports = { db, newRef, uid, initDB };
