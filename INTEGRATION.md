# MedShelf — Integration Master Plan

The single source of truth for **how to build the production system** end to end.
Everything else (PLAN, EXPLAINER, OPERATIONS, CLIENT-ASKS) feeds into this.

When you ask "what should I do next?" — open this doc, find the next unchecked
box, and do that.

---

## 0. Executive Summary

| | |
|---|---|
| **Goal** | Replace the demo `MedShelf.html` + local-only stack with a production ecommerce site running on free/cheap cloud infrastructure |
| **Target launch** | ~5-6 weeks after the client returns the must-have items in `CLIENT-ASKS.md` |
| **Total dev time** | ~25 working days for one developer |
| **Monthly running cost at v1** | ₹0 (everything free tier) |
| **Per-order cost** | ~2% Razorpay + ~₹70 Shiprocket = ~₹100 on a ₹2,000 order |
| **Current state** | Frontend (Vite + React) and backend (Express + node:sqlite) work locally. Catalog hardcoded, payments mocked, no email/courier. |
| **Target state** | Catalog in Sanity. Postgres on Neon. Razorpay live. Shiprocket integrated. Vercel + Render hosting. Backups + monitoring + admin dashboard live. |

---

## 1. System Architecture (final)

```
                        ┌──────────────────────────────────────┐
                        │  CUSTOMERS (browsers, mobile)         │
                        └────┬─────────────────────────────┬───┘
                             │                             │
                fetch books / images                  cart / orders
                             │                             │
                             ▼                             ▼
            ┌────────────────────────┐    ┌─────────────────────────────────┐
            │   📚 Sanity            │    │   ⚙️  YOUR BACKEND                │
            │   (Catalog + CDN)      │◀───│   Express + Postgres on Render  │
            │   • Book schema        │    │   • /api/cart  /api/orders      │
            │   • Editor Studio      │    │   • /api/auth  /api/admin/*     │
            │   • Image pipeline     │    │   • Razorpay webhook handler    │
            │   • Stock decrement    │    │   • Shiprocket webhook handler  │
            │     via webhook        │    │                                 │
            └────────┬───────────────┘    └────┬────────────────────────────┘
                     │                         │
        edits via Studio              ┌────────┼─────────┬────────────┐
                     │                ▼        ▼         ▼            ▼
            ┌────────────────┐   ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐
            │  🏪 CLIENT     │   │ Razorpay│ │Shiprocket│ │  Resend  │ │ Sanity │
            │  (Sanity Studio│   │  (pay)  │ │ (deliver)│ │ (email)  │ │ (stock)│
            │   + admin app) │   └─────────┘ └──────────┘ └──────────┘ └────────┘
            └────────────────┘

            ┌─────────────────┐
            │  👨‍💻 YOU         │
            │  GitHub + Vercel + Render + UptimeRobot + Sentry + GitHub Actions (cron)
            └─────────────────┘
```

### Service inventory

| Service | Role | URL pattern | Free tier |
|---|---|---|---|
| **Sanity** | Catalog + image CDN | `cdn.sanity.io/...` | 10K docs, 10 GB bw, 3 editors |
| **Sanity Studio** | Client's admin UI | `studio.medshelf.in` | included |
| **Vercel** | Frontend hosting | `medshelf.in` | unlimited bandwidth on hobby plan for static |
| **Render** | Backend hosting | `api.medshelf.in` | 750 hrs/mo, sleeps after 15 min idle |
| **Neon** | Postgres DB | `<conn-string>` | 3 GB storage, 1 compute hr/day always-on |
| **Razorpay** | Payments | API + webhooks | 2% per txn (no monthly fee) |
| **Shiprocket** | Couriers | API + webhooks | free up to 100 orders/mo, then ₹19/shipment |
| **Resend** | Email | API | 3,000 emails/mo |
| **GitHub Actions** | Cron + CI | scheduled workflows | 2,000 min/mo |
| **UptimeRobot** | Monitoring | external pings | 50 monitors free |
| **Sentry** | Error tracking | SDK + dashboard | 5K events/mo |

---

## 2. Pre-flight checks (before sprint 1)

Don't write a single line of new code until these are true:

