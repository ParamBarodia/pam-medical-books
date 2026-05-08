# How the Client Sends You Book Data

Most clients don't have a clean Excel sheet. They have a mix of paper registers, Tally exports, publisher PDFs, and WhatsApp photos. Your job is to give them ONE simple template and accept whatever else they have.

---

## Step 1 — Send them THIS Google Sheet template

Create a new Google Sheet titled **"MedShelf Book Catalog"**, share it with them via link (Editor access), and pre-fill 3-5 sample rows so they understand the format.

### Column structure (copy-paste headers into row 1)

| Column | Required? | Example | What goes here |
|---|---|---|---|
| `id` | leave blank | (auto) | I'll generate this |
| `title` | ✅ Yes | Robbins Basic Pathology | Full book name |
| `author` | ✅ Yes | Vinay Kumar | Main author only |
| `edition` | ✅ Yes | 11th Ed | "11th Ed" or "11/e" or "11th 2024" |
| `isbn` | ⭐ Strong yes | 9780323790185 | 13-digit ISBN, find on back cover |
| `publisher` | ⭐ Strong yes | Elsevier | Elsevier / Jaypee / CBS / Wolters Kluwer |
| `mrp` | ✅ Yes | 2295 | Printed price on book (no ₹ symbol, no comma) |
| `price` | ✅ Yes | 1799 | Selling price after discount (no ₹, no comma) |
| `stock` | ✅ Yes | 18 | How many copies in shop right now |
| `category` | ✅ Yes | MBBS | One of: MBBS, BDS, Nursing, NEET-PG, MD/MS, Faculty |
| `pages` | optional | 952 | Number of pages |
| `language` | optional | English | Default English |
| `description` | optional | "Concise pathology textbook…" | 1-3 sentences for the website |
| `tag` | optional | Bestseller | Bestseller / New Edition / Top Pick / blank |
| `cover_url` | optional | https://... | Public URL of book cover photo (see Step 2) |
| `cover_filename` | optional | robbins-11.jpg | If they're sending photos via WhatsApp/Drive |

### Sample row to pre-fill so they understand

```
title: Robbins Basic Pathology
author: Vinay Kumar
edition: 11th Ed
isbn: 9780323790185
publisher: Elsevier
mrp: 2295
price: 1799
stock: 18
category: MBBS
pages: 952
description: The gold standard pathology textbook for medical students.
tag: Bestseller
```

### What to tell them

> "Sir, I've shared a Google Sheet. Please fill what you can.
>
> **Must have:** title, author, edition, MRP, price, stock, category.
> **Strongly recommended:** ISBN and publisher (helps me auto-fetch missing data).
> **Skip if you don't have:** description, tag, cover photo URL.
>
> Even 50 books at a time is fine — send in batches as you have time. Don't wait to do all 1000 at once."

---

## Step 2 — Handling cover photos (the tricky part)

Most clients have NO digital photos of book covers. Five realistic options, in order of preference:

### Option A — ISBN-based auto-fetch (BEST, free)

If the client gives you ISBN numbers, you can auto-download cover images from free APIs:

