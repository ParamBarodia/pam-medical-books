// JWT auth helpers
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// JWT_SECRET is mandatory in production. In NODE_ENV=development we generate
// a random per-boot secret so devs can clone-and-run with no setup; this means
// dev sessions don't survive a server restart, which is the right tradeoff.
const SECRET = (() => {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length >= 32 && !/change[_-]?me/i.test(fromEnv)) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production and must be at least 32 chars (and not the placeholder "change_me…")');
  }
  console.warn('[auth] JWT_SECRET missing or weak — generating ephemeral dev secret. Set JWT_SECRET in .env to make sessions persist.');
  return crypto.randomBytes(48).toString('hex');
})();

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 12);
}
export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}
export function signToken(user) {
  return jwt.sign({ uid: user.id, email: user.email }, SECRET, { expiresIn: '30d' });
}
export function verifyToken(token) {
  try { return jwt.verify(token, SECRET); } catch { return null; }
}

// Express middleware — sets req.user if a valid Bearer token is present.
// Does NOT block; routes that require auth check req.user themselves.
export function authMiddleware(req, _res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return next();
  const payload = verifyToken(h.slice(7));
  if (payload) req.user = payload;
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'auth required' });
  next();
}

export function generateReferralCode(name) {
  const base = (name || 'med').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 8) || 'MED';
  // 4 random base32 chars (~1M space) — unguessable, fits human-typeable budget
  const suffix = crypto.randomBytes(3).readUIntBE(0, 3).toString(32).slice(-4).toUpperCase();
  return `${base}${suffix}`;
}
