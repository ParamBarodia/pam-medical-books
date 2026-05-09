// Cart + wishlist — auth required
import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../auth.js';

const r = Router();

function getCart(userId) {
  const items = db.prepare(`
    SELECT ci.id AS row_id, ci.book_id, ci.qty, ci.is_bundle,
           b.title AS b_title, b.author, b.edition, b.price AS b_price, b.mrp AS b_mrp,
           b.cover_bg, b.cover_accent, b.cover_style, b.stock,
           bn.title AS bn_title, bn.price AS bn_price, bn.mrp AS bn_mrp,
           bn.books_json
    FROM cart_items ci
    LEFT JOIN books b   ON ci.is_bundle = 0 AND ci.book_id = b.id
    LEFT JOIN bundles bn ON ci.is_bundle = 1 AND ci.book_id = bn.id
    WHERE ci.user_id = ?
    ORDER BY ci.added_at
  `).all(userId);

  return items.map(i => ({
    id: i.book_id,
    qty: i.qty,
    isBundle: !!i.is_bundle,
    title: i.is_bundle ? i.bn_title : i.b_title,
    price: i.is_bundle ? i.bn_price : i.b_price,
    mrp: i.is_bundle ? i.bn_mrp : i.b_mrp,
    author: i.author || null,
    edition: i.edition || null,
    cover: i.is_bundle ? null : { bg: i.cover_bg, accent: i.cover_accent, style: i.cover_style },
    count: i.is_bundle && i.books_json ? JSON.parse(i.books_json).length : null,
    stock: i.stock,
  }));
}

// GET /api/cart
r.get('/cart', requireAuth, (req, res) => res.json(getCart(req.user.uid)));

// Per-line cap. Bookstores that don't sell whole pallets through retail
// shouldn't accept qty=9999 from a JSON body.
const MAX_QTY_PER_LINE = 50;

function normalizeQty(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_QTY_PER_LINE) return null;
  return n;
}

// POST /api/cart  { bookId, qty?, isBundle? }
r.post('/cart', requireAuth, (req, res) => {
  const { bookId, qty: rawQty = 1, isBundle = false } = req.body || {};
  if (!bookId) return res.status(400).json({ error: 'bookId required' });
  const qty = normalizeQty(rawQty);
  if (qty === null) return res.status(400).json({ error: `qty must be an integer between 1 and ${MAX_QTY_PER_LINE}` });

  const exists = isBundle
    ? db.prepare('SELECT id FROM bundles WHERE id = ?').get(bookId)
    : db.prepare('SELECT id FROM books WHERE id = ?').get(bookId);
  if (!exists) return res.status(404).json({ error: 'product not found' });

  // Upsert with cap enforced on the merged qty too
  const existing = db.prepare('SELECT id, qty FROM cart_items WHERE user_id = ? AND book_id = ? AND is_bundle = ?')
    .get(req.user.uid, bookId, isBundle ? 1 : 0);
  if (existing) {
    const merged = Math.min(existing.qty + qty, MAX_QTY_PER_LINE);
    db.prepare('UPDATE cart_items SET qty = ? WHERE id = ?').run(merged, existing.id);
  } else {
    db.prepare('INSERT INTO cart_items (user_id, book_id, qty, is_bundle) VALUES (?, ?, ?, ?)')
      .run(req.user.uid, bookId, qty, isBundle ? 1 : 0);
  }
  res.json(getCart(req.user.uid));
});

// PATCH /api/cart  { bookId, isBundle?, delta }   delta is +1 / -1
r.patch('/cart', requireAuth, (req, res) => {
  const { bookId, isBundle = false, delta } = req.body || {};
  if (!bookId || !Number.isInteger(delta) || delta < -MAX_QTY_PER_LINE || delta > MAX_QTY_PER_LINE) {
    return res.status(400).json({ error: 'bookId + integer delta required' });
  }
  const row = db.prepare('SELECT id, qty FROM cart_items WHERE user_id = ? AND book_id = ? AND is_bundle = ?')
    .get(req.user.uid, bookId, isBundle ? 1 : 0);
  if (!row) return res.status(404).json({ error: 'not in cart' });
  const newQty = row.qty + delta;
  if (newQty <= 0) {
    db.prepare('DELETE FROM cart_items WHERE id = ?').run(row.id);
  } else if (newQty > MAX_QTY_PER_LINE) {
    return res.status(400).json({ error: `max ${MAX_QTY_PER_LINE} per line` });
  } else {
    db.prepare('UPDATE cart_items SET qty = ? WHERE id = ?').run(newQty, row.id);
  }
  res.json(getCart(req.user.uid));
});

// DELETE /api/cart/:bookId
r.delete('/cart/:bookId', requireAuth, (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE user_id = ? AND book_id = ?').run(req.user.uid, req.params.bookId);
  res.json(getCart(req.user.uid));
});

// DELETE /api/cart  (clear)
r.delete('/cart', requireAuth, (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.uid);
  res.json([]);
});

// ─── Wishlist ──────────────────────────────────────────────────────────────
function getWishlist(userId) {
  return db.prepare('SELECT book_id FROM wishlist WHERE user_id = ?').all(userId).map(r => r.book_id);
}

r.get('/wishlist', requireAuth, (req, res) => res.json(getWishlist(req.user.uid)));

r.get('/wishlist/detailed', requireAuth, (req, res) => {
  const books = db.prepare(`
    SELECT b.*
    FROM wishlist w
    JOIN books b ON b.id = w.book_id
    WHERE w.user_id = ?
    ORDER BY w.added_at DESC
  `).all(req.user.uid);
  res.json(books);
});

r.post('/wishlist', requireAuth, (req, res) => {
  const { bookId } = req.body || {};
  if (!bookId) return res.status(400).json({ error: 'bookId required' });
  db.prepare('INSERT OR IGNORE INTO wishlist (user_id, book_id) VALUES (?, ?)').run(req.user.uid, bookId);
  res.json(getWishlist(req.user.uid));
});

r.delete('/wishlist/:bookId', requireAuth, (req, res) => {
  db.prepare('DELETE FROM wishlist WHERE user_id = ? AND book_id = ?').run(req.user.uid, req.params.bookId);
  res.json(getWishlist(req.user.uid));
});

export default r;