```javascript
// Open Library — completely free, no signup
const cover = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

// Google Books API — also free
const cover = `https://books.google.com/books/content?id=${isbn}&printsec=frontcover&img=1&zoom=1`;
```

**Coverage:** ~70% of medical textbooks already have covers in these APIs.

**Tell the client:** "If you give me ISBNs, I can pull most book covers automatically — you don't need to photograph them."

### Option B — Publisher digital catalog

Most publishers (Elsevier, Jaypee, CBS) have digital catalogs/websites with cover images.
- Elsevier: https://www.elsevier.com/books-and-journals
- Jaypee: https://www.jaypeedigital.com
- CBS Publishers: https://www.cbspd.com

You can write a small script to download by ISBN or publisher catalog ID. **Legal note:** This is grey area — for personal/internal use it's fine, for redistribution check publisher terms. Most accept it because the bookstore is helping sell their books.

### Option C — Client photographs in bulk

If they want to do it themselves:

> "Sir, take photos of book covers using your phone in good light, on a plain background (white desk works). Name each file as the ISBN like `9780323790185.jpg`. Upload all photos to a Google Drive folder and share the link with me. I'll handle resizing and uploading to the website."

**Realistic time:** ~3 hours for 100 books. Tell them to do it across 2-3 days, not at once.

### Option D — You photograph at their shop

If the client is local and has a relationship with you:

> "Sir, I can come to the shop on Saturday morning with my phone. I'll photograph 100 books in 2 hours, then upload to the website that night."

**Photography tips for the client (or you):**
- Phone camera is fine — DO NOT use flash
- Plain white desk or white paper background
- Hold phone parallel to book (avoid skew)
- Crop to just the cover (no hands, no clutter)
- Save as JPEG, ~1500 px wide is plenty

### Option E — Procedural placeholder (fallback)

For books we have no cover for, the existing procedural cover (the colored rectangle with title + author) renders automatically. Looks better than a broken image, and customers click through to read.

**Recommended approach:** Use Option A (ISBN auto-fetch) for ~70%, ask client for Option C for the rest, fall back to Option E for any stragglers.

---

## Step 3 — The realistic flow when client doesn't have a clean list

### Scenario 1: Client has a clean Excel from publisher

**You receive:** `MedShelf-Books-2026.xlsx` from WhatsApp

**You do:**
1. Open in Google Sheets — check column names
2. Add a sheet "mapping" that maps their columns to yours
3. Run `node scripts/import-books.js MedShelf-Books-2026.xlsx`
4. Books appear in Sanity within minutes

**Time:** 30 min

### Scenario 2: Client has a Tally export

**You receive:** A printed PDF or CSV from Tally with book inventory

**You do:**
1. Tally exports usually have: item name, sale rate, MRP, closing stock, HSN code
2. The sale rate maps to `price`, MRP maps to `mrp`, closing stock maps to `stock`
3. Title needs cleanup — Tally items often have prefixes like "BOOK_ROBBINS"
4. Run a Python script to clean + convert to your CSV format
5. Then run the importer

**Time:** 2-3 hours for the cleanup script + import

### Scenario 3: Client has a paper register

**You receive:** Photos of handwritten ledger books

**You do:**
1. Use Google Lens / Apple Notes OCR to extract text
2. Type into your Google Sheet template
3. **OR** hire a freelancer on Internshala / Fiverr for ₹500-1000 to do data entry of 200 books

**Time:** 5-10 hours for 1000 books, OR ₹2-5K + 2 days outsourced.

### Scenario 4: Client only knows what they sell, no organized list

**You do:** Don't try to capture all 1000 at once.

1. Open Sanity Studio together over a Zoom call
2. Have the client mention 20-30 of their bestsellers
3. Type them in live during the call
4. Launch with 30 books on the homepage
5. Add the rest gradually over 2-3 weeks via WhatsApp messages: "Sir, send me details of next 50 books"

**This is the most common scenario for small Indian shops.** It's fine.

### Scenario 5: Client says "scrape from publisher websites"

**You do:**
1. Confirm with client this is okay — get it in writing
2. Write a Python + Playwright scraper for each publisher (Elsevier, Jaypee, etc.)
3. Run overnight, generate CSV, import

**Time:** 1-2 days per publisher. Brittle if their site changes.

**Risk:** Some publishers ban scraper IPs. Use rate limiting (1 req every 3 sec) and rotate user-agents.

---

## Step 4 — What you build to receive the data

A single import script that handles ANY column structure.

`scripts/import-books.js`:

```javascript
// Node.js — handles xlsx, csv, json, all in one
import xlsx from 'xlsx';
import { createClient } from '@sanity/client';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: 'production',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
  apiVersion: '2024-01-01',
});

// Mapping config — change per client format
const COLUMN_MAP = {
  // their column → our field
  'Book Name':       'title',
  'Author Name':     'author',
  'Edition':         'edition',
  'ISBN':            'isbn',
  'Publisher':       'publisher',
  'MRP':             'mrp',
  'Sale Price':      'price',
  'Stock':           'stock',
  'Category':        'category',
  'Description':     'description',
};

const CATEGORY_MAP = {
  'MBBS': 'MBBS', 'M.B.B.S': 'MBBS',
  'BDS': 'BDS', 'B.D.S': 'BDS',
  'Nursing': 'Nursing', 'GNM': 'Nursing',
  'PG': 'NEET-PG', 'NEET PG': 'NEET-PG',
  // …
};

