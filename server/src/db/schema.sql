-- Postgres schema (replaces SQLite for production).
-- Idempotent — safe to run multiple times.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer',                 -- 'customer' | 'admin'
  referral_code TEXT NOT NULL UNIQUE,
  referred_by TEXT,
  wallet_credit INTEGER NOT NULL DEFAULT 0,              -- in paise (₹2.00 = 200)
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,                                  -- references Sanity document id
  qty INTEGER NOT NULL DEFAULT 1,
  is_bundle BOOLEAN NOT NULL DEFAULT FALSE,
  added_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  UNIQUE(user_id, book_id, is_bundle)
);

CREATE TABLE IF NOT EXISTS wishlist (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  added_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  UNIQUE(user_id, book_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'placed',                  -- placed | paid | shipped | delivered | cancelled | refunded
  subtotal INTEGER NOT NULL,
  saved INTEGER NOT NULL DEFAULT 0,
  tier_discount INTEGER NOT NULL DEFAULT 0,
  shipping INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  shiprocket_order_id TEXT,
  shiprocket_shipment_id TEXT,
  tracking_url TEXT,
  address_json JSONB NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  book_id TEXT,
  bundle_id TEXT,
  title TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  unit_mrp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS referral_events (
  id SERIAL PRIMARY KEY,
  referrer_user_id INTEGER NOT NULL REFERENCES users(id),
  referred_user_id INTEGER NOT NULL REFERENCES users(id),
  order_id TEXT REFERENCES orders(id),
  credit_amount INTEGER NOT NULL DEFAULT 200,
  status TEXT NOT NULL DEFAULT 'pending',                 -- pending | credited
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE TABLE IF NOT EXISTS notify_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  email TEXT,
  book_id TEXT NOT NULL,
  fulfilled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Webhook event log — for idempotency + replay debugging
CREATE TABLE IF NOT EXISTS webhook_events (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,                                   -- 'razorpay' | 'shiprocket'
  event_id TEXT NOT NULL UNIQUE,                          -- prevent duplicate processing
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at BIGINT,
  error TEXT,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_orders_user        ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created     ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_user          ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_referred  ON referral_events(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_source     ON webhook_events(source, event_type);
