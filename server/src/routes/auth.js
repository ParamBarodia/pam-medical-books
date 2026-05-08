// Auth routes — signup, login, me
import { Router } from 'express';
import db from '../db/index.js';
import { hashPassword, verifyPassword, signToken, generateReferralCode, requireAuth } from '../auth.js';

const r = Router();

// POST /api/auth/signup  { email, password, name, phone?, referredBy? }
r.post('/signup', (req, res) => {
  const { email, password, name, phone, referredBy } = req.body || {};
  if (!email || !password || !name) return res.status(400).json({ error: 'email, password, name required' });
  if (password.length < 6) return res.status(400).json({ error: 'password min 6 chars' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'email already registered' });

  // Validate referral code if given
  let referrer = null;
  if (referredBy) {
    referrer = db.prepare('SELECT id, referral_code FROM users WHERE referral_code = ?').get(referredBy);
  }

  let code;
  for (let i = 0; i < 5; i++) {
    code = generateReferralCode(name);
    if (!db.prepare('SELECT id FROM users WHERE referral_code = ?').get(code)) break;
  }

  const result = db.prepare(`
    INSERT INTO users (email, password_hash, name, phone, referral_code, referred_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(email.toLowerCase(), hashPassword(password), name, phone || null, code, referrer?.referral_code || null);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

  // Track referral event (will be credited when first order ≥ ₹999 ships)
  if (referrer) {
    db.prepare('INSERT INTO referral_events (referrer_user_id, referred_user_id) VALUES (?, ?)')
      .run(referrer.id, user.id);
  }

  res.status(201).json({
    token: signToken(user),
    user: publicUser(user),
  });
});

// POST /api/auth/login  { email, password }
r.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

// GET /api/auth/me
r.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.uid);
  if (!user) return res.status(404).json({ error: 'user gone' });
  res.json({ user: publicUser(user) });
});

function publicUser(u) {
  return {
    id: u.id, email: u.email, name: u.name, phone: u.phone,
    referralCode: u.referral_code, walletCredit: u.wallet_credit,
    createdAt: u.created_at,
  };
}

export default r;
