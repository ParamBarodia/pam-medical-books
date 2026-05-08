// Email service — Resend with HTML templates.
// Logs to console if RESEND_API_KEY is missing (so dev still gets feedback).

import 'dotenv/config';

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || 'MedShelf <orders@medshelf.in>';
const ADMIN = process.env.EMAIL_ADMIN || 'admin@medshelf.in';
const IS_MOCK = !RESEND_KEY;

let resend;
if (!IS_MOCK) {
  const { Resend } = await import('resend');
  resend = new Resend(RESEND_KEY);
}

async function send({ to, subject, html, text }) {
  if (IS_MOCK) {
    console.log(`\n[email/mock] To: ${to}\nSubject: ${subject}\n${text || html.slice(0, 200)}\n`);
    return { id: 'mock_' + Date.now() };
  }
  const { data, error } = await resend.emails.send({ from: FROM, to, subject, html, text });
  if (error) throw new Error(`Resend: ${error.message}`);
  return data;
}

// ─── Templates ──────────────────────────────────────────────────────────────
const layout = (body) => `
<!doctype html><html><body style="font-family:Georgia,serif;background:#f6f1e7;padding:32px;color:#1c1a14">
  <div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border:1px solid #c8bfa8">
    <h1 style="font-family:Georgia,serif;font-size:28px;letter-spacing:-0.02em;margin:0 0 8px;font-weight:500">
      MedShelf<span style="color:#8b2a1f">.</span>
    </h1>
    <p style="font-style:italic;color:#6f6856;font-size:13px;margin:0 0 24px">India's bookseller to medicine</p>
    ${body}
    <hr style="border:0;border-top:1px solid #c8bfa8;margin:32px 0 16px" />
    <p style="font-size:11px;color:#6f6856">
      MedShelf Books LLP · 3-6-291/4, Bengaluru — 560029 · helpdesk@medshelf.in<br/>
      You're receiving this because you placed an order on MedShelf.
    </p>
  </div>
</body></html>`;

export async function sendOrderConfirmation({ order, items, customerEmail, customerName }) {
  const itemList = items.map((i) =>
    `<tr><td>${i.title}</td><td style="text-align:right">${i.qty} × ₹${i.unit_price}</td></tr>`
  ).join('');

  const html = layout(`
    <h2 style="font-size:22px;margin:0 0 4px">Order placed!</h2>
    <p style="color:#6f6856;font-style:italic">Thank you, <strong style="color:#1c1a14;font-style:normal">${customerName}</strong>.</p>

    <div style="background:#f6f1e7;padding:14px 18px;border:1px dashed #8b2a1f;margin:20px 0;display:inline-block">
      <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#6f6856">Order ID</div>
      <div style="font-family:monospace;font-size:18px;font-weight:700;margin-top:4px">${order.id}</div>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:20px 0">
      ${itemList}
      <tr><td colspan="2" style="border-top:1px solid #c8bfa8;padding-top:12px;text-align:right;font-weight:600">
        Total: ₹${order.total}
      </td></tr>
    </table>

    <p>We'll dispatch your books from our Bengaluru warehouse within 24 hours.
    You'll receive a tracking link by SMS/email when shipped.</p>
  `);

  return send({ to: customerEmail, subject: `Order ${order.id} confirmed — ₹${order.total}`, html, text: `Order ${order.id} confirmed. Total: ₹${order.total}.` });
}

export async function sendShipmentNotification({ order, customerEmail, customerName, trackingUrl }) {
  const html = layout(`
    <h2 style="font-size:22px;margin:0 0 4px">Your books are on the way 📦</h2>
    <p>Hi ${customerName}, order <strong>${order.id}</strong> has been picked up by the courier.</p>
    <p style="margin:24px 0">
      <a href="${trackingUrl}" style="background:#8b2a1f;color:#f6f1e7;padding:12px 22px;text-decoration:none;letter-spacing:0.1em;font-size:12px;text-transform:uppercase">
        Track Shipment →
      </a>
    </p>
    <p style="color:#6f6856;font-size:13px">Expected delivery: 2-5 business days. We'll email you again when it arrives.</p>
  `);
  return send({ to: customerEmail, subject: `Order ${order.id} shipped — track your package`, html });
}

export async function sendLowStockDigest(books) {
  if (!books.length) return;
  const list = books
    .map((b) => `<li><strong>${b.title}</strong> — ${b.stock} left (${b.author})</li>`)
    .join('');
  const html = layout(`
    <h2 style="font-size:22px">⚠️ Low stock alert</h2>
    <p>The following books have fewer than 5 copies in stock:</p>
    <ul>${list}</ul>
    <p>Consider reordering from publishers.</p>
  `);
  return send({ to: ADMIN, subject: `Low stock — ${books.length} books need restocking`, html });
}

export async function sendAdminNewOrderAlert({ order, customerName }) {
  const html = layout(`
    <h2 style="font-size:18px">📬 New order: ${order.id}</h2>
    <p>${customerName} just placed an order for ₹${order.total}.</p>
    <p style="font-size:13px;color:#6f6856">View in <a href="https://medshelf.in/admin/orders/${order.id}">admin dashboard</a>.</p>
  `);
  return send({ to: ADMIN, subject: `[MedShelf] New order ${order.id} · ₹${order.total}`, html });
}

export const IS_MOCK_EMAIL = IS_MOCK;
