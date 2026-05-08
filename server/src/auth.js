// JWT auth helpers
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const SECRET = process.env.JWT_SECRET || 'dev-only-change-me';

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
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
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${base}${suffix}`;
}
