# MedShelf — Scaling to 1000+ Books

This is a planning document for the contractor (you) who will build and operate
MedShelf solo. It contains: the questions to ask the client at the next meeting,
the recommended architecture (with cost), and the order things should be built in.

---

## 📋 Part 1 — Client Discovery Checklist

**Take these questions to your next client meeting.** Each answer changes what
gets built. Mark which ones the client already answered, then come back to me
with whatever's still open.

### A. Catalog scope

1. **How many books at launch?** _(50? 200? 1000? all 5000 they sell?)_
2. **Will it grow?** _(static catalog vs new books added monthly)_
3. **What categories does the client think in?**
   _(MBBS Y1/Y2/Y3/Y4, BDS, Nursing, NEET-PG, etc. — get THEIR taxonomy, not ours)_
4. **Are there variants per book?** _(Volume 1 vs 2, soft vs hardcover, India edition vs international)_
5. **Anything beyond books?** _(Stethoscopes, dissection kits, equipment — like Medioks does)_

### B. Where the data comes from

6. **Do they have a master list anywhere today?**
   _(Excel sheet? Google Sheet? Tally / Vyapar accounting software? On paper?)_
7. **How do they get books from publishers?**
   _(Publisher sends an Excel? They walk into the warehouse and check?)_
8. **Who has the cover images?**
   _(Publisher PDFs? Photos they took? Scrape from Amazon? They want me to
   photograph them?)_
9. **ISBNs available?** _(Critical — ISBN unlocks free metadata via Google Books / Open Library APIs)_
10. **Pricing — fixed by publisher (MRP) or do they discount?**

### C. Operations

11. **Who edits the catalog after launch?** _(You? The client? Their shop staff?)_
12. **How often do prices/stock change?** _(Daily / weekly / when a publisher revises)_
13. **Stock tracking — real or just "in stock / out of stock"?**
14. **Which payment methods?** _(UPI / cards / COD / Razorpay account already?)_
15. **Delivery — own delivery or courier?** _(Shiprocket / Delhivery / India Post / their own bike?)_
16. **Returns — accept them?** _(Affects checkout copy + policy page)_

### D. Business rules they expect

17. **Free shipping threshold?** _(₹499 like Medioks? ₹999? Never free?)_
18. **Discounts** — flat 10% off MRP? Tiered (₹100 off ₹5K+, ₹200 off ₹10K+)?
    Coupon codes?
19. **Bulk orders for colleges?** _(Different pricing? Different checkout?)_
20. **Sell internationally?** _(India-only is much simpler — no GST exports etc.)_

### E. Technical / legal

21. **Domain name** — already registered? GoDaddy / BigRock / Cloudflare?
22. **GST number** — do they have one? _(Required for invoices)_
23. **Existing accounts** — Razorpay? Shiprocket? They might have these already.
24. **Hosting budget** — willing to spend ₹0/mo, ~₹500/mo, ~₹2K/mo? _(Determines free vs paid services)_
25. **Mobile app later, or web-only forever?**

---

## 🏛 Part 2 — Recommended Architecture

This works no matter what the client answers in Part 1. **None of these pieces
require commitment** — we can swap any of them later.

### The five separate concerns

| Concern | Tool | Cost |
|---|---|---|
| **Catalog** (book data) | Sanity Studio (CMS) | ₹0 (free up to 10K docs) |
| **Images** | Sanity built-in CDN | ₹0 (10 GB bandwidth/mo) |
| **Search** | Sanity GROQ + simple client filtering | ₹0 (or Algolia at ₹0–₹3K/mo if needed) |
| **Orders / cart / auth** | Express + Postgres on Neon | ₹0 (3 GB free tier) |
| **Payments** | Razorpay (test → live) | 2% per transaction |
| **Hosting (frontend)** | Vercel | ₹0 |
| **Hosting (backend)** | Render free tier | ₹0 (cold starts after 15 min idle) |
| **Domain** | (client provides) | ₹500–₹1500/yr |

**Total monthly cost at 1000 books, ~500 orders/mo: ~₹0**.
**At ~5000 orders/mo:** Render backend → ₹600/mo, Sanity overage ~₹0,
Razorpay 2% (already in unit economics). Domain + email = another ₹100/mo.
**Realistic ceiling: ₹2,000/mo** before you outgrow free tiers.

### Why Sanity for the catalog

> "Best would be using something to fetch data instead of dumping images in the website" — your words.

Sanity is exactly that. Three things it solves at once:

1. **Editor UI for free.** Sanity Studio is a polished React app. You log in,
   paste book data, upload cover, save. No admin panel to build.

2. **Image CDN built-in.** When you upload a cover, Sanity auto-serves WebP/AVIF
   in 12 sizes from a global CDN. Your site requests
   `cover.webp?w=200` for a card and `cover.webp?w=600` for the modal.
   You never store images in your repo or your DB.

3. **Schema as code.** The book "shape" lives in `sanity/schemas/book.ts`
   in git. You version-control it like any other code. The Studio updates
   automatically when you change the schema.

### How a book flows through the system

```
[Client gives you data] → [You paste into Sanity Studio (or run CSV importer)]
                              │
                              ↓
                     [Sanity API serves JSON via CDN]
                              │
                              ↓
                     [Your Vite/Next.js frontend fetches]
                              │
                              ↓
                     [User browses, adds to cart]
                              │
                              ↓
                  [Cart hits your Express + Postgres backend]
                              │
                              ↓
                     [Razorpay test/live payment]
                              │
                              ↓
                     [Order persisted in Postgres]
```

