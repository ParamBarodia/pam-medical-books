// Admin endpoints — all require an admin cookie (req.admin set by adminMiddleware).
// Login flow: POST /admin/login/request → SMS OTP → POST /admin/login/verify → Set-Cookie.

import { Router } from 'express';
import db from '../db/index.js';
import * as razorpay from '../services/razorpay.js';
import * as sanity from '../services/sanity.js';
import * as shiprocket from '../services/shiprocket.js';
import * as otpSvc from '../services/otp.js';
import * as notify from '../services/notify.js';
import {
  isAdminPhone, createAdminSession, destroyAdminSession,
  ADMIN_COOKIE_NAME, adminCookieOptions, requireAdmin,
} from '../middleware/admin-auth.js';
import { ORDER_STATUSES, canTransition, allowedNext, isTerminal } from '../lib/order-status.js';
import { fetchBookMetadata } from '../../../scripts/lib/metadata.js';

const r = Router();

// ─── Login: request OTP ───────────────────────────────────────────────────
// Returns the same shape regardless of whether the phone is in the admin
// allowlist. To also defeat *timing* probes (attacker measures response
// latency to learn which phones are real admins), the non-admin path
// sleeps for a fake delay sized to roughly match the SMS-send round-trip.
r.post('/admin/login/request', async (req, res) => {
  const start = Date.now();
  const phone = otpSvc.normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ error: 'invalid phone' });
  if (!isAdminPhone(phone)) {
    // Pretend to issue an OTP. Sleep long enough to mask the timing
    // difference vs the real SMS-send path (~150-300ms typically).
    const fakeDelay = 200 + Math.floor(Math.random() * 120);
    const elapsed = Date.now() - start;
    if (elapsed < fakeDelay) await new Promise((r) => setTimeout(r, fakeDelay - elapsed));
    return res.json({ ok: true, mock: false });
  }
  try {
    const result = await otpSvc.issueOtp(phone, 'admin_login');
    res.json(result);
  } catch (e) {
    if (e.status === 429) return res.status(429).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// ─── Login: verify OTP, set cookie ────────────────────────────────────────
r.post('/admin/login/verify', (req, res) => {
  const phone = otpSvc.normalizePhone(req.body?.phone);
  const code = req.body?.code;
  if (!phone || !code) return res.status(400).json({ error: 'phone + code required' });
  if (!isAdminPhone(phone)) return res.status(401).json({ error: 'not authorised' });
  if (!otpSvc.verifyOtp(phone, 'admin_login', String(code))) {
    return res.status(401).json({ error: 'invalid or expired code' });
  }
  const { token } = createAdminSession(phone);
  res.cookie(ADMIN_COOKIE_NAME, token, adminCookieOptions());
  res.json({ ok: true });
});

// ─── Logout ───────────────────────────────────────────────────────────────
r.post('/admin/logout', (req, res) => {
  if (req.admin?.token) destroyAdminSession(req.admin.token);
  res.clearCookie(ADMIN_COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

// ─── Who am I ─────────────────────────────────────────────────────────────
r.get('/admin/me', requireAdmin, (req, res) => {
  const a = db.prepare('SELECT phone, name FROM admins WHERE phone = ?').get(req.admin.phone);
  res.json(a || { phone: req.admin.phone, name: 'Admin' });
});

// ─── Orders list ──────────────────────────────────────────────────────────
r.get('/admin/orders', requireAdmin, (req, res) => {
  const { status, q, limit = 50, offset = 0 } = req.query;
  const where = []; const params = [];
  if (status) { where.push('o.status = ?'); params.push(status); }
  if (q) {
    const like = `%${q}%`;
    where.push('(o.id LIKE ? OR o.customer_phone LIKE ? OR c.name LIKE ?)');
    params.push(like, like, like);
  }
  const sql = `
    SELECT o.id, o.status, o.total, o.payment_method, o.tracking_url, o.created_at,
           o.customer_phone, c.name AS customer_name
    FROM orders o LEFT JOIN customers c ON o.customer_phone = c.phone
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const total = db.prepare(`SELECT COUNT(*) AS n FROM orders o LEFT JOIN customers c ON o.customer_phone = c.phone ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`).get(...params).n;
  params.push(Math.min(Number(limit) || 50, 200), Number(offset) || 0);
  const orders = db.prepare(sql).all(...params);
  res.json({ orders, total });
});

r.get('/admin/orders/:id', requireAdmin, (req, res) => {
  const order = db.prepare(`
    SELECT o.*, c.name AS customer_name, c.email AS customer_email
    FROM orders o LEFT JOIN customers c ON o.customer_phone = c.phone
    WHERE o.id = ?
  `).get(req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const ret  = db.prepare('SELECT * FROM return_requests WHERE order_id = ? ORDER BY created_at DESC LIMIT 1').get(order.id);
  const cnl  = db.prepare('SELECT * FROM cancellation_requests WHERE order_id = ? ORDER BY created_at DESC LIMIT 1').get(order.id);
  const address = order.address_json ? JSON.parse(order.address_json) : null;
  res.json({ ...order, address, items, address_json: undefined,
             returnRequest: ret || null, cancellationRequest: cnl || null });
});

r.patch('/admin/orders/:id', requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'invalid status' });
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  const previous = order.status;
  if (!canTransition(previous, status)) {
    return res.status(409).json({
      error: `cannot transition from ${previous} to ${status}`,
      from: previous,
      allowed: allowedNext(previous),
    });
  }
  if (previous === status) return res.json({ ok: true, status });
  db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(status, Date.now(), req.params.id);

  // Side effects on key transitions
  if (status === 'shipped' && previous !== 'shipped' && order.tracking_url) {
    notify.notify(order.customer_phone, 'order_shipped', { orderId: order.id, trackingUrl: order.tracking_url }).catch(() => {});
  }
  if (status === 'delivered' && previous !== 'delivered') {
    notify.notify(order.customer_phone, 'order_delivered', { orderId: order.id }).catch(() => {});
  }
  res.json({ ok: true, status });
});

r.post('/admin/orders/:id/refund', requireAdmin, async (req, res, next) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'not found' });
    if (!canTransition(order.status, 'refunded')) {
      return res.status(409).json({
        error: `cannot refund an order in status "${order.status}"`,
        from: order.status,
      });
    }
    if (!order.razorpay_payment_id) return res.status(400).json({ error: 'no payment to refund' });

    const refundAmount = req.body?.amount || order.total;
    const refund = await razorpay.refundPayment(order.razorpay_payment_id, refundAmount);
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    await Promise.all(items.filter((i) => i.book_id).map((i) => sanity.restoreStock(i.book_id, i.qty).catch(() => {})));
    // Restore local stock too
    const inc = db.prepare('UPDATE books SET stock = stock + ? WHERE id = ?');
    for (const it of items) if (it.book_id) inc.run(it.qty, it.book_id);
    db.prepare("UPDATE orders SET status = 'refunded', updated_at = ? WHERE id = ?").run(Date.now(), order.id);

    if (order.shiprocket_order_id) {
      await shiprocket.cancelShiprocketOrder(order.shiprocket_order_id).catch(() => {});
    }
    res.json({ ok: true, refund });
  } catch (err) { next(err); }
});

// ─── Stock ────────────────────────────────────────────────────────────────
r.get('/admin/books', requireAdmin, (req, res) => {
  const { q, low } = req.query;
  const where = [];
  const params = {};
  if (q) { where.push('(LOWER(title) LIKE @q OR LOWER(IFNULL(isbn,\'\')) LIKE @q OR LOWER(author) LIKE @q)'); params.q = `%${String(q).toLowerCase()}%`; }
  if (low === '1') where.push('stock < 5');
  const sql = `SELECT id, title, author, edition, stock, price, mrp, category, isbn, cover_url
               FROM books ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY stock ASC, title ASC LIMIT 500`;
  res.json(db.prepare(sql).all(params));
});

r.patch('/admin/books/:id/stock', requireAdmin, async (req, res) => {
  const id = req.params.id;
  const { delta, set } = req.body || {};
  const book = db.prepare('SELECT id, stock, title FROM books WHERE id = ?').get(id);
  if (!book) return res.status(404).json({ error: 'book not found' });

  let newStock;
  if (typeof set === 'number' && Number.isInteger(set) && set >= 0) newStock = set;
  else if (typeof delta === 'number' && Number.isInteger(delta)) newStock = Math.max(book.stock + delta, 0);
  else return res.status(400).json({ error: 'pass {set: int} or {delta: int}' });

  db.prepare('UPDATE books SET stock = ? WHERE id = ?').run(newStock, id);

  // If we just went 0 → positive, fire restock-alert SMS to anyone waiting
  if (book.stock === 0 && newStock > 0) {
    const waiters = db.prepare('SELECT phone FROM notify_requests WHERE book_id = ? AND notified_at IS NULL').all(id);
    for (const w of waiters) {
      notify.notify(w.phone, 'back_in_stock',
        { title: book.title.slice(0, 60), url: `${process.env.SITE_URL || ''}/?book=${id}` })
        .catch(() => {});
    }
    db.prepare('UPDATE notify_requests SET notified_at = ? WHERE book_id = ? AND notified_at IS NULL')
      .run(Date.now(), id);
  }
  res.json({ ok: true, stock: newStock, restockNotified: book.stock === 0 && newStock > 0 });
});

// ─── Catalog: ISBN paste → fetch metadata for preview ──────────────────────
r.post('/admin/catalog/isbn-preview', requireAdmin, async (req, res) => {
  const isbn = String(req.body?.isbn || '').replace(/[^\dXx]/g, '');
  if (isbn.length !== 10 && isbn.length !== 13) return res.status(400).json({ error: 'invalid ISBN' });
  const meta = await fetchBookMetadata(isbn);
  if (!meta) return res.status(404).json({ error: 'no metadata found for ISBN' });
  res.json({
    isbn,
    title: meta.title,
    author: meta.authors?.[0] || '',
    publisher: meta.publisher,
    pages: meta.pageCount,
    description: meta.description?.replace(/<[^>]+>/g, '').trim().slice(0, 1000),
    coverUrl: meta.coverUrl,
    source: meta.source,
  });
});

// ─── Catalog: create or update a book ──────────────────────────────────────
r.post('/admin/catalog/book', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.id || !b.title || !b.author) return res.status(400).json({ error: 'id, title, author required' });
  const numFields = { mrp: b.mrp, price: b.price, stock: b.stock };
  for (const [k, v] of Object.entries(numFields)) {
    if (!Number.isInteger(Number(v)) || Number(v) < 0) return res.status(400).json({ error: `${k} must be a non-negative integer` });
  }
  db.prepare(`
    INSERT INTO books
      (id, title, author, edition, mrp, price, rating, reviews,
       cover_bg, cover_accent, cover_style, tag, category, stock,
       publisher, isbn, pages, language, description, cover_url, shelf)
    VALUES
      (@id, @title, @author, @edition, @mrp, @price, 0, 0,
       @cover_bg, @cover_accent, @cover_style, @tag, @category, @stock,
       @publisher, @isbn, @pages, @language, @description, @cover_url, @shelf)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title, author=excluded.author, edition=excluded.edition,
      mrp=excluded.mrp, price=excluded.price,
      tag=excluded.tag, category=excluded.category, stock=excluded.stock,
      publisher=excluded.publisher, isbn=excluded.isbn, pages=excluded.pages,
      language=excluded.language, description=excluded.description,
      cover_url=excluded.cover_url, shelf=excluded.shelf
  `).run({
    id: b.id, title: b.title.trim(), author: b.author.trim(),
    edition: b.edition || null,
    mrp: Number(b.mrp), price: Number(b.price), stock: Number(b.stock),
    cover_bg: b.cover_bg || '#7a1e2b',
    cover_accent: b.cover_accent || '#f0d8a0',
    cover_style: b.cover_style || 'classic',
    tag: b.tag || null,
    category: b.category || 'MBBS',
    publisher: b.publisher || null,
    isbn: b.isbn || null,
    pages: b.pages ? Number(b.pages) : null,
    language: b.language || 'English',
    description: b.description || null,
    cover_url: b.cover_url || null,
    shelf: b.shelf || 'featured',
  });
  res.status(201).json({ ok: true, id: b.id });
});

r.delete('/admin/catalog/book/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── Returns / cancellations queue ─────────────────────────────────────────
r.get('/admin/requests', requireAdmin, (req, res) => {
  const returns = db.prepare(`
    SELECT rr.*, o.customer_phone, c.name AS customer_name
    FROM return_requests rr
    JOIN orders o ON o.id = rr.order_id
    LEFT JOIN customers c ON c.phone = o.customer_phone
    WHERE rr.status = 'pending'
    ORDER BY rr.created_at ASC
  `).all();
  const cancellations = db.prepare(`
    SELECT cr.*, o.customer_phone, c.name AS customer_name
    FROM cancellation_requests cr
    JOIN orders o ON o.id = cr.order_id
    LEFT JOIN customers c ON c.phone = o.customer_phone
    WHERE cr.status = 'pending'
    ORDER BY cr.created_at ASC
  `).all();
  res.json({ returns, cancellations });
});

async function decideRequest({ table, statusCol, id, decision, note, notifyTemplate }) {
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  if (!row) return { error: 'not found', code: 404 };
  if (row.status !== 'pending') return { error: 'already decided', code: 409 };
  if (!['approved', 'denied'].includes(decision)) return { error: 'invalid decision', code: 400 };
  db.prepare(`UPDATE ${table} SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?`)
    .run(decision, note || null, Date.now(), id);
  if (decision === 'approved') {
    const order = db.prepare('SELECT customer_phone, id FROM orders WHERE id = ?').get(row.order_id);
    if (order) {
      notify.notify(order.customer_phone, notifyTemplate, { orderId: order.id }).catch(() => {});
    }
  }
  return { ok: true, status: decision };
}

r.patch('/admin/requests/return/:id', requireAdmin, async (req, res) => {
  const out = await decideRequest({
    table: 'return_requests', statusCol: 'status',
    id: req.params.id, decision: req.body?.decision, note: req.body?.note,
    notifyTemplate: 'return_approved',
  });
  if (out.error) return res.status(out.code).json({ error: out.error });
  res.json(out);
});

r.patch('/admin/requests/cancellation/:id', requireAdmin, async (req, res) => {
  const out = await decideRequest({
    table: 'cancellation_requests', statusCol: 'status',
    id: req.params.id, decision: req.body?.decision, note: req.body?.note,
    notifyTemplate: 'cancellation_approved',
  });
  if (out.error) return res.status(out.code).json({ error: out.error });
  // If approved, also flip the order to cancelled
  if (out.ok && req.body?.decision === 'approved') {
    const cnl = db.prepare('SELECT order_id FROM cancellation_requests WHERE id = ?').get(req.params.id);
    if (cnl) db.prepare("UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?")
                .run(Date.now(), cnl.order_id);
  }
  res.json(out);
});

export default r;
