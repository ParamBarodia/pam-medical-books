// Razorpay service — creates orders, verifies signatures, handles refunds.
// In test mode (no env vars), returns mock data so dev still works end-to-end.
import 'dotenv/config';
import crypto from 'node:crypto';
import { logger } from '../logger.js';

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

// Constant-time string compare that won't throw on length mismatch.
function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Verify the signature returned by Razorpay's checkout JS after a successful payment
export function verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (IS_MOCK) return true;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return false;
  const expected = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  return safeEqualHex(expected, razorpay_signature);
}

// Verify webhook signature. In live mode WEBHOOK_SECRET is mandatory — if it's
// missing we fail closed (return false), so misconfigured deploys reject all
// webhooks instead of silently trusting them.
export function verifyWebhookSignature(rawBody, signatureHeader) {
  if (IS_MOCK) return true;
  if (!WEBHOOK_SECRET) {
    logger.error('RAZORPAY_WEBHOOK_SECRET not set — rejecting webhook');
    return false;
  }
  if (!signatureHeader) return false;
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
  return safeEqualHex(expected, signatureHeader);
}

export const PUBLIC_KEY_ID = KEY_ID || 'rzp_test_mock';
export const IS_MOCK_RZP = IS_MOCK;
