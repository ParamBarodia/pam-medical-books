// One-time password issuance + verification.
// Backed by the `otps` table; max 5 verify attempts per OTP, 10-minute TTL.
import crypto from 'node:crypto';
import db from '../db/index.js';
import * as sms from './sms.js';
import { logger } from '../logger.js';

const TTL_MS = 10 * 60 * 1000;            // 10 minutes
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;     // 60 seconds between resends to the same phone

export function normalizePhone(input) {
  const str = String(input || '');
  const digits = str.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith('091')) return `+${digits.slice(1)}`;
  // Accept already-prefixed E.164 numbers as long as they're plausible length
  if (str.startsWith('+') && digits.length >= 11) return `+${digits}`;
  return null;   // invalid
}

function randomCode() {
  // 6-digit 0-padded — easier on phone keypads than alphanumeric
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

// Issue a fresh OTP and SMS it. Returns { ok, expiresAt } or throws on cooldown.
export async function issueOtp(phone, purpose) {
  if (!['cod_checkout', 'admin_login'].includes(purpose)) {
    throw new Error(`Unknown OTP purpose: ${purpose}`);
  }

  // Cooldown: don't allow another OTP within 60s for the same phone+purpose
  const recent = db.prepare(`
    SELECT created_at FROM otps
    WHERE phone = ? AND purpose = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(phone, purpose);
  if (recent && Date.now() - recent.created_at < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - recent.created_at)) / 1000);
    const err = new Error(`Please wait ${wait}s before requesting another code`);
    err.status = 429;
    throw err;
  }

  const code = randomCode();
  const expiresAt = Date.now() + TTL_MS;
  db.prepare(`
    INSERT INTO otps (phone, code, purpose, expires_at) VALUES (?, ?, ?, ?)
  `).run(phone, code, purpose, expiresAt);

  await sms.sendOtpSms(phone, code).catch((e) => {
    logger.error({ err: e, phone: phone.slice(0, 6) + '****' }, 'OTP SMS send failed');
    // Don't throw — in mock mode the OTP is in the server log, dev can read it
  });

  return { ok: true, expiresAt, mock: sms.IS_MOCK_SMS };
}

// Constant-time string compare that returns false on length mismatch
// instead of throwing (which crypto.timingSafeEqual does).
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Verify a submitted code. Marks consumed on success.
// Returns true on match, false on mismatch/expired/exhausted.
// Uses constant-time comparison to prevent timing-based code extraction.
export function verifyOtp(phone, purpose, code) {
  const row = db.prepare(`
    SELECT id, code, attempts, expires_at, consumed
    FROM otps
    WHERE phone = ? AND purpose = ? AND consumed = 0
    ORDER BY created_at DESC LIMIT 1
  `).get(phone, purpose);

  if (!row) return false;
  if (row.expires_at < Date.now()) return false;
  if (row.attempts >= MAX_ATTEMPTS) return false;

  if (!safeEqual(row.code, String(code || ''))) {
    db.prepare('UPDATE otps SET attempts = attempts + 1 WHERE id = ?').run(row.id);
    return false;
  }
  db.prepare('UPDATE otps SET consumed = 1 WHERE id = ?').run(row.id);
  return true;
}

// Cleanup helper — call from a daily job
export function purgeExpiredOtps() {
  return db.prepare('DELETE FROM otps WHERE expires_at < ? OR consumed = 1').run(Date.now() - 86400_000).changes;
}

// Companion: drop expired admin sessions. Call from same daily job.
export function purgeExpiredAdminSessions() {
  return db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(Date.now()).changes;
}
