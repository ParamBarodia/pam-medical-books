// WhatsApp Business API stub.
// Real implementation will go through Meta's Cloud API or an aggregator
// (Gupshup / MSG91 / AiSensy) once Pam confirms his WABA credentials.
//
// Until then this returns { ok: false, fallback: true } so notify.js falls
// back to SMS automatically.
import 'dotenv/config';

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const IS_AVAILABLE = !!(TOKEN && PHONE_ID);

export async function sendWhatsApp({ phone, template, vars = {} }) {
  if (!IS_AVAILABLE) {
    return { ok: false, fallback: true, reason: 'WhatsApp not configured' };
  }
  // TODO when Pam's WABA is approved: call Meta Cloud API
  //   POST https://graph.facebook.com/v19.0/{PHONE_ID}/messages
  //   { messaging_product:'whatsapp', to: phone, type:'template',
  //     template:{ name:template, language:{code:'en'}, components:[...] } }
  console.log(`[whatsapp-stub] → ${phone}  template=${template}  vars=${JSON.stringify(vars)}`);
  return { ok: true, stubbed: true };
}

export const IS_WHATSAPP_AVAILABLE = IS_AVAILABLE;