async function fetchCoverFromISBN(isbn) {
  if (!isbn) return null;
  const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  const asset = await sanity.assets.upload('image', Buffer.from(buf), { filename: `${isbn}.jpg` });
  return { _type: 'image', asset: { _ref: asset._id } };
}

async function importFile(path) {
  const wb = xlsx.readFile(path);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  for (const row of rows) {
    const doc = { _type: 'book', shelf: 'featured', archived: false };
    for (const [theirCol, ourField] of Object.entries(COLUMN_MAP)) {
      if (row[theirCol] != null) doc[ourField] = row[theirCol];
    }
    doc.category = CATEGORY_MAP[doc.category] || 'MBBS';
    doc.mrp = Number(doc.mrp);
    doc.price = Number(doc.price);
    doc.stock = Number(doc.stock || 0);
    doc._id = `book-${(doc.isbn || doc.title).replace(/\W/g, '-').toLowerCase()}`;

    // Try to auto-fetch cover from Open Library
    const cover = await fetchCoverFromISBN(doc.isbn);
    if (cover) doc.cover = cover;

    await sanity.createOrReplace(doc);
    console.log(`✓ ${doc.title}`);
    await new Promise(r => setTimeout(r, 200));   // rate limit
  }

  console.log(`Done. ${rows.length} books imported.`);
}

importFile(process.argv[2]);
```

Run with:
```bash
node scripts/import-books.js client-data.xlsx
```

**For each new client format**, you only update the `COLUMN_MAP` object — 30 seconds of work.

---

## Step 5 — Post-import verification

After import, the client opens Sanity Studio and:

1. Sorts books by `cover` field — sees which ones have no cover
2. For each missing cover: uploads from phone OR you fall back to procedural
3. Spot-checks 10 random books for: title spelling, price, stock count
4. Marks any wrong ones — you re-run import for those rows only

**Important:** Don't go live until the top 100 bestsellers are verified. The long tail can be cleaned up post-launch.

---

## Step 6 — Ongoing book additions (after launch)

Once the site is live, the client adds new books in two ways:

### A. One book at a time → Sanity Studio directly

Click "+ New Book" → fill form → Save. ~2 min per book.

### B. New publisher catalog of 50+ books → Send you the file

Client WhatsApps the file → you run the importer → books appear → client reviews & publishes. ~30 min for you.

**Set expectation:** "Sir, books over 50 at a time, please send me the file. Below 50, just add them yourself in Sanity."

---

## TL;DR — what to literally tell the client

Send this WhatsApp:

```
Sir, for sending the book list — share what you have, in any format:

✅ Best: Excel/Google Sheet with columns:
   Title, Author, Edition, ISBN, Publisher, MRP, Price, Stock, Category

✅ Also OK: Tally export, publisher PDFs, even photos of register

✅ Cover photos:
   - If you give ISBNs, I can auto-download ~70% of covers
   - For the rest: photograph on plain white background OR I'll come do it
   - Worst case, system shows a styled placeholder — still looks good

Don't worry about doing all 1000 at once — start with your top 50-100 bestsellers.
We can launch with those and add the rest over 2-3 weeks.

Even partial data is fine — send what you have, I'll handle the rest.
```

---

## Quick reference card

| Client gives you | You do | Time |
|---|---|---|
| Clean Excel matching template | `node import-books.js file.xlsx` | 30 min |
| Excel with different columns | Update `COLUMN_MAP`, then import | 1 hour |
| Tally export (CSV/PDF) | Cleanup script → CSV → import | 2-3 hours |
| Publisher PDF catalogs | Manual entry OR scrape script | 1 day |
| Paper register photos | OCR + manual cleanup OR outsource ₹2-5K | 2 days |
| "I don't have anything organized" | Sit together in Sanity Studio, type top 30 live | 1 hour Zoom call |
| Photos of covers via Drive folder | Bulk upload script → Sanity assets | 2 hours |
| ISBNs only, no covers | Auto-fetch from Open Library API | 1 hour |
| Nothing — wants you to find covers | Scrape publisher sites by ISBN | 1-2 days |
