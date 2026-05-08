// Product, bundle, testimonial routes — all read-only / public
import { Router } from 'express';
import db from '../db/index.js';

const r = Router();

const ALLOWED_SHELVES = new Set(['featured', 'new', 'forthcoming', 'secondhand']);

function reshapeBook(b) {
  if (!b) return null;
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    edition: b.edition,
    mrp: b.mrp,
    price: b.price,
    rating: b.rating,
    reviews: b.reviews,
    cover: { bg: b.cover_bg, accent: b.cover_accent, style: b.cover_style },
    tag: b.tag,
    category: b.category,
    stock: b.stock,
    publisher: b.publisher,
    isbn: b.isbn,
    pages: b.pages,
    language: b.language,
    description: b.description,
    arrivalDate: b.arrival_date,
    isUsed: !!b.is_used,
    condition: b.condition,
    conditionScore: b.condition_score,
    seller: b.seller,
    soldBy: b.seller_year,
    notes: b.notes,
    originalPrice: b.original_price,
    shelf: b.shelf,
  };
}

// GET /api/books?shelf=featured&category=MBBS&q=robbins&limit=50
r.get('/books', (req, res) => {
  const { shelf, category, q, limit = 200 } = req.query;
  const where = [];
  const params = {};
  if (shelf && ALLOWED_SHELVES.has(shelf)) { where.push('shelf = @shelf'); params.shelf = shelf; }
  if (category) { where.push('category = @category'); params.category = category; }
  if (q) {
    where.push("(LOWER(title) LIKE @q OR LOWER(author) LIKE @q OR LOWER(IFNULL(publisher,'')) LIKE @q OR IFNULL(isbn,'') LIKE @q)");
    params.q = `%${String(q).toLowerCase()}%`;
  }
  const sql = `
    SELECT * FROM books
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY rating DESC, reviews DESC
    LIMIT @limit
  `;
  params.limit = Math.min(Number(limit) || 200, 500);
  const rows = db.prepare(sql).all(params);
  res.json(rows.map(reshapeBook));
});

// GET /api/books/:id
r.get('/books/:id', (req, res) => {
  const b = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!b) return res.status(404).json({ error: 'not found' });
  res.json(reshapeBook(b));
});

// GET /api/bundles
r.get('/bundles', (_req, res) => {
  const rows = db.prepare('SELECT * FROM bundles ORDER BY id').all();
  res.json(rows.map(b => ({
    id: b.id, title: b.title, subtitle: b.subtitle, badge: b.badge, accent: b.accent,
    books: JSON.parse(b.books_json), mrp: b.mrp, price: b.price, saved: b.saved,
  })));
});

// GET /api/testimonials
r.get('/testimonials', (_req, res) => {
  const rows = db.prepare('SELECT * FROM testimonials ORDER BY id').all();
  res.json(rows);
});

// POST /api/notify  body: { bookId, email }
r.post('/notify', (req, res) => {
  const { bookId, email } = req.body || {};
  if (!bookId) return res.status(400).json({ error: 'bookId required' });
  const userId = req.user?.uid || null;
  db.prepare('INSERT INTO notify_requests (user_id, email, book_id) VALUES (?, ?, ?)')
    .run(userId, email || null, bookId);
  console.log(`[email] would notify ${email || 'user#' + userId} when ${bookId} is in stock`);
  res.json({ ok: true });
});

export default r;
