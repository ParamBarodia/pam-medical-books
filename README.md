# MedShelf — Full-stack Indian Medical Bookstore

```
medshelf/
├── client/           # Vite + React frontend (port 5173)
│   └── src/
│       ├── api.js          # local Express API client (cart/orders/auth)
│       ├── sanity.js       # Sanity catalog client + image URL builder
│       ├── hooks.js        # useAuth, useCart, useWishlist, useFetch
│       ├── components.jsx  # Hero, BookCard, sections (paper-warm design)
│       ├── modals.jsx      # Product / Auth / Cart / Checkout modals
│       ├── App.jsx         # composition + dual-mode catalog (Sanity OR local)
│       └── styles/global.css
│
├── server/           # Express + node:sqlite (or Postgres) on port 4000
│   └── src/
│       ├── server.js
│       ├── auth.js                JWT + bcrypt
│       ├── db/
│       │   ├── index.js           node:sqlite wrapper (local dev)
│       │   ├── pool.js            Postgres pool (production, via DATABASE_URL)
│       │   ├── schema.js          SQLite DDL
│       │   ├── schema.sql         Postgres DDL
│       │   └── seed.js            sample catalog
│       ├── services/
│       │   ├── razorpay.js        real Razorpay + signature verification
│       │   ├── shiprocket.js      courier integration with token caching
│       │   ├── email.js           Resend with HTML templates
│       │   └── sanity.js          stock decrement on paid orders
│       └── routes/
│           ├── products.js        catalog (read)
│           ├── auth.js            signup / login / me
│           ├── cart.js            cart + wishlist
│           ├── orders.js          checkout + verify + post-payment chain
│           ├── admin.js           admin dashboard endpoints + low-stock job
│           └── webhooks/
│               ├── razorpay.js    HMAC-verified, idempotent
│               └── shiprocket.js  status sync
│
├── sanity/           # Sanity Studio — the catalog editor (port 3333 → cloud)
│   ├── schemas/
│   │   ├── book.js
│   │   ├── bundle.js
│   │   ├── testimonial.js
│   │   ├── siteSettings.js
│   │   └── page.js
│   └── sanity.config.js
│
├── scripts/          # Run from the host machine
│   ├── import-books.js          ISBN-aware bulk importer (CSV/Excel/JSON → Sanity)
│   └── lib/metadata.js          Google Books + Open Library auto-fetch
│
├── .github/workflows/
│   ├── backup.yml               weekly Postgres + Sanity → Google Drive
│   └── daily-low-stock.yml      9 AM IST email digest to admin
│
└── docs/
    ├── INTEGRATION.md           Master sprint-by-sprint build plan
    ├── PLAN.md                  Architecture decisions
    ├── EXPLAINER.md             Plain-English script for client meetings
    ├── OPERATIONS.md            Day-2 operations manual
    ├── CLIENT-ASKS.md           Discovery questions for client meeting
    └── BOOK-DATA-HANDOFF.md     How book data flows from publisher → site
```

---

## Quick start (local dev, all mock services)

```bash
# 1. Backend
cd medshelf/server
cp .env.example .env       # leaves all integrations in mock mode
npm install
node src/db/seed.js        # creates medshelf.db with 24 sample books
node src/server.js         # → http://localhost:4000

# 2. Frontend (in another terminal)
cd medshelf/client
npm install
npm run dev                # → http://localhost:5173
```

Open **http://localhost:5173** — fully functional ecommerce site, all integrations
in mock mode (orders work end-to-end, Razorpay returns fake order IDs, Shiprocket
returns fake tracking, emails print to server console).

---

## Going live (the production switch)

### 1. Set up Sanity catalog (~30 min)

```bash
cd medshelf/sanity
npm install
npx sanity init        # login → create project → choose 'production' dataset
npm run dev            # studio at localhost:3333 — verify schema renders
npm run deploy         # → studio at https://<your-project>.sanity.studio
```

Copy the `projectId` into:
- `client/.env` → `VITE_SANITY_PROJECT_ID=...`
- `server/.env` → `SANITY_PROJECT_ID=...` and `SANITY_WRITE_TOKEN=...` (from Sanity dashboard → API tokens, Editor permissions)