**Two backends, on purpose.** Sanity does what it's great at (content + images);
your Express + Postgres does what Sanity is bad at (transactional orders, auth,
inventory locks). Don't try to do orders in Sanity — it's read-optimized.

### Image strategy (the part you specifically asked about)

For 1000 covers ≈ 200 MB of original files. Three approaches in order of
preference:

1. **Upload to Sanity** (recommended) — single source of truth, automatic
   resize/format, free up to 10 GB bandwidth/mo. With WebP at 200×280 most
   covers will be 8–15 KB each → a 24-card homepage transfers ~250 KB total.
   Lighthouse-friendly out of the box.

2. **Hotlink publisher CDNs** — store the URL, never the image. Zero storage
   cost; risk: publisher rotates URLs, image disappears, you can't optimize
   format.

3. **Cloudflare R2 + custom domain** — only worth it past 10 GB/mo bandwidth,
   which is unlikely until you're past 50K monthly visits.

Start with #1; revisit if/when bandwidth becomes an issue.

### Search strategy (so 1000 books ≠ 1000 books shipped to the browser)

The frontend never receives 1000 books at once. It only ever fetches what's
on screen:

| Page | Fetch |
|---|---|
| Homepage | 8 featured + 8 new arrivals + 4 forthcoming + 4 used = 24 books |
| Category page | 24 books per page (MBBS shows 24, "load more" = next 24) |
| Search results | Whatever matches the query, paginated 24 at a time |
| Product page | Just that one book + 4 "you might also like" |

That's how Amazon shows 100M products in the same browser memory: pagination
+ filters server-side. Your existing `GET /api/books?shelf=...&category=...&q=...`
already does this — it just needs `&limit=24&offset=0` cursor params added.

Sanity has GROQ (their query language) which does this natively. No DB query
optimization needed.

---

## 🛣 Part 3 — Build Order (after client answers Part 1)

| Sprint | Deliverable | Depends on |
|---|---|---|
| **1** | Sanity project + book schema + 5 hand-typed books showing in current frontend | nothing |
| **2** | Frontend fetches from Sanity instead of hardcoded data | Sprint 1 |
| **3** | CSV importer (whatever format the client provides) + bulk import 1000 books | Sprint 1 + client data |
| **4** | Migrate existing Express+SQLite to Express+Postgres on Neon | nothing |
| **5** | Razorpay live keys + production checkout flow | client Razorpay account |
| **6** | Deploy: frontend → Vercel, backend → Render, Sanity → already cloud | domain |
| **7** | Order confirmation emails (Resend / Brevo free tier) | Sprint 5 |
| **8** | SEO basics: sitemap, structured data per book, server-rendered HTML | Sprint 2 |

Each sprint is ~3–5 days for one developer. Total: ~5–6 weeks to a launchable
v1 once the client answers discovery questions.

---

## 🎯 Decision Log

| # | Decision | Why | Alternatives rejected |
|---|---|---|---|
| 1 | Headless CMS (Sanity) for catalog | Free editor UI + image CDN built-in | Custom admin (more code), Strapi (self-host headache), Spreadsheet (no images) |
| 2 | Express + Postgres for orders | Transactional, you already wrote it | Sanity for orders (read-optimized, bad for writes), Supabase (lock-in, more to learn at once) |
| 3 | Sanity image CDN over self-host | Zero ops, 10 GB free, auto-format | Cloudinary (overkill), R2 (need own CDN), Hotlink (publisher controls availability) |
| 4 | Pagination always (24 per page) | 1000 books never arrive at once | "Load all then filter client-side" (200KB+ JSON, slow) |
| 5 | Two backends not one | Each does what it's best at | All-in-one Strapi/Supabase (more lock-in) |
| 6 | Vercel + Render free tiers | Real cost-zero baseline | Self-hosted VPS (ops burden), AWS (overkill, $$) |

---

## ⚠️ Risks acknowledged

1. **Render free tier sleeps after 15 min idle.** First request after sleep
   takes ~30 sec to wake. Mitigation: ping it every 10 min from a free uptime
   service (UptimeRobot), or pay ₹600/mo when traffic justifies.

2. **Sanity vendor lock-in.** Schema is yours, but exporting 5000 documents
   if you leave is a one-day script — not unbearable.

3. **Publisher cover image rights.** If you scrape covers from Amazon /
   publisher sites, technically a grey area. Mitigation: ask client to
   confirm publisher relationships allow it, OR use only client-provided
   scans.

4. **GST invoice generation** is a real legal requirement for ₹40L+ revenue.
   Razorpay generates invoices for you — confirm with client.

5. **Single point of failure: you.** Nothing stops the client from being
   stranded if you disappear. Mitigation: README in repo, schema versioned
   in git, Sanity Studio is recoverable from any account with the project ID.

---

## ✅ What to do next

1. **Take Part 1 to the client meeting.** Get answers, especially Q6
   ("master list anywhere?") and Q8 ("who has the cover images?"). Those
   two answers determine the next 2 sprints.

2. **Without waiting for the client** you can:
   - Spin up a Sanity project for free (10 min)
   - Define the `book` schema matching the existing data shape
   - Hand-type 5 real books to test the import path
   - Make the existing frontend fetch from Sanity instead of the local API

3. **After client meeting,** come back with:
   - Catalog size confirmed
   - Data source confirmed (CSV / Excel / scrape / type)
   - Razorpay account status
   - Domain name

Then I'll write the actual sprint-1 code.
