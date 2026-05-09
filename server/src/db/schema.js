// SQLite schema — phone-as-identity model.
// Customers are identified by phone (no password, no JWT).
// Admins are a small allowlist of shop staff, authenticated via phone OTP.
export const SCHEMA = `
-- Customers: identified by phone alone. Last address is remembered for prefill.
CREATE TABLE IF NOT EXISTS customers (
  phone TEXT PRIMARY KEY,                            -- E.164: +9198XXXXXXXX
  name TEXT NOT NULL,
  email TEXT,
  last_address_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

-- Admins: shop staff (Pam himself). Allowlisted via ADMIN_PHONES env at boot.
CREATE TABLE IF NOT EXISTS admins (
  phone TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

-- One-time passwords for COD checkout + admin login.
CREATE TABLE IF NOT EXISTS otps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL,                             -- 'cod_checkout' | 'admin_login'
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);
CREATE INDEX IF NOT EXISTS idx_otps_lookup ON otps(phone, purpose, consumed, expires_at);

-- Admin sessions (cookie-based, 30-day TTL)
CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  edition TEXT,
  mrp INTEGER NOT NULL,
  price INTEGER NOT NULL,
  rating REAL NOT NULL DEFAULT 0,
  reviews INTEGER NOT NULL DEFAULT 0,
  cover_bg TEXT NOT NULL,
  cover_accent TEXT NOT NULL,
  cover_style TEXT NOT NULL DEFAULT 'classic',
  tag TEXT,
  category TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  publisher TEXT,
  isbn TEXT,
  pages INTEGER,
  language TEXT DEFAULT 'English',
  description TEXT,
  cover_url TEXT,
  arrival_date TEXT,
  is_used INTEGER DEFAULT 0,
  condition TEXT,
  condition_score INTEGER,
  seller TEXT,
  seller_year TEXT,
  notes TEXT,
  original_price INTEGER,
  shelf TEXT NOT NULL DEFAULT 'featured'
);

CREATE TABLE IF NOT EXISTS bundles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  badge TEXT,
  accent TEXT,
  books_json TEXT NOT NULL,
  mrp INTEGER NOT NULL,
  price INTEGER NOT NULL,
  saved INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT,
  source TEXT NOT NULL,
  rating INTEGER NOT NULL,
  date TEXT,
  text TEXT NOT NULL
);

-- Orders: keyed by customer phone (no FK — customer record may not exist yet
-- when checkout starts; the order is the source of truth).
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'placed',             -- placed | paid | shipped | out_for_delivery | delivered | cancelled | refunded
  subtotal INTEGER NOT NULL,
  saved INTEGER NOT NULL DEFAULT 0,
  tier_discount INTEGER NOT NULL DEFAULT 0,
  shipping INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  payment_method TEXT NOT NULL,                      -- upi | card | netbanking | cod
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  shiprocket_order_id TEXT,
  shiprocket_shipment_id TEXT,
  tracking_url TEXT,
  address_json TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay ON orders(razorpay_order_id);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  book_id TEXT,
  bundle_id TEXT,
  title TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  unit_mrp INTEGER NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Customer-initiated requests, queue-style. Admin approves or denies.
CREATE TABLE IF NOT EXISTS return_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',            -- pending | approved | denied
  admin_note TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS cancellation_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  processed_at INTEGER,
  error TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

-- Restock waitlist: when a book hits stock=0, customers can subscribe.
-- Admin's stock-update flow notifies everyone in this table when stock returns.
CREATE TABLE IF NOT EXISTS notify_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  book_id TEXT NOT NULL,
  notified_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  UNIQUE(phone, book_id)
);
`;
