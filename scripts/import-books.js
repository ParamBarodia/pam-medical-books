// Bulk-import books into Sanity from Excel/CSV/JSON.
// Auto-fetches title, author, publisher, description, cover from ISBN.
// The client only needs to provide: ISBN + MRP + Price + Stock + Category.
//
// Usage:
//   node import-books.js path/to/catalog.xlsx
//   node import-books.js path/to/catalog.csv --dry-run
//   node import-books.js path/to/catalog.json --shelf=new
//
// Env vars (in .env):
//   SANITY_PROJECT_ID
//   SANITY_DATASET=production
//   SANITY_WRITE_TOKEN     (Editor permissions)

import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@sanity/client';
import xlsx from 'xlsx';
import { fetchBookMetadata, extractEdition, normalisePublisher, normaliseCategory } from './lib/metadata.js';

// ─── CLI args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const shelfArg = args.find((a) => a.startsWith('--shelf='))?.split('=')[1];

if (!file) {
  console.error('Usage: node import-books.js <file.xlsx|csv|json> [--dry-run] [--shelf=featured]');
  process.exit(1);
}

// ─── Sanity client ────────────────────────────────────────────────────────
const sanity = !dryRun
  ? createClient({
      projectId: process.env.SANITY_PROJECT_ID,
      dataset: process.env.SANITY_DATASET || 'production',
      token: process.env.SANITY_WRITE_TOKEN,
      useCdn: false,
      apiVersion: '2024-01-01',
    })
  : null;

if (!dryRun && !process.env.SANITY_WRITE_TOKEN) {
  console.error('SANITY_WRITE_TOKEN is required (or use --dry-run).');
  process.exit(1);
}

// ─── Column mapping (edit per client format) ──────────────────────────────
// Maps "client column header" → our internal field. Case-insensitive match.
const COLUMN_MAP = {
  // identifiers
  'isbn': 'isbn', 'isbn13': 'isbn', 'isbn 13': 'isbn',
  // pricing & stock
  'mrp': 'mrp', 'm.r.p': 'mrp', 'list price': 'mrp', 'printed price': 'mrp',
  'price': 'price', 'sale price': 'price', 'selling price': 'price', 'our price': 'price',
  'stock': 'stock', 'qty': 'stock', 'quantity': 'stock', 'closing stock': 'stock',
  // metadata fallbacks (used only if metadata API has nothing)
  'title': 'title', 'book name': 'title', 'name': 'title',
  'author': 'author', 'author name': 'author', 'authors': 'author',
  'edition': 'edition', 'ed': 'edition',
  'publisher': 'publisher',
  // category
  'category': 'category', 'subject': 'category', 'course': 'category',
  // shelf override
  'shelf': 'shelf', 'shelf type': 'shelf',
  'tag': 'tag',
};

// ─── Load file ────────────────────────────────────────────────────────────
function loadRows(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  if (ext === 'json') {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  }
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    const wb = xlsx.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return xlsx.utils.sheet_to_json(sheet, { defval: null });
  }
  throw new Error(`Unsupported file type: .${ext}`);
}

// Map row keys (any case, any aliases) → our canonical field names
function normaliseRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (value == null || value === '') continue;
    const target = COLUMN_MAP[key.toLowerCase().trim()];
    if (target) out[target] = value;
  }
  return out;
}

// Sanitise the cleaned row → final book document
async function buildBook(rawRow, opts) {
  const r = normaliseRow(rawRow);

  // Fetch metadata from ISBN if we have one
  let meta = null;
  if (r.isbn) {
    process.stdout.write(`  fetching ${r.isbn}…`);
    meta = await fetchBookMetadata(r.isbn);
    console.log(meta ? ` ✓ ${meta.source}` : '  no match');
  }

  const title = r.title || meta?.title;
  if (!title) throw new Error('No title and no ISBN match — skipping');

  const author = r.author || meta?.authors?.[0];
  const publisher = normalisePublisher(r.publisher || meta?.publisher);
  const edition = r.edition || extractEdition(title) || (meta && extractEdition([meta.title, meta.subtitle].filter(Boolean).join(' ')));
  const description = meta?.description?.replace(/<[^>]+>/g, '').trim();
  const pages = meta?.pageCount;
  const language = meta?.language === 'en' ? 'English' : meta?.language;

  // Slugify ID — stable across re-imports (same ISBN → same _id)
  const id = `book-${(r.isbn || title).toString().replace(/\W/g, '-').toLowerCase().slice(0, 60)}`;

  return {
    _id: id,
    _type: 'book',
    title: title.trim(),
    author: author?.trim(),
    edition,
    isbn: r.isbn,
    publisher,
    pages,
    language,
    description,
    mrp: Number(r.mrp) || undefined,
    price: Number(r.price) || undefined,
    stock: Number(r.stock || 0),
    category: normaliseCategory(r.category),
    shelf: r.shelf || opts.shelf || 'featured',
    tag: r.tag,
    archived: false,
    coverUrl: meta?.coverUrl,    // import script will use this; UI editor can override
  };
}

// Upload a remote image URL to Sanity assets
async function uploadCover(book) {
  if (!book.coverUrl) return null;
  try {
    const res = await fetch(book.coverUrl);
    if (!res.ok || res.headers.get('content-length') === '0') return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return null;  // probably a "no cover" placeholder image
    const asset = await sanity.assets.upload('image', buf, {
      filename: `${book.isbn || book._id}.jpg`,
    });
    return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
  } catch (err) {
    console.warn(`  cover upload failed: ${err.message}`);
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Loading ${file}${dryRun ? ' (dry run)' : ''}…`);
  const rows = loadRows(resolve(file));
  console.log(`Found ${rows.length} rows.\n`);

  const opts = { shelf: shelfArg };
  const ok = [];
  const failed = [];

  for (let i = 0; i < rows.length; i++) {
    console.log(`[${i + 1}/${rows.length}] ${rows[i].title || rows[i].ISBN || rows[i]['Title'] || '?'}`);
    try {
      const book = await buildBook(rows[i], opts);

      if (!dryRun) {
        const cover = await uploadCover(book);
        if (cover) book.cover = cover;
        delete book.coverUrl;
        await sanity.createOrReplace(book);
      }

      ok.push(book);
      // Rate-limit: Google Books = unlimited, Open Library = 100/min, Sanity write = 25/sec
      await new Promise((r) => setTimeout(r, 250));
    } catch (err) {
      console.error(`  ✗ ${err.message}`);
      failed.push({ row: i + 1, error: err.message, data: rows[i] });
    }
  }

  // Save report
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  writeFileSync(`./import-report-${stamp}.json`,
    JSON.stringify({ ok: ok.length, failed: failed.length, failures: failed, ranAt: new Date(), dryRun }, null, 2));

  console.log(`\n──────────────────────────────────────`);
  console.log(`Imported: ${ok.length} / ${rows.length}`);
  console.log(`Failed:   ${failed.length}`);
  console.log(`Report:   import-report-${stamp}.json`);
  if (failed.length) {
    console.log(`\nFirst 3 failures:`);
    failed.slice(0, 3).forEach((f) => console.log(`  row ${f.row}: ${f.error}`));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
