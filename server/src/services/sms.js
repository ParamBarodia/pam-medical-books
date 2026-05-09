// SMS service — MSG91 (cheapest Indian SMS gateway, ~₹0.15/msg).
// Mock mode prints to stdout when MSG91_AUTH_KEY is missing.
import 'dotenv/config';

const AUTH_KEY = process.env.MSG91_AUTH_KEY;
const SENDER_ID = process.env.MSG91_SENDER_ID || 'PAMMED';
const TEMPLATE_ID_OTP = process.env.MSG91_TEMPLATE_ID_OTP;        // approved DLT template ID
const TEMPLATE_ID_GENERIC = process.env.MSG91_TEMPLATE_ID_GENERIC;
const IS_MOCK = !AUTH_KEY;

const BASE = 'https://control.msg91.com/api/v5';

// Indian phone in E.164: +91XXXXXXXXXX → MSG91 wants 91XXXXXXXXXX
function toMsg91(phoneE164) {
  return String(phoneE164).replace(/^\+/, '');
}

// Send a transactional SMS using a pre-approved DLT template.
// vars are the placeholders the template was registered with.
export async function sendSms({ phone, templateId, vars = {} }) {
  if (IS_MOCK) {
    console.log(`[sms-mock] → ${phone}  template=${templateId || 'inline'}  vars=${JSON.stringify(vars)}`);
    return { ok: true, mock: true };
  }
  if (!templateId) throw new Error('templateId required (MSG91 DLT compliance)');

  const res = await fetch(`${BASE}/flow/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'authkey': AUTH_KEY,
    },
    body: JSON.stringify({
      template_id: templateId,
      sender: SENDER_ID,
      short_url: '0',
      recipients: [{ mobiles: toMsg91(phone), ...vars }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MSG91 ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function sendOtpSms(phone, code) {
  return sendSms({ phone, templateId: TEMPLATE_ID_OTP, vars: { otp: code, OTP: code } });
}

export async function sendGenericSms(phone, text) {
  // Generic-text template must be DLT-approved and use a {message} placeholder.
  return sendSms({ phone, templateId: TEMPLATE_ID_GENERIC, vars: { message: text, MESSAGE: text } });
}

export const IS_MOCK_SMS = IS_MOCK;