- [ ] All 🔴 must-haves from `CLIENT-ASKS.md` received
- [ ] Razorpay account exists (test keys are fine for now; live can come later)
- [ ] Shiprocket account exists (or decision deferred to post-launch)
- [ ] Domain DNS access granted (you can edit records)
- [ ] GitHub repo created with both `client/` and `server/`
- [ ] Sanity account created (free signup at sanity.io with Google login)
- [ ] Neon account created (free signup at neon.tech with GitHub login)
- [ ] Render account created (free signup at render.com with GitHub login)
- [ ] Vercel account created (free signup at vercel.com with GitHub login)

All accounts: **use the client's email** if they want ownership, **your email** if you'll operate forever. Discuss with the client.

---

## 3. Sprint Plan

Each sprint is 3-5 working days for one developer. Mark each box as you complete.

### Sprint 1 — Sanity foundation _(3 days)_

**Goal:** Sanity project set up, book schema defined, Studio deployed, 5 books hand-typed.

#### Tasks

- [ ] `npm create sanity@latest` in a new folder `sanity/` at project root
  - Choose: TypeScript template, Production dataset, Public read
- [ ] Define `sanity/schemas/book.ts`:
  ```typescript
  export default {
    name: 'book',
    title: 'Book',
    type: 'document',
    fields: [
      { name: 'title',       type: 'string',  validation: r => r.required() },
      { name: 'author',      type: 'string',  validation: r => r.required() },
      { name: 'edition',     type: 'string' },
      { name: 'isbn',        type: 'string' },
      { name: 'publisher',   type: 'string' },
      { name: 'pages',       type: 'number' },
      { name: 'language',    type: 'string', initialValue: 'English' },
      { name: 'mrp',         type: 'number', validation: r => r.required().min(0) },
      { name: 'price',       type: 'number', validation: r => r.required().min(0) },
      { name: 'stock',       type: 'number', validation: r => r.min(0), initialValue: 0 },
      { name: 'cover',       type: 'image',   options: { hotspot: true } },
      { name: 'description', type: 'text', rows: 6 },
      { name: 'category',    type: 'string',  options: { list: ['MBBS','BDS','Nursing','NEET-PG','MD/MS','Faculty'] } },
      { name: 'shelf',       type: 'string',  options: { list: ['featured','new','forthcoming','secondhand'] } },
      { name: 'tag',         type: 'string',  options: { list: ['Bestseller','New Edition','Just In','Top Pick'] } },
      { name: 'arrivalDate', type: 'date' },           // forthcoming only
      { name: 'archived',    type: 'boolean', initialValue: false },  // soft delete
      { name: 'soldCount',   type: 'number', initialValue: 0, hidden: true },  // analytics
    ],
    preview: {
      select: { title: 'title', subtitle: 'author', media: 'cover' },
    },
  };
  ```
- [ ] Define `bundle` schema (similar pattern, with `books` as references)
- [ ] Define `testimonial` schema
- [ ] Define `siteSettings` singleton (promo bar, hero copy, contact, hours)
- [ ] Define `page` schema (rich text — for About, Refund Policy, etc.)
- [ ] Run `npx sanity dev` and verify Studio renders at `localhost:3333`
- [ ] Hand-type 5 real books with covers to test the editor experience
- [ ] `npx sanity deploy` — choose hostname `medshelf-studio` → live at `medshelf-studio.sanity.studio`
- [ ] Optional: configure custom domain `studio.medshelf.in` (CNAME to Sanity)

**Acceptance:** You can log into Studio, edit a book, and the change appears via Sanity API within 30 seconds.

---

### Sprint 2 — Frontend ↔ Sanity wiring _(2 days)_

**Goal:** The site fetches books from Sanity instead of the local Express API for catalog.

#### Tasks

- [ ] `cd client && npm install @sanity/client @sanity/image-url`
- [ ] Add `client/src/sanity.js`:
  ```javascript
  import { createClient } from '@sanity/client';
  import imageUrlBuilder from '@sanity/image-url';

  export const sanity = createClient({
    projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
    dataset:   import.meta.env.VITE_SANITY_DATASET || 'production',
    apiVersion: '2024-01-01',
    useCdn: true,            // serve from CDN — fast, eventual consistency
  });

  const builder = imageUrlBuilder(sanity);
  export const urlFor = (src) => builder.image(src);
  ```
