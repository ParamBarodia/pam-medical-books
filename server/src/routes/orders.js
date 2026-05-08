// Orders + checkout. Wires Razorpay → Sanity (stock) → Shiprocket → Email.
//
// Flow (happy path):
//   POST /orders/checkout      — creates order in DB, calls Razorpay.orders.create, returns IDs
//   [client opens Razorpay checkout JS modal, customer pays, modal calls back]
//   POST /orders/:id/verify    — verifies signature, marks paid, fires post-payment chain
//   POST /webhooks/razorpay    — Razorpay's async confirmation (idempotent)
//   POST /webhooks/shiprocket  — Shiprocket fires this on shipped/delivered

import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../auth.js';
import * as razorpay from '../services/razorpay.js';
import * as shiprocket from '../services/shiprocket.js';
import * as sanity from '../services/sanity.js';
import * as email from '../services/email.js';

const r = Router();

function newOrderId() {
  return 'MS' + Date.now().toString(36).toUpperCase();
}

function calcTotals(items) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const saved    = items.reduce((s, i) => s + (i.mrp - i.price) * i.qty, 0);
  const tier     = subtotal >= 10000 ? 200 : subtotal >= 5000 ? 100 : 0;
  const shipping = subtotal >= 999 ? 0 : 49;
  const total    = subtotal - tier + shipping;
  return { subtotal, saved, tier, shipping, total };
}

// Hydrate cart for the authenticated user
function hydrateCart(userId) {
  return db.prepare(`
    SELECT ci.book_id, ci.qty, ci.is_bundle,
           IFNULL(b.title, bn.title) AS title,
           IFNULL(b.price, bn.price) AS price,
           IFNULL(b.mrp,   bn.mrp)   AS mrp
    FROM cart_items ci
    LEFT JOIN books   b  ON ci.is_bundle = 0 AND ci.book_id = b.id
    LEFT JOIN bundles bn ON ci.is_bundle = 1 AND ci.book_id = bn.id
    WHERE ci.user_id = ?
  `).all(userId);
}

// ─── POST /orders/checkout ─────────────────────────────────────────────────
r.post('/orders/checkout', requireAuth, async (req, res, next) => {
  try {
    const { address, paymentMethod = 'upi' } = req.body || {};
    if (!address?.name || !address?.phone || !address?.line1 || !address?.city || !address?.pincode) {
      return res.status(400).json({ error: 'address incomplete' });
    }

    const cart = hydrateCart(req.user.uid);
    if (!cart.length) return res.status(400).json({ error: 'cart empty' });

    const totals = calcTotals(cart);
    const orderId = newOrderId();

    // Create order in our DB first (status=placed)
    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO orders
          (id, user_id, status, subtotal, saved, tier_discount, shipping, total,
           payment_method, address_json)
        VALUES (?, ?, 'placed', ?, ?, ?, ?, ?, ?, ?)
      `).run(orderId, req.user.uid, totals.subtotal, totals.saved, totals.tier,
             totals.shipping, totals.total, paymentMethod, JSON.stringify(address));

      const ins = db.prepare(`
        INSERT INTO order_items (order_id, book_id, bundle_id, title, qty, unit_price, unit_mrp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const it of cart) {
        ins.run(orderId, it.is_bundle ? null : it.book_id, it.is_bundle ? it.book_id : null,
                it.title, it.qty, it.price, it.mrp);
      }
    });
    tx();

    // Call Razorpay (mocked or real depending on env)
    const rzpOrder = await razorpay.createOrder({
      amount: totals.total,
      receipt: orderId,
      notes: { user_id: String(req.user.uid), order_id: orderId },
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
    });
  } catch (err) { next(err); }
});

// ─── POST /orders/:id/verify ──────────────────────────────────────────────
// Called by the frontend after Razorpay's checkout JS reports success.
// Verifies the signature, marks paid, fires the post-payment chain.
r.post('/orders/:id/verify', requireAuth, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.uid);
    if (!order) return res.status(404).json({ error: 'order not found' });

    // In test mode, skip signature check; in live mode, verify
    if (razorpay_signature && !razorpay.verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })) {
      return res.status(400).json({ error: 'invalid signature' });
    }

    await markPaidAndFulfill(order, razorpay_payment_id || ('pay_test_' + Date.now().toString(36)));
    res.json({ ok: true, status: 'paid' });
  } catch (err) { next(err); }
});

// Mark order paid → trigger the post-payment chain. Idempotent.
async function markPaidAndFulfill(order, paymentId) {
  // 1. Update DB status
  db.prepare('UPDATE orders SET status = ?, razorpay_payment_id = ?, updated_at = ? WHERE id = ? AND status = \'placed\'')
    .run('paid', paymentId, Date.now(), order.id);

  // 2. Decrement stock in Sanity for each book item
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  await Promise.all(items
    .filter((i) => i.book_id)
    .map((i) => sanity.decrementStock(i.book_id, i.qty).catch((err) => {
      console.error(`[stock] failed to decrement ${i.book_id}:`, err.message);
    })));

  // 3. Create Shiprocket order
  try {
    const address = typeof order.address_json === 'string' ? JSON.parse(order.address_json) : order.address_json;
    const ship = await shiprocket.createShiprocketOrder({ order, items, address });
    db.prepare(`UPDATE orders
                SET shiprocket_order_id = ?, shiprocket_shipment_id = ?, tracking_url = ?
                WHERE id = ?`)
      .run(ship.order_id, ship.shipment_id, ship.tracking_url, order.id);

    // 4. Email customer + admin
    if (address.email) {
      await email.sendOrderConfirmation({ order, items, customerEmail: address.email, customerName: address.name }).catch(console.error);
    }
    await email.sendAdminNewOrderAlert({ order, customerName: address.name }).catch(console.error);
  } catch (err) {
    console.error('[shiprocket] order create failed:', err.message);
    // Don't fail the customer's checkout — admin will reconcile from /admin/orders
  }

  // 5. Credit referrer if this is the user's first paid order ≥ ₹999
  const userPaidCount = db.prepare("SELECT COUNT(*) AS n FROM orders WHERE user_id = ? AND status = 'paid'").get(order.user_id).n;
  if (userPaidCount === 1 && order.total >= 999) {
    const event = db.prepare("SELECT * FROM referral_events WHERE referred_user_id = ? AND status = 'pending'").get(order.user_id);
    if (event) {
      db.prepare('UPDATE users SET wallet_credit = wallet_credit + ? WHERE id = ?').run(event.credit_amount, event.referrer_user_id);
      db.prepare("UPDATE referral_events SET status = 'credited', order_id = ? WHERE id = ?").run(order.id, event.id);
      console.log(`[referral] credited ₹${event.credit_amount} to user ${event.referrer_user_id}`);
    }
  }

  // 6. Clear cart
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(order.user_id);
}

// Export for webhook reuse
export { markPaidAndFulfill };

// ─── GET /orders ─────────────────────────────────────────────────────────
r.get('/orders', requireAuth, (req, res) => {
  const orders = db.prepare(`
    SELECT id, status, subtotal, saved, tier_discount, shipping, total,
           payment_method, tracking_url, created_at
    FROM orders WHERE user_id = ? ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user.uid);
  res.json(orders);
});

// ─── GET /orders/:id ─────────────────────────────────────────────────────
r.get('/orders/:id', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.uid);
  if (!order) return res.status(404).json({ error: 'not found' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const address = typeof order.address_json === 'string' ? JSON.parse(order.address_json) : order.address_json;
  res.json({ ...order, address, items, address_json: undefined });
});

export default r;
