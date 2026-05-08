// Razorpay service — creates orders, verifies signatures, handles refunds.
// In test mode (no env vars), returns mock data so dev still works end-to-end.
import 'dotenv/config';
import crypto from 'node:crypto';

const KEY_ID     = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const IS_MOCK = !KEY_ID || !KEY_SECRET || KEY_ID.includes('mock');

let rzp;
if (!IS_MOCK) {
  const Razorpay = (await import('razorpay')).default;
  rzp = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
}

export async function createOrder({ amount, receipt, notes }) {
  if (IS_MOCK) {
    return {
      id: 'order_test_' + Math.random().toString(36).slice(2, 10),
      amount: amount * 100, currency: 'INR', receipt, status: 'created', notes,
    };
  }
  return await rzp.orders.create({
    amount: amount * 100,        // paise
    currency: 'INR',
    receipt,
    notes,
  });
}

export async function refundPayment(paymentId, amount) {
  if (IS_MOCK) {
    return { id: 'rfnd_test_' + Math.random().toString(36).slice(2, 10), payment_id: paymentId, amount: amount * 100, status: 'processed' };
  }
  return await rzp.payments.refund(paymentId, { amount: amount * 100 });
}

// Verify the signature returned by Razorpay's checkout JS after a successful payment
export function verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (IS_MOCK) return true;
  const expected = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature));
}

// Verify webhook signature (separate secret from KEY_SECRET)
export function verifyWebhookSignature(rawBody, signatureHeader) {
  if (IS_MOCK || !WEBHOOK_SECRET) return true;
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader || ''));
  } catch { return false; }
}

export const PUBLIC_KEY_ID = KEY_ID || 'rzp_test_mock';
export const IS_MOCK_RZP = IS_MOCK;
