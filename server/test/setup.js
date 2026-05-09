// Global Vitest setup — points each test run at an isolated SQLite file
// in OS temp so tests don't trash the dev DB.
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

// Set BEFORE any module that touches the DB is imported.
const dir = mkdtempSync(join(tmpdir(), 'pmb-test-'));
process.env.DB_PATH = join(dir, 'test.db');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-must-be-at-least-32-characters-long-xx';
process.env.ADMIN_PHONES = '+919999000001';
process.env.LOG_LEVEL = 'silent';

// Cleanup on exit
process.on('exit', () => { try { rmSync(dir, { recursive: true, force: true }); } catch {} });
