// SQLite singleton — uses Node 22+'s built-in node:sqlite (no native build needed).
// Wraps DatabaseSync to provide a tiny better-sqlite3-compatible surface.
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA } from './schema.js';

const dbPath = process.env.DB_PATH || './medshelf.db';
const inner = new DatabaseSync(dbPath);
inner.exec('PRAGMA journal_mode = WAL');
inner.exec('PRAGMA foreign_keys = ON');
inner.exec(SCHEMA);

// Idempotent column-additions for older DBs predating these columns.
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