- [ ] Replace `api.books()` in `api.js` with a Sanity GROQ query:
  ```javascript
  // GROQ query — Sanity's query language
  export const fetchBooks = (shelf) => sanity.fetch(
    `*[_type == "book" && shelf == $shelf && !archived]
       | order(rating desc, reviews desc)
     { _id, title, author, edition, mrp, price, rating, reviews,
       category, stock, publisher, isbn, pages, language, description,
       tag, "imageUrl": cover.asset->url, "blurHash": cover.asset->metadata.lqip }`,
    { shelf }
  );
  ```
- [ ] Update `BookCover.jsx` to render Sanity images using `urlFor(book.cover).width(200).format('webp').url()`
- [ ] Add fallback to procedural cover when no Sanity image is set (for graceful upgrades)
- [ ] Wire `useFetch` in `App.jsx` to use `fetchBooks` instead of `api.books`
- [ ] `bundles`, `testimonials`, `siteSettings`, `pages` — same pattern, all GROQ
- [ ] Add loading skeletons (gray paper-warm placeholders) while fetching
- [ ] **Keep** Express API for cart/orders/auth — only the catalog moves to Sanity

**Acceptance:** Site loads books from Sanity. Edit a price in Studio → refresh → new price shows.

**Gotcha:** Sanity's free CDN has ~minute-level eventual consistency. Set `useCdn: false` in admin contexts where the client expects instant feedback.

---

### Sprint 3 — CSV importer _(1-2 days, after client provides data)_

**Goal:** Bulk-load 1000 books from publisher CSV/Excel into Sanity.

#### Tasks

- [ ] Create `scripts/import-books.js` at project root
- [ ] Use `@sanity/client` (write token, not the public one)
- [ ] Map publisher columns → Sanity schema (per publisher format)
- [ ] For each row:
  ```javascript
  const doc = {
    _id: 'book-' + slugify(row.isbn || row.title),
    _type: 'book',
    title: row.title,
    author: row.author,
    isbn: row.isbn,
    mrp: Number(row.mrp),
    price: Number(row.price),
    stock: Number(row.stock || 0),
    shelf: 'featured',
    category: mapCategory(row.category),
    publisher: row.publisher,
    description: row.description,
  };
  await sanity.createOrReplace(doc);
  ```
- [ ] If `cover_url` in CSV: download → upload to Sanity:
  ```javascript
  const buf = await fetch(row.cover_url).then(r => r.arrayBuffer());
  const asset = await sanity.assets.upload('image', Buffer.from(buf), { filename: row.isbn + '.jpg' });
  doc.cover = { _type: 'image', asset: { _ref: asset._id } };
  ```
- [ ] Rate-limit to ~5 req/sec (Sanity has a 25/sec quota on free tier)
- [ ] Run dry-run mode first (`--dry-run` flag) to log what would happen
- [ ] Save import logs to `imports/<timestamp>.log` for audit

**Acceptance:** Run `node scripts/import-books.js publisher-feed.csv` — 1000 books appear in Sanity in ~5 minutes.

**Gotcha:** Always import as `archived: false` AND `shelf: ?` — if shelf is missing, the books won't appear on the homepage.

---

### Sprint 4 — Postgres migration _(1 day)_

**Goal:** Move orders + users + cart from local SQLite to managed Postgres on Neon.

#### Tasks

