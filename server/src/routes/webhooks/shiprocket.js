// Shiprocket webhook — fires on shipment status changes.
// Updates order.status (shipped → out_for_delivery → delivered → returned).

import { Router } from 'express';
import db from '../../db/index.js';
import * as email from '../../services/email.js';

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

r.post('/shiprocket', async (req, res) => {
  const payload = req.body || {};
  const { awb, current_status, shipment_id, order_id } = payload;

  // Look up our order by Shiprocket's shipment_id or order_id
  const order = db.prepare(
    'SELECT * FROM orders WHERE shiprocket_shipment_id = ? OR shiprocket_order_id = ? OR id = ?'
  ).get(shipment_id, order_id, order_id);

  if (!order) {
    console.warn('[webhook/shiprocket] no matching order for', { shipment_id, order_id });
    return res.json({ ok: true, ignored: true });
  }

  const newStatus = STATUS_MAP[String(current_status || '').toUpperCase()];
  if (newStatus && newStatus !== order.status) {
    db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
      .run(newStatus, Date.now(), order.id);

    // Email customer on key transitions
    const address = typeof order.address_json === 'string' ? JSON.parse(order.address_json) : order.address_json;
    if (newStatus === 'shipped' && address.email) {
      await email.sendShipmentNotification({
        order, customerEmail: address.email, customerName: address.name,
        trackingUrl: order.tracking_url || `https://shiprocket.co/tracking/${awb || shipment_id}`,
      }).catch(console.error);
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