### 2. Import the catalog

```bash
cd medshelf/scripts
npm install
node import-books.js path/to/client-data.xlsx
# → Auto-fetches title/author/cover from ISBN via Google Books + Open Library
# → 700+/1000 books typically auto-populate without client effort
```

### 3. Switch on real services (one env var at a time)

| Env var | Where to get it | Flips on |
|---|---|---|
| `DATABASE_URL` | console.neon.tech (free) | Postgres instead of SQLite |
| `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` | dashboard.razorpay.com after KYC | Real payments |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay dashboard → Webhooks | Webhook verification |
| `SHIPROCKET_EMAIL` + `SHIPROCKET_PASSWORD` | shiprocket.in | Real courier pickups |
| `RESEND_API_KEY` | resend.com | Real customer emails |

Each integration is independent — switch them on as the client provides credentials.

### 4. Deploy

| Component | Host | Cost |
|---|---|---|
| Frontend | Vercel | ₹0 |
| Backend | Render free tier | ₹0 (sleeps after 15 min) |
| Database | Neon | ₹0 (3 GB) |
| Catalog | Sanity | ₹0 (10 GB bandwidth/mo) |
| Domain | client provides | ₹500-1500/yr |

Custom DNS:
- `medshelf.in` → Vercel
- `api.medshelf.in` → Render
- `studio.medshelf.in` → Sanity Studio

### 5. Set up backups + monitoring

- Push the repo to GitHub → `.github/workflows/backup.yml` runs every Sunday
- Add UptimeRobot monitor → `https://api.medshelf.in/api/health` every 5 min
- Add Sentry → set `SENTRY_DSN` in both client and server

---

## Mock mode (the safety net)

Every integration has a mock path. The server logs which are live:

```
MedShelf API listening on http://localhost:4000
  Razorpay: mock
  Shiprocket: mock
  Email (Resend): mock
  Sanity: mock (using local DB only)
```

**The site works end-to-end with all four in mock mode.** This means:
- You can demo to the client before they finish KYC
- Bugs in service config don't block local dev
- Tests run fast without hitting external APIs

When env vars are set, the corresponding mock falls away. Mixing live/mock is fine — e.g., live Razorpay + mock email is a valid intermediate state.

---

## End-to-end smoke test (verified working)

```bash
# Sign up
curl -X POST http://localhost:4000/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"buyer@test.in","password":"hunter2","name":"Test"}'

# Add to cart
TOKEN="..."
curl -X POST http://localhost:4000/api/cart -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"bookId":"b3","qty":1}'

# Checkout
curl -X POST http://localhost:4000/api/orders/checkout -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"address":{"name":"T","phone":"9999999999","email":"t@x.in","line1":"x","city":"BLR","pincode":"560029","state":"KA"},"paymentMethod":"upi"}'
# → { orderId, razorpayOrderId, razorpayKeyId, amount, totals }

# Verify (in production this fires from Razorpay webhook after payment)
curl -X POST http://localhost:4000/api/orders/MS.../verify -H "Authorization: Bearer $TOKEN" -d '{}'
# → { ok: true, status: "paid" }
```

After verify, server logs show:
```
[sanity/mock] decrementStock(b3, 1)
[email/mock] To: t@x.in   Subject: Order MS... confirmed — ₹1295
[email/mock] To: admin@medshelf.in   Subject: [MedShelf] New order MS... · ₹1295
```

The full chain — stock decrement, customer email, admin alert — fires correctly.
Adding real env vars promotes each step from mock to real, with no code changes.

---

## Documentation reading order

For a new contributor / handoff:

1. **README.md** (this file) — what's where, how to run
2. **INTEGRATION.md** — full sprint-by-sprint build plan with code snippets
3. **OPERATIONS.md** — day-2: who does what, backups, monitoring
4. **PLAN.md** — architecture decisions and trade-offs
5. **EXPLAINER.md** — non-technical explanation for the client
6. **CLIENT-ASKS.md** — discovery checklist + WhatsApp message templates
7. **BOOK-DATA-HANDOFF.md** — specifically: how book data flows
