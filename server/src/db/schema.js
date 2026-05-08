// SQLite schema — books, users, carts, orders, referrals
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  referral_code TEXT NOT NULL UNIQUE,
  referred_by TEXT,
  wallet_credit INTEGER NOT NULL DEFAULT 0,
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
  -- forthcoming-specific
  arrival_date TEXT,
  -- second-hand specific
  is_used INTEGER DEFAULT 0,
  condition TEXT,
  condition_score INTEGER,
  seller TEXT,
  seller_year TEXT,
  notes TEXT,
  original_price INTEGER,
  shelf TEXT NOT NULL DEFAULT 'featured'  -- featured | new | forthcoming | secondhand
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

CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  book_id TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  is_bundle INTEGER NOT NULL DEFAULT 0,
  added_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  UNIQUE(user_id, book_id, is_bundle),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wishlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  book_id TEXT NOT NULL,
  added_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  UNIQUE(user_id, book_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,                      -- e.g. MS{timestamp36}
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'placed',
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
  address_json TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  FOREIGN KEY(user_id) REFERENCES users(id)
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

CREATE TABLE IF NOT EXISTS referral_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_user_id INTEGER NOT NULL,
  referred_user_id INTEGER NOT NULL,
  order_id TEXT,
  credit_amount INTEGER NOT NULL DEFAULT 200,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | credited
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE TABLE IF NOT EXISTS notify_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  email TEXT,
  book_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_books_shelf ON books(shelf);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);
`;
