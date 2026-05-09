// Orders + checkout — phone-only flow.
//
// Customer sends: phone, name, address, items[], paymentMethod, otp? (cod only).
// Server: validates, server-prices the items (never trust client), creates the
// DB order, calls Razorpay (skip for COD), returns IDs for the client to open
// checkout JS. After payment, /verify or the webhook flips status to paid.

import { Router } from 'express';
import db from '../db/index.js';
import * as razorpay from '../services/razorpay.js';
import * as shiprocket from '../services/shiprocket.js';
import * as sanity from '../services/sanity.js';
import * as otp from '../services/otp.js';
import * as notify from '../services/notify.js';

const r = Router();

function newOrderId() {
  return 'PMB' + Date.now().toString(36).toUpperCase();
}

// Look up each item from the DB so prices are authoritative server-side.
function priceItems(items) {
  const priced = [];
  for (const it of items) {
    if (!it?.bookId) throw new Error('each item needs bookId');
    const qty = Number(it.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) throw new Error(`bad qty for ${it.bookId}`);
    if (it.isBundle) {
      const b = db.prepare('SELECT id, title, price, mrp FROM bundles WHERE id = ?').get(it.bookId);
      if (!b) throw new Error(`bundle ${it.bookId} not found`);
      priced.push({ book_id: null, bundle_id: b.id, title: b.title, qty, unit_price: b.price, unit_mrp: b.mrp });
    } else {
      const b = db.prepare('SELECT id, title, price, mrp, stock FROM books WHERE id = ?').get(it.bookId);
      if (!b) throw new Error(`book ${it.bookId} not found`);
      if (b.stock < qty) throw new Error(`only ${b.stock} of "${b.title.slice(0, 40)}" in stock`);
      priced.push({ book_id: b.id, bundle_id: null, title: b.title, qty, unit_price: b.price, unit_mrp: b.mrp });
    }
  }
  return priced;
}

function calcTotals(priced) {
  const subtotal = priced.reduce((s, i) => s + i.unit_price * i.qty, 0);
  const saved    = priced.reduce((s, i) => s + (i.unit_mrp - i.unit_price) * i.qty, 0);
  const tier     = subtotal >= 10000 ? 200 : subtotal >= 5000 ? 100 : 0;
  const shipping = subtotal >= 999 ? 0 : 49;
  const total    = subtotal - tier + shipping;
  return { subtotal, saved, tier, shipping, total };
}

function validateAddress(a) {
  if (!a?.line1 || !a.city || !a.state) return 'incomplete address (line1, city, state required)';
  if (!/^\d{6}$/.test(a.pincode || '')) return 'invalid pincode (6 digits)';
  return null;
}

// ─── POST /orders/checkout ─────────────────────────────────────────────────
r.post('/orders/checkout', async (req, res, next) => {
  try {
    const { phone: rawPhone, name: rawName, email, address: clientAddress,
            items, paymentMethod = 'upi', otp: submittedOtp,
            useSavedAddress } = req.body || {};

    const phone = otp.normalizePhone(rawPhone);
    if (!phone) return res.status(400).json({ error: 'invalid phone' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items required' });

    // Address resolution: if useSavedAddress is true, server pulls from the
    // customer record. This way the address is never sent to the client side
    // (avoids PII enumeration attack via the lookup endpoint).
    let address = clientAddress;
    let name = rawName;
    if (useSavedAddress) {
      const saved = db.prepare('SELECT name, last_address_json FROM customers WHERE phone = ?').get(phone);
      if (!saved?.last_address_json) {
        return res.status(400).json({ error: 'no saved address on file for this number' });
      }
      try { address = JSON.parse(saved.last_address_json); } catch { return res.status(400).json({ error: 'saved address corrupt' }); }
      name = name || saved.name;
    }

    if (!name || name.length < 2) return res.status(400).json({ error: 'name required' });
    const addrErr = validateAddress(address);
    if (addrErr) return res.status(400).json({ error: addrErr });

    // COD orders MUST present a verified OTP
    if (paymentMethod === 'cod') {
      if (!submittedOtp) return res.status(400).json({ error: 'OTP required for COD orders' });
      if (!otp.verifyOtp(phone, 'cod_checkout', String(submittedOtp))) {
        return res.status(401).json({ error: 'invalid or expired OTP' });
      }
    }

    let priced;
    try { priced = priceItems(items); }
    catch (e) { return res.status(400).json({ error: e.message }); }

    const totals = calcTotals(priced);
    if (paymentMethod === 'cod') totals.total += 49;     // COD handling fee

    const orderId = newOrderId();

    // Persist customer for prefill on next visit
    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO customers (phone, name, email, last_address_json)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(phone) DO UPDATE SET
          name = excluded.name,
          email = COALESCE(excluded.email, customers.email),
          last_address_json = excluded.last_address_json,
          updated_at = strftime('%s','now') * 1000
      `).run(phone, name, email || null, JSON.stringify(address));

      db.prepare(`
        INSERT INTO orders (id, customer_phone, status, subtotal, saved, tier_discount,
                            shipping, total, payment_method, address_json)
        VALUES (?, ?, 'placed', ?, ?, ?, ?, ?, ?, ?)
      `).run(orderId, phone, totals.subtotal, totals.saved, totals.tier,
             totals.shipping, totals.total, paymentMethod, JSON.stringify(address));

      const ins = db.prepare(`
        INSERT INTO order_items (order_id, book_id, bundle_id, title, qty, unit_price, unit_mrp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const p of priced) ins.run(orderId, p.book_id, p.bundle_id, p.title, p.qty, p.unit_price, p.unit_mrp);
    });
    tx();

    // COD: no Razorpay order needed; SMS the customer + return immediately.
    if (paymentMethod === 'cod') {
      // Decrement stock now (real cash collected on delivery; refund on cancel)
      decrementLocalStock(orderId);
      kickoffPostOrderSideEffects(orderId).catch((e) => console.error('[post-order]', e));
      await notify.notify(phone, 'order_placed', { orderId, total: totals.total })
                  .catch((e) => console.error('[notify]', e));
      return res.status(201).json({ orderId, paymentMethod: 'cod', amount: totals.total, totals, status: 'placed' });
    }

    // Online payment: create Razorpay order
    const rzpOrder = await razorpay.createOrder({
      amount: totals.total,
      receipt: orderId,
      notes: { phone, order_id: orderId },
    });
    db.prepare('UPDATE orders SET razorpay_order_id = ? WHERE id = ?').run(rzpOrder.id, orderId);

    res.status(201).json({
      orderId,
      razorpayOrderId: rzpOrder.id,
      razorpayKeyId: razorpay.PUBLIC_KEY_ID,
      amount: totals.total,
      currency: 'INR',
      totals,
      mockMode: razorpay.IS_MOCK_RZP,
      paymentMethod,
    });
  } catch (err) { next(err); }
});

