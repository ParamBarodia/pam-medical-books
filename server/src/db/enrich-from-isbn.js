// Enrich every book in the SQLite catalog with real metadata fetched by ISBN.
// Reads books.isbn, queries Google Books → Open Library, populates cover_url.
// Optionally backfills publisher/pages/description if upstream has better data.
//
// Run: node src/db/enrich-from-isbn.js          (only fills missing covers)
//      node src/db/enrich-from-isbn.js --force  (overwrites existing covers)
//      node src/db/enrich-from-isbn.js --dry-run (no writes)
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import db from './index.js';
import { fetchBookMetadata } from '../../../scripts/lib/metadata.js';

const force  = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');

const __dirname = dirname(fileURLToPath(import.meta.url));
const COVERS_DIR = resolve(__dirname, '../../public/covers');
mkdirSync(COVERS_DIR, { recursive: true });

// Google Books serves an "image not available" placeholder for ISBNs without
// real covers. The placeholder is the same image every time → fingerprintable
// by byte length (~15.5 KB). Anything in this range is rejected.
const GOOGLE_PLACEHOLDER_MIN = 15300;
const GOOGLE_PLACEHOLDER_MAX = 15700;

async function fetchImage(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 MedShelf/1.0' } });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1500) return null; // tiny = OL placeholder
    return buf;
  } catch { return null; }
}

function isGooglePlaceholder(buf) {
  return buf.length >= GOOGLE_PLACEHOLDER_MIN && buf.length <= GOOGLE_PLACEHOLDER_MAX;
}

// Convert ISBN-13 to ISBN-10 (older OL records are indexed under ISBN-10).
// Returns null if the input isn't a 978-prefixed ISBN-13.
function isbn13to10(isbn13) {
  const s = String(isbn13).replace(/[^\d]/g, '');
  if (s.length !== 13 || !s.startsWith('978')) return null;
  const core = s.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * Number(core[i]);
  const check = (11 - (sum % 11)) % 11;
  return core + (check === 10 ? 'X' : String(check));
}

async function olCoverByIsbn(isbn) {
  if (!isbn) return null;
  const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  const buf = await fetchImage(url);
  return buf ? { url, source: `open-library/isbn:${isbn}` } : null;
}

async function olCoverByTitleAuthor(title, author) {
  try {
    const q = new URLSearchParams({
      title: title || '',
      author: author || '',
      limit: '5',
    }).toString();
    const res = await fetch(`https://openlibrary.org/search.json?${q}`,
      { headers: { 'User-Agent': 'MedShelf/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    for (const doc of data.docs || []) {
      if (!doc.cover_i) continue;
      const url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      const buf = await fetchImage(url);
      if (buf) return { url, source: 'open-library/search' };
    }
  } catch {}
  return null;
}

// Try Google → OL by ISBN-13 → OL by ISBN-10 → OL search by title+author.
async function findRealCoverUrl(isbn, googleUrl, title, author) {
  if (googleUrl) {
    const upgraded = googleUrl
      .replace(/^http:/, 'https:')
      .replace(/&edge=curl/, '')
      .replace(/zoom=\d/, 'zoom=2');
    const buf = await fetchImage(upgraded);
    if (buf && !isGooglePlaceholder(buf)) return { url: upgraded, source: 'google-books' };
  }
  const ol13 = await olCoverByIsbn(isbn);
  if (ol13) return ol13;

  const isbn10 = isbn13to10(isbn);
  if (isbn10) {
    const ol10 = await olCoverByIsbn(isbn10);
    if (ol10) return ol10;
  }

  const olSearch = await olCoverByTitleAuthor(title, author);
  if (olSearch) return olSearch;

  return null;
}

const rows = db.prepare(
  `SELECT id, title, author, isbn, cover_url FROM books WHERE isbn IS NOT NULL AND isbn <> ''`
).all();

console.log(`Found ${rows.length} books with ISBNs.${dryRun ? ' (dry run)' : ''}\n`);

let okCount = 0, skipCount = 0, missCount = 0;
const update = db.prepare(`
  UPDATE books SET
    cover_url   = @cover_url,
    publisher   = COALESCE(@publisher,   publisher),
    pages       = COALESCE(@pages,       pages),
    language    = COALESCE(@language,    language)
  WHERE id = @id
`);
const clearCover = db.prepare('UPDATE books SET cover_url = NULL WHERE id = ?');

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  if (r.cover_url && !force) { skipCount++; continue; }

  process.stdout.write(`[${i + 1}/${rows.length}] ${r.title.slice(0, 50).padEnd(50)} `);
  const meta = await fetchBookMetadata(r.isbn);

  const real = await findRealCoverUrl(r.isbn, meta?.coverUrl, r.title, r.author);
  if (!real) {
    console.log('— no real cover (using procedural)');
    if (!dryRun && r.cover_url) clearCover.run(r.id); // wipe any stale placeholder
    missCount++; continue;
  }

  // Download the image and save it locally so we don't depend on OL's
  // flaky CDN at request time.
  const buf = await fetchImage(real.url);
  if (!buf) {
    console.log('— upstream gone after lookup (using procedural)');
    if (!dryRun && r.cover_url) clearCover.run(r.id);
    missCount++; continue;
  }
  const localPath = resolve(COVERS_DIR, `${r.id}.jpg`);
  const localUrl  = `/covers/${r.id}.jpg`;
  if (!dryRun) {
    writeFileSync(localPath, buf);
    update.run({
      id: r.id,
      cover_url:   localUrl,
      publisher:   meta?.publisher || null,
      pages:       meta?.pageCount || null,
      language:    meta?.language === 'en' ? 'English' : meta?.language || null,
    });
  }
  console.log(`✓ ${real.source} (${buf.length} bytes)`);
  okCount++;

  // Be polite to upstream APIs
  await new Promise((r) => setTimeout(r, 250));
}

console.log(`\n──────────────────────────────────────`);
console.log(`Updated:    ${okCount}`);
console.log(`Skipped:    ${skipCount} (already had cover; use --force to refresh)`);
console.log(`No match:   ${missCount}`);
