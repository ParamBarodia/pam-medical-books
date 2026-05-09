// Shiprocket webhook — fires on shipment status changes.
// Updates order.status (shipped → out_for_delivery → delivered → returned).
//
// Auth: requires X-Api-Key header to match SHIPROCKET_WEBHOOK_TOKEN.
// Without this, anyone could POST to flip orders to delivered/cancelled.
// Configure the same token in the Shiprocket dashboard webhook settings.

import { Router } from 'express';
import crypto from 'node:crypto';
import db from '../../db/index.js';
import * as email from '../../services/email.js';
import { logger } from '../../logger.js';

const r = Router();

const STATUS_MAP = {
  'PICKED UP':        'shipped',
  'IN TRANSIT':       'shipped',
  'OUT FOR DELIVERY': 'out_for_delivery',
  'DELIVERED':        'delivered',
  'RTO INITIATED':    'returned',
  'RTO DELIVERED':    'returned',
  'CANCELED':         'cancelled',
};

const WEBHOOK_TOKEN = process.env.SHIPROCKET_WEBHOOK_TOKEN;

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

r.post('/', async (req, res) => {
  // Reject unauthenticated POSTs in non-mock mode. Without this, anyone on
  // the internet who knows an order_id could flip its status.
  if (WEBHOOK_TOKEN) {
    const provided = req.headers['x-api-key'];
    if (!provided || !safeEqual(WEBHOOK_TOKEN, String(provided))) {
      logger.warn({ ip: req.ip }, 'shiprocket webhook rejected — bad token');
      return res.status(401).json({ error: 'unauthorised' });
    }
  } else if (process.env.NODE_ENV === 'production') {
    logger.error('SHIPROCKET_WEBHOOK_TOKEN not set in production — rejecting webhook');
    return res.status(503).json({ error: 'webhook auth not configured' });
  }

  const payload = req.body || {};
  const { awb, current_status } = payload;
  // Coerce undefined → null so node:sqlite can bind the parameter; without
  // this, payloads missing shipment_id/order_id crash with ERR_INVALID_ARG_TYPE.
  const shipment_id = payload.shipment_id ?? null;
  const order_id = payload.order_id ?? null;

  // Look up our order by Shiprocket's shipment_id or order_id
  const order = db.prepare(
    'SELECT * FROM orders WHERE shiprocket_shipment_id = ? OR shiprocket_order_id = ? OR id = ?'
  ).get(shipment_id, order_id, order_id);

  if (!order) {
    logger.warn({ shipment_id, order_id }, 'shiprocket webhook — no matching order');
    return res.json({ ok: true, ignored: true });
  }

  const newStatus = STATUS_MAP[String(current_status || '').toUpperCase()];
  if (newStatus && newStatus !== order.status) {
    db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
      .run(newStatus, Date.now(), order.id);

    // Email customer on key transitions (null-safe address parsing)
    let address = null;
    try { address = order.address_json ? JSON.parse(order.address_json) : null; } catch {}
    if (newStatus === 'shipped' && address?.email) {
      await email.sendShipmentNotification({
        order, customerEmail: address.email, customerName: address.name,
        trackingUrl: order.tracking_url || `https://shiprocket.co/tracking/${awb || shipment_id}`,
      }).catch((err) => logger.error({ err }, 'shipment email failed'));
    }
  }

  // Log the event for audit
  db.prepare(`INSERT INTO webhook_events (source, event_id, event_type, payload, processed_at)
              VALUES (?, ?, ?, ?, ?)`)
    .run('shiprocket', `sr_${awb || shipment_id}_${Date.now()}`, current_status || 'unknown',
         JSON.stringify(payload), Date.now());

  res.json({ ok: true });
});

export default r;
