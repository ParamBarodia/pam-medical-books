// Pam Medical Books — API server (phone-only model)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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

// Trust the first proxy (Render / Vercel / etc) so req.ip reads the real client
// address from X-Forwarded-For instead of the proxy IP. Required for rate
// limiting to work correctly behind a hosting platform.
app.set('trust proxy', 1);

// Security headers (CSP intentionally relaxed because we serve a SPA that
// inlines Razorpay checkout JS and uses external CDNs for fonts/covers).
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
  maxAge: 86400,    // cache preflight 24h
}));
app.use(cookieParser());

// ─── Rate limiters ────────────────────────────────────────────────────────
// OTP: protects against SMS-bomb attacks (each SMS costs real money).
const otpLimiter = rateLimit({
  windowMs: 60_000,           // 1 minute
  limit: 3,                   // 3 OTP requests / minute / IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many OTP requests — wait a minute and try again.' },
});
// Customer lookup / phone-keyed reads: protects against PII enumeration scans
// (even though we now only return masked hints, scrapers still cost CPU).
const lookupLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,                  // 30 lookups / minute / IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many lookups — slow down.' },
});

// Webhook routes need raw body for HMAC verification (mounted BEFORE json parser)
app.use('/api/webhooks/razorpay',
  express.raw({ type: 'application/json' }),
  razorpayWebhook,
);

app.use(express.json({ limit: '256kb' }));
app.use(adminMiddleware);   // sets req.admin if admin cookie is valid

// Apply rate limiters to specific endpoints
app.use('/api/otp/request', otpLimiter);
app.use('/api/customer/lookup', lookupLimiter);
app.use('/api/orders/by-phone', lookupLimiter);
app.use('/api/notify-when-back', lookupLimiter);

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
