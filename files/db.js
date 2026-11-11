// TODO: replace this in-memory store with your real database (PostgreSQL, MongoDB, SQLite...).
// Every route reads/writes only through this object, so swapping it is a one-file change.
const crypto = require('crypto');

const db = {
  users: [],       // { id, name, email, passwordHash, createdAt }
  complaints: [],  // { reference, userId, category, location, subject, details, status, createdAt, updates[] }
  feedback: []     // { initiativeKey, helpful, comment, createdAt }
};

const newRef = () =>
  `CC-${new Date().getFullYear()}-${crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')}`;

module.exports = { db, newRef, uid: () => crypto.randomUUID() };
