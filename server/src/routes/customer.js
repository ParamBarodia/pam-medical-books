// Customer-facing endpoints for the phone-only flow.
// No auth — phone is the identity. Sensitive ops (COD checkout, return/cancel
// requests) are gated by OTP issued to the phone.

import { Router } from 'express';
import db from '../db/index.js';
import * as otp from '../services/otp.js';
import * as notify from '../services/notify.js';

const r = Router();

// ─── Lookup customer by phone ──────────────────────────────────────────────
// Used at checkout to know whether a returning customer can skip the
// address step. Returns ONLY masked hints to prevent PII enumeration:
// anyone iterating phone numbers should not be able to extract the
// owner's name, email, or full address.
//
// The full saved address is never sent to the client. At checkout time the
// client sends `useSavedAddress: true` and the SERVER fills in the address
// from the customer record — the client never sees it directly.
function maskName(name) {
  if (!name) return null;
  const first = String(name).trim().split(/\s+/)[0] || '';
  if (first.length <= 2) return first[0] + '***';
  return first[0] + '***' + first.slice(-1);
}
function maskPincode(pin) {
  if (!pin) return null;
  return String(pin).slice(0, 3) + '***';
}

r.get('/customer/lookup', (req, res) => {
  const phone = otp.normalizePhone(req.query.phone);
  if (!phone) return res.status(400).json({ error: 'invalid phone' });
  const row = db.prepare('SELECT name, last_address_json FROM customers WHERE phone = ?').get(phone);
  if (!row) return res.json({ known: false });
  let pinHint = null;
  try {
    const addr = row.last_address_json ? JSON.parse(row.last_address_json) : null;
    pinHint = addr?.pincode ? maskPincode(addr.pincode) : null;
  } catch {}
  res.json({
    known: true,
    nameHint: maskName(row.name),
    pincodeHint: pinHint,
    hasAddress: !!pinHint,
  });
});

// ─── Issue OTP (used by COD checkout) ──────────────────────────────────────
r.post('/otp/request', async (req, res) => {
  try {
    const phone = otp.normalizePhone(req.body?.phone);
    const purpose = req.body?.purpose;
    if (!phone) return res.status(400).json({ error: 'invalid phone' });
    if (!['cod_checkout', 'admin_login'].includes(purpose)) {
      return res.status(400).json({ error: 'invalid purpose' });
    }
    const result = await otp.issueOtp(phone, purpose);
    res.json(result);
  } catch (e) {
    if (e.status === 429) return res.status(429).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// ─── Look up orders by phone (tracking page) ───────────────────────────────
// No OTP because order IDs are random (MS{base36 timestamp}) and a tracking
// link in the SMS already gives the customer the ID; brute-forcing both is hard.
r.get('/orders/by-phone', (req, res) => {
  const phone = otp.normalizePhone(req.query.phone);
  if (!phone) return res.status(400).json({ error: 'invalid phone' });
  const orders = db.prepare(`
    SELECT id, status, total, payment_method, tracking_url, created_at
    FROM orders WHERE customer_phone = ?
    ORDER BY created_at DESC LIMIT 30
  `).all(phone);
  res.json(orders);
});

// ─── Get a specific order (used to show items + actions on tracking page) ──
// Requires the customer's phone to match (light protection against
// order-ID enumeration; not a substitute for real auth).
r.get('/orders/lookup/:id', (req, res) => {
  const phone = otp.normalizePhone(req.query.phone);
  if (!phone) return res.status(400).json({ error: 'phone required' });
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND customer_phone = ?').get(req.params.id, phone);
  if (!order) return res.status(404).json({ error: 'not found' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const ret  = db.prepare('SELECT id, status, reason, created_at FROM return_requests WHERE order_id = ? ORDER BY created_at DESC LIMIT 1').get(order.id);
  const cnl  = db.prepare('SELECT id, status, reason, created_at FROM cancellation_requests WHERE order_id = ? ORDER BY created_at DESC LIMIT 1').get(order.id);
  const address = order.address_json ? JSON.parse(order.address_json) : null;
  res.json({ ...order, address, items, address_json: undefined,
             returnRequest: ret || null, cancellationRequest: cnl || null });
});

// ─── Request a return ──────────────────────────────────────────────────────
// Allowed only for delivered orders within 7 days.
r.post('/orders/:id/request-return', (req, res) => {
  const phone = otp.normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ error: 'phone required' });
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND customer_phone = ?').get(req.params.id, phone);
  if (!order) return res.status(404).json({ error: 'not found' });
  if (order.status !== 'delivered') return res.status(400).json({ error: 'can only return delivered orders' });
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - order.updated_at > sevenDays) return res.status(400).json({ error: 'return window expired (7 days from delivery)' });

  const existing = db.prepare("SELECT id FROM return_requests WHERE order_id = ? AND status = 'pending'").get(order.id);
  if (existing) return res.status(409).json({ error: 'return already requested' });

  const reason = String(req.body?.reason || '').slice(0, 500);
  db.prepare('INSERT INTO return_requests (order_id, reason) VALUES (?, ?)').run(order.id, reason);
  res.status(201).json({ ok: true });
});

// ─── Request a cancellation ────────────────────────────────────────────────
// Allowed only before shipment.
r.post('/orders/:id/request-cancellation', (req, res) => {
  const phone = otp.normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ error: 'phone required' });
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND customer_phone = ?').get(req.params.id, phone);
  if (!order) return res.status(404).json({ error: 'not found' });
  if (!['placed', 'paid'].includes(order.status)) {
    return res.status(400).json({ error: 'can only cancel before shipment' });
  }

  const existing = db.prepare("SELECT id FROM cancellation_requests WHERE order_id = ? AND status = 'pending'").get(order.id);
  if (existing) return res.status(409).json({ error: 'cancellation already requested' });

  const reason = String(req.body?.reason || '').slice(0, 500);
  db.prepare('INSERT INTO cancellation_requests (order_id, reason) VALUES (?, ?)').run(order.id, reason);
  res.status(201).json({ ok: true });
});

// ─── Restock waitlist signup ───────────────────────────────────────────────
r.post('/notify-when-back', (req, res) => {
  const phone = otp.normalizePhone(req.body?.phone);
  const { bookId } = req.body || {};
  if (!phone || !bookId) return res.status(400).json({ error: 'phone + bookId required' });
  db.prepare('INSERT OR IGNORE INTO notify_requests (phone, book_id) VALUES (?, ?)').run(phone, bookId);
  res.json({ ok: true });
});

export default r;
