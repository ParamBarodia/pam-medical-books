// Pam Medical Books — API server (phone-only model)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { adminMiddleware } from './middleware/admin-auth.js';
import productsRouter from './routes/products.js';
import customerRouter from './routes/customer.js';
import ordersRouter from './routes/orders.js';
import adminRouter from './routes/admin.js';
import razorpayWebhook from './routes/webhooks/razorpay.js';
import shiprocketWebhook from './routes/webhooks/shiprocket.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(cookieParser());

// Webhook routes need raw body for HMAC verification
app.use('/api/webhooks/razorpay',
  express.raw({ type: 'application/json' }),
  razorpayWebhook,
);

app.use(express.json({ limit: '256kb' }));
app.use(adminMiddleware);   // sets req.admin if admin cookie is valid

// Static cover images
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use('/covers', express.static(resolve(__dirname, '../public/covers'), {
  maxAge: '7d',
  fallthrough: true,
}));

// Routes
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.use('/api', productsRouter);
app.use('/api', customerRouter);
app.use('/api', ordersRouter);
app.use('/api', adminRouter);
app.use('/api/webhooks/shiprocket', shiprocketWebhook);

// 404 + error
app.use((_req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'server error' });
});

app.listen(PORT, () => {
  console.log(`Pam Medical Books API listening on http://localhost:${PORT}`);
  console.log(`  Razorpay: ${process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes('mock') ? 'LIVE' : 'mock'}`);
  console.log(`  Shiprocket: ${process.env.SHIPROCKET_EMAIL ? 'LIVE' : 'mock'}`);
  console.log(`  SMS (MSG91): ${process.env.MSG91_AUTH_KEY ? 'LIVE' : 'mock (codes printed to console)'}`);
  console.log(`  WhatsApp: ${process.env.WHATSAPP_TOKEN ? 'LIVE' : 'stub (falls back to SMS)'}`);
  console.log(`  Sanity: ${process.env.SANITY_PROJECT_ID ? 'LIVE' : 'mock (using local DB only)'}`);
  const admins = (process.env.ADMIN_PHONES || '').split(',').map(s => s.trim()).filter(Boolean);
  console.log(`  Admin phones: ${admins.length ? admins.join(', ') : '⚠️  none set (no one can log in to /admin)'}`);
});
