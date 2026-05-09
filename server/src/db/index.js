// SQLite singleton — uses Node 22+'s built-in node:sqlite (no native build needed).
// Wraps DatabaseSync to provide a tiny better-sqlite3-compatible surface.
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA } from './schema.js';

const dbPath = process.env.DB_PATH || './medshelf.db';
const inner = new DatabaseSync(dbPath);
inner.exec('PRAGMA journal_mode = WAL');
inner.exec('PRAGMA foreign_keys = ON');

// ─── Pre-SCHEMA migration: legacy → phone-only model ──────────────────────
// Detect the previous account-based schema and drop incompatible tables BEFORE
// CREATE TABLE IF NOT EXISTS would no-op them. Pre-launch data is throwaway,
// so this is safe in dev. In prod with real data, we'd port rows instead.
function tableHasColumn(table, col) {
  try {
    const cols = inner.prepare(`PRAGMA table_info(${table})`).all();
    return cols.some(c => c.name === col);
  } catch { return false; }
}
function tableExists(table) {
  try { return !!inner.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table); }
  catch { return false; }
}

if (tableHasColumn('orders', 'user_id')) {
  inner.exec('DROP TABLE IF EXISTS order_items');
  inner.exec('DROP TABLE IF EXISTS orders');
}
if (tableHasColumn('notify_requests', 'user_id') || tableHasColumn('notify_requests', 'email')) {
  inner.exec('DROP TABLE IF EXISTS notify_requests');
}
if (tableExists('users')) inner.exec('DROP TABLE IF EXISTS users');
if (tableExists('cart_items')) inner.exec('DROP TABLE IF EXISTS cart_items');
if (tableExists('wishlist')) inner.exec('DROP TABLE IF EXISTS wishlist');
if (tableExists('referral_events')) inner.exec('DROP TABLE IF EXISTS referral_events');

// Now safe to apply the new schema.
inner.exec(SCHEMA);

// Idempotent column-additions for forward migrations.
const MIGRATIONS = [
  'ALTER TABLE books ADD COLUMN cover_url TEXT',
];
for (const sql of MIGRATIONS) {
  try { inner.exec(sql); } catch (e) {
    if (!/duplicate column/i.test(e.message)) throw e;
  }
}

// Wrap statement to mimic better-sqlite3's .get / .all / .run semantics
function wrapStatement(stmt) {
  return {
    get: (...args) => {
      if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
        return stmt.get(args[0]);
      }
      return stmt.get(...args);
    },
    all: (...args) => {
      if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
        return stmt.all(args[0]);
      }
      return stmt.all(...args);
    },
    run: (...args) => {
      if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
        const result = stmt.run(args[0]);
        return { lastInsertRowid: result.lastInsertRowid, changes: result.changes };
      }
      const result = stmt.run(...args);
      return { lastInsertRowid: result.lastInsertRowid, changes: result.changes };
    },
  };
}

const db = {
  prepare(sql) { return wrapStatement(inner.prepare(sql)); },
  exec(sql) { return inner.exec(sql); },
  transaction(fn) {
    return (...args) => {
      inner.exec('BEGIN');
      try { const r = fn(...args); inner.exec('COMMIT'); return r; }
      catch (e) { inner.exec('ROLLBACK'); throw e; }
    };
  },
  pragma(stmt) { return inner.exec(`PRAGMA ${stmt}`); },
};

export default db;