// ─── POST /orders/:id/verify ──────────────────────────────────────────────
r.post('/orders/:id/verify', async (req, res, next) => {
  try {
    const { phone: rawPhone, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    const phone = otp.normalizePhone(rawPhone);
    if (!phone) return res.status(400).json({ error: 'phone required' });

    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND customer_phone = ?').get(req.params.id, phone);
    if (!order) return res.status(404).json({ error: 'order not found' });

    if (order.payment_method === 'cod') {
      return res.status(400).json({ error: 'COD orders are not verified online' });
    }

    if (!razorpay.IS_MOCK_RZP) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'razorpay_order_id, razorpay_payment_id, razorpay_signature required' });
      }
      if (razorpay_order_id !== order.razorpay_order_id) {
        return res.status(400).json({ error: 'order id mismatch' });
      }
      if (!razorpay.verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })) {
        return res.status(400).json({ error: 'invalid signature' });
      }
    }

    await markPaidAndFulfill(order, razorpay_payment_id || ('pay_test_' + Date.now().toString(36)));
    res.json({ ok: true, status: 'paid' });
  } catch (err) { next(err); }
});

// ─── Internal: decrement local stock for each book in an order ─────────────
function decrementLocalStock(orderId) {
  const items = db.prepare('SELECT book_id, qty FROM order_items WHERE order_id = ?').all(orderId);
  const dec = db.prepare('UPDATE books SET stock = MAX(stock - ?, 0) WHERE id = ?');
  for (const it of items) if (it.book_id) dec.run(it.qty, it.book_id);
}

// ─── Internal: post-order side effects (Shiprocket + Sanity stock) ─────────
async function kickoffPostOrderSideEffects(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return;
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  const address = JSON.parse(order.address_json);

  // Sanity stock decrement (best-effort)
  await Promise.all(items
    .filter((i) => i.book_id)
    .map((i) => sanity.decrementStock(i.book_id, i.qty).catch(() => {})));

  // Shiprocket order
  try {
    const ship = await shiprocket.createShiprocketOrder({ order, items, address });
    db.prepare(`UPDATE orders SET shiprocket_order_id = ?, shiprocket_shipment_id = ?, tracking_url = ? WHERE id = ?`)
      .run(ship.order_id, ship.shipment_id, ship.tracking_url, orderId);
  } catch (e) { console.error('[shiprocket]', e.message); }
}

// Mark order paid → trigger post-payment chain. Idempotent (gated by status).
async function markPaidAndFulfill(order, paymentId) {
  const flip = db.prepare(
    `UPDATE orders SET status = 'paid', razorpay_payment_id = ?, updated_at = ? WHERE id = ? AND status = 'placed'`
  ).run(paymentId, Date.now(), order.id);

  // If we didn't actually flip the row, another path already paid this order.
  // Skip side-effects to avoid double-shipment / double-notify.
  if (!flip.changes) return;

  decrementLocalStock(order.id);
  await kickoffPostOrderSideEffects(order.id);

  await notify.notify(order.customer_phone, 'payment_received',
    { orderId: order.id, total: order.total })
    .catch((e) => console.error('[notify]', e));
}

export { markPaidAndFulfill };

// ─── Cleanup of legacy authenticated endpoints ─────────────────────────────
// /orders (list mine) → moved to /orders/by-phone in customer.js
// /orders/:id (mine)  → moved to /orders/lookup/:id in customer.js (phone-gated)

export default r;
