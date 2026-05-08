// Postgres pool — shared by all routes.
// Falls back to node:sqlite for local dev if DATABASE_URL is missing,
// so devs can clone the repo and run with zero setup.

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_SQL = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

let db;

if (process.env.DATABASE_URL) {
  // ─── Production: Postgres on Neon ───────────────────────────────────────
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('sslmode=disable')
      ? false
      : { rejectUnauthorized: false },
  });

  await pool.query(SCHEMA_SQL);

  // Adapter to mimic the better-sqlite3 / node:sqlite call shape used in routes
  function adapt(sql, params) {
    // Convert ? placeholders → $1, $2, ... for Postgres
    let i = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++i}`);
    return { sql: pgSql, params: Array.isArray(params) ? params : Object.values(params || {}) };
  }

  db = {
    prepare(sql) {
      return {
        get: async (...args) => {
          const { sql: pgSql, params } = adapt(sql, args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0]) ? args[0] : args);
          const r = await pool.query(pgSql, params);
          return r.rows[0];
        },
        all: async (...args) => {
          const { sql: pgSql, params } = adapt(sql, args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0]) ? args[0] : args);
          const r = await pool.query(pgSql, params);
          return r.rows;
        },
        run: async (...args) => {
          const { sql: pgSql, params } = adapt(sql, args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0]) ? args[0] : args);
          const r = await pool.query(pgSql + (pgSql.toLowerCase().includes('returning') ? '' : ' RETURNING *'), params);
          return { changes: r.rowCount, lastInsertRowid: r.rows[0]?.id };
        },
      };
    },
    exec: (sql) => pool.query(sql),
    transaction(fn) {
      return async (...args) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await fn(...args);
          await client.query('COMMIT');
          return result;
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      };
    },
    pool,
  };

  console.log('[db] connected to Postgres');
} else {
  // ─── Local dev: node:sqlite (zero install) ──────────────────────────────
  const { default: sqliteDb } = await import('./index.js');   // existing wrapper
  db = sqliteDb;
  console.log('[db] using local SQLite (set DATABASE_URL for Postgres)');
}

export default db;
