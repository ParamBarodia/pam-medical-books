// MedShelf API server
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { authMiddleware } from './auth.js';
import productsRouter from './routes/products.js';
import authRouter from './routes/auth.js';
import cartRouter from './routes/cart.js';
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

// ─── Webhook routes — MUST come before express.json() to keep raw body for HMAC ──
app.use('/api/webhooks/razorpay',
  express.raw({ type: 'application/json' }),
  razorpayWebhook,
);

// ─── JSON parser for all other routes ────────────────────────────────────
app.use(express.json({ limit: '256kb' }));
app.use(authMiddleware);

// ─── Routes ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.use('/api', productsRouter);
app.use('/api/auth', authRouter);
app.use('/api', cartRouter);
app.use('/api', ordersRouter);
app.use('/api', adminRouter);
app.use('/api/webhooks/shiprocket', shiprocketWebhook);

// ─── 404 + error handler ─────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'server error' });
});

app.listen(PORT, () => {
  console.log(`MedShelf API listening on http://localhost:${PORT}`);
  console.log(`  Razorpay: ${process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes('mock') ? 'LIVE' : 'mock'}`);
  console.log(`  Shiprocket: ${process.env.SHIPROCKET_EMAIL ? 'LIVE' : 'mock'}`);
  console.log(`  Email (Resend): ${process.env.RESEND_API_KEY ? 'LIVE' : 'mock'}`);
  console.log(`  Sanity: ${process.env.SANITY_PROJECT_ID ? 'LIVE' : 'mock (using local DB only)'}`);
});
