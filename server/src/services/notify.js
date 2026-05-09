// Notification router: WhatsApp first, SMS fallback.
// Centralises every transactional message so the channel is swappable per env.
import * as wa from './whatsapp.js';
import * as sms from './sms.js';
import { logger } from '../logger.js';

// templateKey → { whatsapp template name, SMS msg builder }
const TEMPLATES = {
  order_placed: {
    waTemplate: 'order_placed',
    sms: (v) => `Pam Medical Books: Order ${v.orderId} received (₹${v.total}). We'll WhatsApp you when it ships.`,
  },
  payment_received: {
    waTemplate: 'payment_received',
    sms: (v) => `Pam Medical Books: Payment of ₹${v.total} received for order ${v.orderId}. Thank you!`,
  },
  order_shipped: {
    waTemplate: 'order_shipped',
    sms: (v) => `Pam Medical Books: Order ${v.orderId} shipped. Track here: ${v.trackingUrl}`,
  },
  order_delivered: {
    waTemplate: 'order_delivered',
    sms: (v) => `Pam Medical Books: Order ${v.orderId} delivered. Thanks for shopping with us!`,
  },
  return_approved: {
    waTemplate: 'return_approved',
    sms: (v) => `Pam Medical Books: Your return request for ${v.orderId} is approved. We'll arrange pickup.`,
  },
  cancellation_approved: {
    waTemplate: 'cancellation_approved',
    sms: (v) => `Pam Medical Books: Order ${v.orderId} has been cancelled. Refund (if any) will arrive in 5-7 days.`,
  },
  back_in_stock: {
    waTemplate: 'back_in_stock',
    sms: (v) => `Pam Medical Books: "${v.title}" is back in stock! Order before it sells out: ${v.url}`,
  },
};

export async function notify(phone, templateKey, vars = {}) {
  const tpl = TEMPLATES[templateKey];
  if (!tpl) throw new Error(`Unknown notification template: ${templateKey}`);

  // Try WhatsApp first
  const waResult = await wa.sendWhatsApp({ phone, template: tpl.waTemplate, vars }).catch((e) => ({ ok: false, error: e.message }));
  if (waResult.ok) return { channel: 'whatsapp', ...waResult };

  // SMS fallback
  try {
    await sms.sendGenericSms(phone, tpl.sms(vars));
    return { channel: 'sms', ok: true, fellBack: true };
  } catch (e) {
    logger.error({ err: e, templateKey, phone: phone.slice(0, 6) + '****' }, 'notification failed on all channels');
    return { channel: 'none', ok: false, error: e.message };
  }
}
