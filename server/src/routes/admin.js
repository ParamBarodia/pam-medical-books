// Admin endpoints — for the client's /admin/orders dashboard.
// All require role='admin'.

import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../auth.js';
import * as razorpay from '../services/razorpay.js';
import * as sanity from '../services/sanity.js';
import * as shiprocket from '../services/shiprocket.js';
import * as email from '../services/email.js';

const r = Router();

function requireAdmin(req, res, next) {
  const u = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.uid);
  if (u?.role !== 'admin') return res.status(403).json({ error: 'admin only' });
  next();
}

// ─── GET /admin/orders ────────────────────────────────────────────────────
r.get('/admin/orders', requireAuth, requireAdmin, (req, res) => {
  const { status, q, limit = 50, offset = 0 } = req.query;
  const where = []; const params = [];
  if (status) { where.push('o.status = ?'); params.push(status); }
  if (q) {
    where.push("(o.id LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.name LIKE ?)");
    const qLike = `%${q}%`; params.push(qLike, qLike, qLike, qLike);
  }
  const sql = `
    SELECT o.id, o.status, o.total, o.payment_method, o.tracking_url, o.created_at,
           u.name AS customer_name, u.email AS customer_email
    FROM orders o JOIN users u ON o.user_id = u.id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(Math.min(Number(limit) || 50, 200), Number(offset) || 0);
  const rows = db.prepare(sql).all(...params);
  const totalCount = db.prepare(`SELECT COUNT(*) AS n FROM orders o JOIN users u ON o.user_id = u.id ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`).get(...params.slice(0, params.length - 2)).n;
  res.json({ orders: rows, total: totalCount });
});

// ─── GET /admin/orders/:id ────────────────────────────────────────────────
r.get('/admin/orders/:id', requireAuth, requireAdmin, (req, res) => {
  const order = db.prepare(`
    SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
    FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?
  `).get(req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const address = typeof order.address_json === 'string' ? JSON.parse(order.address_json) : order.address_json;
  res.json({ ...order, address, items, address_json: undefined });
});

// ─── PATCH /admin/orders/:id  { status }  ─────────────────────────────────
r.patch('/admin/orders/:id', requireAuth, requireAdmin, (req, res) => {
  const allowed = ['placed', 'paid', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'];
  const { status } = req.body || {};
  if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid status' });
  const result = db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
    .run(status, Date.now(), req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true, status });
});

// ─── POST /admin/orders/:id/refund  { amount? } ────────────────────────────
r.post('/admin/orders/:id/refund', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'not found' });
    if (order.status === 'refunded') return res.status(400).json({ error: 'already refunded' });
    if (!order.razorpay_payment_id) return res.status(400).json({ error: 'no payment to refund' });

    const refundAmount = req.body?.amount || order.total;
    const refund = await razorpay.refundPayment(order.razorpay_payment_id, refundAmount);

    // Restore stock
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    await Promise.all(items.filter((i) => i.book_id).map((i) => sanity.restoreStock(i.book_id, i.qty).catch(() => {})));

    db.prepare("UPDATE orders SET status = 'refunded', updated_at = ? WHERE id = ?").run(Date.now(), order.id);

    // Cancel Shiprocket order if not yet picked up
    if (order.shiprocket_order_id) {
      await shiprocket.cancelShiprocketOrder(order.shiprocket_order_id).catch(() => {});
    }

    res.json({ ok: true, refund });
  } catch (err) { next(err); }
});

// ─── POST /admin/jobs/low-stock-digest ─────────────────────────────────────
// Run daily via cron (Render cron job or GitHub Actions).
// Pulls low-stock books from Sanity, emails the admin.
r.post('/admin/jobs/low-stock-digest', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const books = await sanity.fetchLowStock(5);
    if (books.length) {
      await email.sendLowStockDigest(books);
    }
    res.json({ ok: true, count: books.length });
  } catch (err) { next(err); }
});

export default r;
