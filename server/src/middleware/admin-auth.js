// Admin session middleware — cookie-based, 30-day TTL, allowlisted by ADMIN_PHONES env.
import crypto from 'node:crypto';
import db from '../db/index.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const COOKIE_NAME = 'pmb_admin';

export function isAdminPhone(phone) {
  const allowed = (process.env.ADMIN_PHONES || '').split(',').map((s) => s.trim()).filter(Boolean);
  return allowed.includes(phone);
}

export function createAdminSession(phone) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  db.prepare('INSERT INTO admin_sessions (token, phone, expires_at) VALUES (?, ?, ?)').run(token, phone, expiresAt);
  // Make sure the admin row exists (so /admin/me has a name to show)
  db.prepare(`INSERT OR IGNORE INTO admins (phone, name) VALUES (?, ?)`).run(phone, 'Admin');
  return { token, expiresAt };
}

export function destroyAdminSession(token) {
  if (token) db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
}

// Parse cookies the simple way; we only need ours.
function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
    path: '/',
  };
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;

// Attaches req.admin if a valid session cookie is present.
export function adminMiddleware(req, _res, next) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return next();
  const session = db.prepare('SELECT phone, expires_at FROM admin_sessions WHERE token = ?').get(token);
  if (!session) return next();
  if (session.expires_at < Date.now()) {
    db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
    return next();
  }
  if (!isAdminPhone(session.phone)) return next();    // phone removed from allowlist
  req.admin = { phone: session.phone, token };
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.admin) return res.status(401).json({ error: 'admin auth required' });
  next();
}