- [ ] Create Neon project at console.neon.tech (free tier, 3 GB)
- [ ] Copy `DATABASE_URL` connection string
- [ ] `cd server && npm install pg` (replace node:sqlite usage)
- [ ] Convert `server/src/db/schema.js` SQL to Postgres syntax:
  - `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
  - `strftime('%s','now') * 1000` → `EXTRACT(EPOCH FROM NOW()) * 1000`
  - `INTEGER` for booleans → `BOOLEAN`
- [ ] Rewrite `server/src/db/index.js` using `pg` Pool
- [ ] Rewrite `seed.js` to use the new client (or just use `psql` for one-off migration)
- [ ] Run `node src/db/seed.js` against Neon URL — verify rows
- [ ] Update `.env` to use `DATABASE_URL` instead of `DB_PATH`
- [ ] Local dev: keep node:sqlite for tests, Postgres for production

**Acceptance:** Backend boots against Neon, signup + login + cart all work.

**Gotcha:** Neon free tier sleeps the compute after 5 min of no queries. First query takes ~1 sec. UptimeRobot pings (sprint 8) keep it warm.

---

### Sprint 5 — Razorpay live integration _(2 days)_

**Goal:** Real Razorpay payment flow with signature verification and webhook handling.

#### Tasks

- [ ] Get Razorpay live `KEY_ID` + `KEY_SECRET` from client (after their KYC)
- [ ] `npm install razorpay` in server
- [ ] Replace mock in `routes/orders.js`:
  ```javascript
  import Razorpay from 'razorpay';
  const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

  // Inside POST /orders/checkout:
  const rzpOrder = await rzp.orders.create({
    amount: totals.total * 100,    // paise
    currency: 'INR',
    receipt: orderId,
    notes: { user_id: req.user.uid },
  });
  ```
- [ ] Add `POST /api/orders/:id/verify` with HMAC signature check:
  ```javascript
  import crypto from 'crypto';
  const expected = crypto.createHmac('sha256', SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  if (expected !== razorpay_signature) return res.status(400).json({ error: 'invalid signature' });
  ```
- [ ] Add **webhook endpoint** `POST /api/webhooks/razorpay` for async events
  - Verify webhook signature using `RAZORPAY_WEBHOOK_SECRET` (separate from API secret)
  - Handle: `payment.captured`, `payment.failed`, `refund.processed`
- [ ] In Razorpay dashboard → Webhooks → add `https://api.medshelf.in/api/webhooks/razorpay`
- [ ] Frontend: load Razorpay checkout JS dynamically, open modal with `rzpOrder.id`
- [ ] After successful payment in modal, frontend POSTs to `/orders/:id/verify`
- [ ] On verify success → call Shiprocket (sprint 6) → email customer (sprint 7)

**Acceptance:** Pay ₹1 with a real test card → order goes from `placed` → `paid` → email arrives.

**Gotcha:** Razorpay uses `paise` (₹1 = 100 paise) everywhere. Mixing rupees and paise is the #1 bug.

---

### Sprint 6 — Shiprocket integration _(2 days)_

**Goal:** Auto-create courier pickup on payment. Track delivery via webhooks.

#### Tasks

- [ ] Sign up at shiprocket.in, complete KYC, get API user/password
- [ ] Authenticate to get JWT (Shiprocket API uses email/password → returns token, valid 9 days):
  ```javascript
  const resp = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const { token } = await resp.json();
  ```
- [ ] Cache token, refresh on 401
- [ ] On `payment.captured` webhook → create Shiprocket order:
  ```javascript
  await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_id: order.id,
      order_date: new Date().toISOString().slice(0, 10),
      pickup_location: 'Primary',     // configured in Shiprocket dashboard
      billing_customer_name: address.name,
      billing_address: address.line1,
      billing_city: address.city,
      billing_pincode: address.pincode,
      billing_state: address.state,
      billing_country: 'India',
      billing_email: address.email,
      billing_phone: address.phone,
      shipping_is_billing: true,
      order_items: items.map(i => ({
        name: i.title,
        sku: i.book_id,
        units: i.qty,
        selling_price: i.unit_price,
      })),
      payment_method: order.payment_method === 'cod' ? 'COD' : 'Prepaid',
      sub_total: order.total,
      length: 22, breadth: 16, height: 4, weight: 0.7,   // average book dimensions
    }),
  });
  ```
- [ ] Add webhook endpoint `POST /api/webhooks/shiprocket` for status updates
  - Verify token in webhook header
  - Update `orders.status` to `shipped` / `out_for_delivery` / `delivered`
- [ ] In Shiprocket dashboard → set webhook URL
- [ ] Add `tracking_url` field to orders, return to customer

**Acceptance:** Place a real test order with paid status → Shiprocket dashboard shows pending pickup → webhook fires when courier scans → order status updates.

**Gotcha:** Shiprocket charges per shipment + RTO (return-to-origin) fees if customer rejects delivery. Set realistic expectations with the client.

---

### Sprint 7 — Email + admin orders dashboard _(2 days)_

**Goal:** Customers and client get notified about orders. Client can manage from a simple admin UI.

#### Tasks — Email

- [ ] Sign up at resend.com (free 3K emails/mo)
- [ ] `npm install resend` in server
- [ ] `server/src/email.js`:
  ```javascript
  import { Resend } from 'resend';
  const resend = new Resend(process.env.RESEND_API_KEY);

  export async function sendOrderConfirmation(order, customer) {
    return resend.emails.send({
      from: 'MedShelf <orders@medshelf.in>',
      to: customer.email,
      subject: `Order ${order.id} confirmed — ₹${order.total}`,
      html: orderConfirmationTemplate(order, customer),
    });
  }
  ```
- [ ] Verify domain in Resend (add DNS records)
- [ ] Trigger emails on:
  - Order placed → customer gets confirmation
  - Order shipped → customer gets tracking
  - Order delivered → customer gets feedback request
  - Stock low (<5) → client gets daily digest at 9 AM

#### Tasks — Admin orders dashboard

- [ ] Add `role` column to `users` table (`'customer' | 'admin'`)
- [ ] Add `requireAdmin` middleware in `auth.js`
- [ ] Build `/admin/orders` page in client app (paper-warm styling, same tokens)
- [ ] Endpoints:
  - `GET /api/admin/orders` — paginated, filterable by status
  - `GET /api/admin/orders/:id` — full detail
  - `PATCH /api/admin/orders/:id` — change status
  - `POST /api/admin/orders/:id/refund` — calls Razorpay refund + restores stock
- [ ] Make first user admin via SQL: `UPDATE users SET role='admin' WHERE email='client@...'`

**Acceptance:** Client logs in at `medshelf.in/admin/orders`, sees all orders, clicks one, marks shipped, refunds another.

---

### Sprint 8 — Deploy + monitoring + backups _(1-2 days)_

**Goal:** Real production URLs. Auto-recovery if anything breaks.

#### Tasks — Deploy frontend

- [ ] Push to GitHub → connect Vercel
- [ ] Build command: `npm run build` ; output: `dist`
- [ ] Add env vars: `VITE_SANITY_PROJECT_ID`, `VITE_API_URL`
- [ ] Custom domain: `medshelf.in` → Vercel
- [ ] SSL auto-provisioned by Vercel

#### Tasks — Deploy backend

- [ ] Connect Render → choose `server/` directory
- [ ] Build command: `npm install` ; start: `node src/server.js`
- [ ] Env vars (paste from password manager):
  - `JWT_SECRET`, `DATABASE_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
    `RAZORPAY_WEBHOOK_SECRET`, `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`,
    `RESEND_API_KEY`, `SANITY_WRITE_TOKEN`, `CLIENT_ORIGIN=https://medshelf.in`
- [ ] Custom domain: `api.medshelf.in` → Render
- [ ] Update Razorpay + Shiprocket webhook URLs to point at `api.medshelf.in`

#### Tasks — Monitoring

- [ ] UptimeRobot account → add monitor: `https://api.medshelf.in/api/health` every 5 min
- [ ] Add SMS notification (free tier supports email + Telegram)
- [ ] Sentry account → install SDK in both client and server
  ```javascript
  import * as Sentry from '@sentry/node';
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
  ```

#### Tasks — Backups

- [ ] `.github/workflows/backup.yml`:
  ```yaml
  name: Weekly Backup
  on:
    schedule: [{ cron: '0 2 * * 0' }]  # Sunday 02:00 UTC
    workflow_dispatch:
  jobs:
    backup:
      runs-on: ubuntu-latest
      steps:
        - run: pg_dump $DATABASE_URL > backup-$(date +%F).sql
          env: { DATABASE_URL: ${{ secrets.DATABASE_URL }} }
        - uses: nicklaw5/use-rclone-action@v1
          with:
            config: ${{ secrets.RCLONE_CONFIG }}
            args: copy backup-*.sql gdrive:medshelf-backups/
        - run: npx sanity dataset export production sanity-$(date +%F).tar.gz
          env: { SANITY_AUTH_TOKEN: ${{ secrets.SANITY_TOKEN }} }
  ```
- [ ] Verify the workflow runs by clicking "Run workflow" once manually

#### Tasks — DNS

- [ ] In Cloudflare/GoDaddy:
  ```
  medshelf.in        A     → Vercel IP (Vercel provides this)
  www.medshelf.in    CNAME → cname.vercel-dns.com
  api.medshelf.in    CNAME → <render-app>.onrender.com
  studio.medshelf.in CNAME → <sanity-studio>.sanity.studio
  ```
- [ ] Email sender record (for Resend):
  ```
  TXT   _resend.medshelf.in → resend's verification value
  MX    medshelf.in         → if you want orders@medshelf.in inbox
  ```

**Acceptance:** Open `medshelf.in` in incognito on mobile data → site loads, books appear, can sign up, can place a test order with real Razorpay test mode.

---

### Sprint 9 — SEO + structured data _(1 day)_

**Goal:** Indian medical students searching "Robbins 11th edition price India" find this site.

#### Tasks

- [ ] Switch frontend from Vite SPA to Next.js (or SvelteKit) for SSR
  - **OR** use Vite + react-snap to pre-render at build time
  - **Decision:** Next.js if catalog will grow past 1000 books and SEO is critical; Vite + pre-render is fine for static homepage.
- [ ] Add `<meta>` tags per book page:
  - `og:title`, `og:description`, `og:image` (Sanity image), `og:url`
- [ ] Add JSON-LD structured data:
  ```json
  {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "Robbins Basic Pathology",
    "image": "https://cdn.sanity.io/...",
    "offers": {
      "@type": "Offer",
      "price": "1799",
      "priceCurrency": "INR",
      "availability": "https://schema.org/InStock"
    }
  }
  ```
- [ ] Generate `/sitemap.xml` from Sanity at build time:
  ```javascript
  // scripts/build-sitemap.js
  const books = await sanity.fetch('*[_type == "book" && !archived]{_id, slug, _updatedAt}');
  // emit sitemap.xml with one URL per book
  ```
- [ ] `robots.txt`:
  ```
  User-agent: *
  Allow: /
  Sitemap: https://medshelf.in/sitemap.xml
  ```
- [ ] Submit to Google Search Console + Bing Webmaster Tools

**Acceptance:** `site:medshelf.in` returns indexed pages within 1-2 weeks.

---

## 4. Integration Contracts (API surfaces)

These are the exact data shapes flowing between systems. Lock them in before
sprint 5+ — changing them later is expensive.

### Sanity → Frontend (read)

```typescript
// What the frontend expects from Sanity
type Book = {
  _id: string;
  title: string;
  author: string;
  edition?: string;
  isbn?: string;
  mrp: number;          // rupees
  price: number;        // rupees
  stock: number;
  category: 'MBBS' | 'BDS' | 'Nursing' | 'NEET-PG' | 'MD/MS' | 'Faculty';
  shelf: 'featured' | 'new' | 'forthcoming' | 'secondhand';
  imageUrl: string;     // sanity CDN URL
  blurHash?: string;    // for placeholder
  rating?: number;
  reviews?: number;
  description?: string;
};
```

### Frontend → Backend (orders)

```typescript
POST /api/orders/checkout
Authorization: Bearer <jwt>
Body: {
  address: { name, phone, email, line1, line2, city, state, pincode },
  paymentMethod: 'upi' | 'card' | 'netbanking' | 'cod',
}

Response 201: {
  orderId: 'MS...',
  razorpayOrderId: 'order_...',
  razorpayKeyId: 'rzp_live_...',
  amount: 1799,                  // rupees (frontend × 100 for paise)
  totals: { subtotal, saved, tier, shipping, total },
}
```

### Razorpay → Backend (webhook)

```typescript
POST /api/webhooks/razorpay
X-Razorpay-Signature: <hmac-sha256>
Body: {
  event: 'payment.captured' | 'payment.failed' | 'refund.processed',
  payload: { payment: { entity: { id, order_id, amount, status } } }
}
```

### Backend → Sanity (stock decrement)

```typescript
// Use Sanity's transaction API
await sanity
  .patch(book._id)
  .dec({ stock: 1, soldCount: -1 })   // wait, that's wrong, see below
  .commit();
```

⚠️ Real version:
```typescript
await sanity
  .patch(book._id)
  .dec({ stock: qty })
  .inc({ soldCount: qty })
  .commit();
```

### Backend → Shiprocket (create order)

(See Sprint 6 task list for full body shape.)

---

## 5. Environment Variables Map

| Variable | Where it's set | What it's for |
|---|---|---|
| `VITE_SANITY_PROJECT_ID` | Vercel (client) | Sanity project ID |
| `VITE_SANITY_DATASET` | Vercel (client) | Usually `production` |
| `VITE_API_URL` | Vercel (client) | `https://api.medshelf.in` |
| `JWT_SECRET` | Render (server) | Sign JWTs (≥ 32 random chars) |
| `DATABASE_URL` | Render (server) | Neon connection string |
| `RAZORPAY_KEY_ID` | Render (server) | Public, used to create orders |
| `RAZORPAY_KEY_SECRET` | Render (server) | Sign API requests |
| `RAZORPAY_WEBHOOK_SECRET` | Render (server) | Verify incoming webhooks |
| `SHIPROCKET_EMAIL` | Render (server) | Login |
| `SHIPROCKET_PASSWORD` | Render (server) | Login |
| `RESEND_API_KEY` | Render (server) | Send emails |
| `SANITY_WRITE_TOKEN` | Render (server) | Decrement stock |
| `SENTRY_DSN` | Both | Error reporting |
| `CLIENT_ORIGIN` | Render (server) | CORS allowlist |

**Rule:** Never commit any of these to git. Document them in 1Password / Bitwarden.

---

## 6. Testing Strategy

### Unit / integration tests

- [ ] Backend: test order math (tiered discounts, shipping thresholds) with [vitest](https://vitest.dev)
- [ ] Backend: test signature verification for Razorpay webhook
- [ ] Frontend: test `Price` component formats rupees correctly (Indian numbering)

### End-to-end tests (Playwright)

- [ ] **Happy path:** browse → add to cart → sign up → checkout with Razorpay test card → success page
- [ ] **Auth:** sign up, log in, log out, password mismatch
- [ ] **Cart:** guest cart persists, merges on login
- [ ] **Out of stock:** stock=0 book shows "Notify Me", not "Add to Cart"
- [ ] **Razorpay test card:** `4111 1111 1111 1111`, any future expiry, any CVV

### Manual launch-day smoke test

- [ ] On real iPhone via 4G, real Android via WiFi: open homepage, search a book, add to cart, sign up with real email, complete checkout with Razorpay test mode
- [ ] Customer email arrives within 30 sec
- [ ] Order shows up in Shiprocket dashboard
- [ ] Stock decrements in Sanity within 1 minute

---

## 7. Rollback Plans

If a deploy goes wrong, recover in <5 min:

| Failure | Rollback |
|---|---|
| Frontend bug | Vercel → Deployments → Promote previous deployment |
| Backend bug | Render → Manual deploy → previous commit |
| Sanity schema bad | Sanity Studio → Vision (query tool) → revert document with `_rev` |
| DB migration corrupt | Neon → Branch from yesterday → swap connection string |
| Wrong Razorpay key | Render env vars → restore from 1Password backup → restart |

**Practice rollback** once before launch. Don't learn it during an outage.

---

## 8. Launch Checklist (the day of)

- [ ] Razorpay live keys swapped in (no test mode in prod env vars)
- [ ] Shiprocket pickup address verified
- [ ] Email DNS records propagated (test by sending to a real Gmail)
- [ ] DNS pointing at production hosts (use [whatsmydns.net](https://whatsmydns.net) to confirm)
- [ ] SSL valid for all 4 subdomains (medshelf.in, www, api, studio)
- [ ] UptimeRobot active and pinging
- [ ] Sentry capturing errors (trigger one fake error to verify)
- [ ] First backup successful (run the workflow manually)
- [ ] Admin user role set in DB
- [ ] Client trained on Sanity Studio (30-min screen-share recorded)
- [ ] Privacy / Terms / Refund pages live
- [ ] About Us has real photos and copy
- [ ] Footer GST number and address are correct
- [ ] Test order with REAL ₹1 to verify Razorpay live → Shiprocket → email all chain together
- [ ] Refund the ₹1 test → verify customer gets the money back
- [ ] Robots.txt + sitemap submitted to Google Search Console

---

## 9. Post-launch monitoring rhythm

| Frequency | Task | Owner |
|---|---|---|
| Continuous | UptimeRobot 5-min pings | automated |
| Daily 9 AM | Low-stock email digest | automated → client |
| Daily | New order email | automated → client |
| Weekly Sun 02:00 | Postgres + Sanity backup | automated → Google Drive |
| Weekly | Reconcile sales (Sanity stock vs orders) | client |
| Weekly | Review Sentry errors | you |
| Monthly | Review traffic, costs, dependency updates | you |
| Quarterly | Renew domain | you (set reminder) |

---

## 10. Decision Log (running)

| # | Decision | Date | Why |
|---|---|---|---|
| 1 | Sanity for catalog (over custom admin) | early | Free editor + image CDN, 1 week of dev saved |
| 2 | Postgres on Neon (over self-hosted) | early | Free 3 GB, point-in-time recovery, GitHub login |
| 3 | Two backends (Sanity reads, Express writes) | early | Each does what it's best at |
| 4 | node:sqlite for local, Postgres for prod | sprint 4 | Zero-install local dev |
| 5 | Resend for email (over SendGrid) | sprint 7 | Better React dev ergonomics, 3K free vs 100/day |
| 6 | Render free tier despite cold starts | sprint 8 | Zero cost; UptimeRobot pings keep it warm |
| 7 | Vite + Next.js SSR migration deferred | sprint 9 | Only if SEO data shows organic traffic potential |

(Add new entries here as you make architectural calls.)

---

## 11. Appendix: Code structure when done

```
medshelf/
├── client/                          [Vercel]
│   ├── src/
│   │   ├── api.js                   (talks to api.medshelf.in)
│   │   ├── sanity.js                (talks to Sanity CDN)
│   │   ├── hooks.js
│   │   ├── components.jsx
│   │   ├── modals.jsx
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Search.jsx
│   │   │   ├── Product.jsx
│   │   │   ├── Cart.jsx
│   │   │   ├── Checkout.jsx
│   │   │   ├── OrderConfirm.jsx
│   │   │   ├── Account.jsx
│   │   │   └── admin/
│   │   │       ├── Orders.jsx
│   │   │       └── OrderDetail.jsx
│   │   └── styles/global.css
│   └── package.json
│
├── server/                          [Render]
│   ├── src/
│   │   ├── server.js
│   │   ├── auth.js
│   │   ├── email.js                 (Resend)
│   │   ├── shiprocket.js            (Shiprocket SDK wrapper)
│   │   ├── sanity-write.js          (decrement stock, create products)
│   │   ├── db/
│   │   │   ├── schema.sql           (Postgres DDL)
│   │   │   └── pool.js              (pg Pool singleton)
│   │   ├── routes/
│   │   │   ├── products.js
│   │   │   ├── auth.js
│   │   │   ├── cart.js
│   │   │   ├── orders.js
│   │   │   ├── admin.js
│   │   │   └── webhooks/
│   │   │       ├── razorpay.js
│   │   │       └── shiprocket.js
│   │   └── jobs/
│   │       └── low-stock-digest.js  (daily cron via Render)
│   └── package.json
│
├── sanity/                          [Sanity hosting]
│   ├── schemas/
│   │   ├── book.ts
│   │   ├── bundle.ts
│   │   ├── testimonial.ts
│   │   ├── siteSettings.ts
│   │   └── page.ts
│   ├── sanity.config.ts
│   └── package.json
│
├── scripts/                         [run locally]
│   ├── import-books.js              (CSV → Sanity)
│   ├── seed-test-data.js
│   └── build-sitemap.js
│
├── .github/
│   └── workflows/
│       ├── backup.yml               (weekly backups)
│       ├── deploy-frontend.yml
│       └── deploy-backend.yml
│
├── INTEGRATION.md   ← this file
├── PLAN.md
├── EXPLAINER.md
├── OPERATIONS.md
├── CLIENT-ASKS.md
└── README.md
```

---

## 12. The 5 things that will absolutely go wrong

Save yourself stress by pre-deciding these:

1. **Client takes 3 weeks to do KYC.** Don't block other work waiting for them — keep building everything else.
2. **Publisher CSV columns are inconsistent.** Build the importer to be column-mapping configurable, not hardcoded.
3. **First Razorpay live transaction fails** because you forgot to swap the test key. Have a checklist (sprint 8 above) and use it.
4. **Render cold starts piss off the first customer.** UptimeRobot keeps it warm. If still bad, upgrade to ₹600/mo paid tier on launch day.
5. **You'll forget to verify Razorpay webhook signatures** and someone will inject a fake "paid" event. Verify EVERY webhook signature. No exceptions.

---

## What to do RIGHT NOW

1. Read this doc end-to-end once. Probably ~30 min.
2. Send the WhatsApp from `CLIENT-ASKS.md` if you haven't.
3. Open Sprint 1 — start the Sanity setup as soon as the client confirms domain + GST + bank info.
4. Update Decision Log section as you make changes / hit obstacles.
5. Tick boxes as you complete them. This becomes your weekly status report to the client.

That's it. This doc is the contract you have with yourself for delivering the project.
