// Razorpay webhook — async event delivery from Razorpay.
// Idempotent (events table dedups by event id).
//
// IMPORTANT: this route needs the RAW body to verify the HMAC signature.
// In server.js, mount it BEFORE express.json() with express.raw({ type: 'application/json' }).

import { Router } from 'express';
import db from '../../db/index.js';
import * as razorpay from '../../services/razorpay.js';
import { markPaidAndFulfill } from '../orders.js';

const r = Router();

r.post('/razorpay', async (req, res) => {
  const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);
  const signature = req.headers['x-razorpay-signature'];

  if (!razorpay.verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ error: 'invalid signature' });
  }

  let payload;
  try { payload = typeof req.body === 'object' && !(req.body instanceof Buffer) ? req.body : JSON.parse(rawBody); }
  catch { return res.status(400).json({ error: 'malformed body' }); }

  const eventId = payload.event_id || `${payload.event}-${payload.payload?.payment?.entity?.id || Date.now()}`;
  const eventType = payload.event;

  // Dedup
  const existing = db.prepare('SELECT id FROM webhook_events WHERE event_id = ?').get(eventId);
  if (existing) return res.json({ ok: true, deduped: true });

  db.prepare('INSERT INTO webhook_events (source, event_id, event_type, payload) VALUES (?, ?, ?, ?)')
    .run('razorpay', eventId, eventType, JSON.stringify(payload));

  try {
    if (eventType === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const order = db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?').get(payment.order_id);
      if (order && order.status === 'placed') {
        await markPaidAndFulfill(order, payment.id);
      }
    } else if (eventType === 'payment.failed') {
      const payment = payload.payload.payment.entity;
      db.prepare("UPDATE orders SET status = 'cancelled' WHERE razorpay_order_id = ?").run(payment.order_id);
    } else if (eventType === 'refund.processed') {
      const refund = payload.payload.refund.entity;
      db.prepare("UPDATE orders SET status = 'refunded' WHERE razorpay_payment_id = ?").run(refund.payment_id);
    }

    db.prepare('UPDATE webhook_events SET processed_at = ? WHERE event_id = ?').run(Date.now(), eventId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[webhook/razorpay]', err);
    db.prepare('UPDATE webhook_events SET error = ? WHERE event_id = ?').run(err.message, eventId);
    res.status(500).json({ error: err.message });
  }
});

export default r;
