# MedShelf — Full-stack Indian Medical Bookstore

```
medshelf/
├── client/           # Vite + React frontend (port 5173)
│   └── src/
│       ├── api.js          # local Express API client
│       ├── sanity.js       # Sanity catalog client + image URL builder
│       ├── hooks.js        # useCart, useWishlist, useFetch
│       ├── components.jsx  # Hero, BookCard, sections (paper-warm design)
│       ├── modals.jsx      # Product / Cart / Checkout modals (phone-OTP, no accounts)
│       ├── admin/AdminApp.jsx  # lazy-loaded admin SPA at /admin
│       ├── track.jsx       # lazy-loaded order-tracking page at /track
│       ├── App.jsx         # composition + path-based routing
│       └── styles/global.css
│
├── server/           # Express + node:sqlite on port 4000
│   └── src/
│       ├── server.js
│       ├── logger.js              pino structured logging
│       ├── middleware/
│       │   └── admin-auth.js      admin phone-OTP + 30-day httpOnly cookie
│       ├── lib/
│       │   └── order-status.js    order status state machine
│       ├── db/
│       │   ├── index.js           node:sqlite wrapper
│       │   ├── schema.js          DDL
│       │   ├── seed.js            sample catalog
│       │   └── enrich-from-isbn.js
│       ├── services/
│       │   ├── razorpay.js        real Razorpay + signature verification
│       │   ├── shiprocket.js      courier integration with token caching
│       │   ├── otp.js             OTP issuance/verification (MSG91)
│       │   ├── sms.js / whatsapp.js / notify.js  notification fallback chain
│       │   ├── email.js           Resend with HTML templates
│       │   └── sanity.js          stock decrement on paid orders
│       ├── jobs/                  scheduled tasks (daily cleanup, etc.)
│       └── routes/
│           ├── products.js        catalog (read)
│           ├── customer.js        repeat-customer masked-hint lookup
│           ├── orders.js          checkout + verify + post-payment chain
│           ├── admin.js           admin dashboard endpoints
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

## Deploying the frontend to Vercel

The Vite build is configured for Vercel via `vercel.json` at the repo root. Backend stays on its own host (Render / Railway / Fly — anything with a persistent disk for SQLite). Postgres migration is on the to-do list when traffic outgrows SQLite.

### 1. Deploy the API somewhere first
Pick any host that gives you a public HTTPS URL — e.g. Render's free web service:
- New Web Service → connect this repo
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
- Add a persistent disk mounted at `/data` and set `DB_PATH=/data/medshelf.db` in env vars (so SQLite survives deploys)
- Set `CLIENT_ORIGIN=https://your-vercel-domain.vercel.app` so CORS lets the frontend through

Note the resulting API URL (e.g. `https://pam-api.onrender.com`).

### 2. Deploy the frontend on Vercel
1. New Project → import `ParamBarodia/pam-medical-books`
2. Vercel auto-detects `vercel.json`; no overrides needed
3. **Environment Variables** — add:
   - `VITE_API_BASE_URL` = your API URL from step 1, no trailing slash
4. Deploy

The `vercel.json` rewrite rule sends every non-asset request to `/index.html` (SPA routing) and caches `/assets/*` for a year (Vite gives them content-hashed filenames, so this is safe).

### 3. Custom domain (optional)
- Vercel → Project → Settings → Domains → add `pammedicalbooks.in` (or whatever)
- Update the registrar's DNS as Vercel instructs (CNAME or A record)
- Once SSL provisions, update `CLIENT_ORIGIN` on the API to match

### Local production-build smoke test
```bash
cd client
VITE_API_BASE_URL=http://localhost:4000 npm run build
npm run preview            # serves the built bundle on :4173
```
Note: the API also needs `CLIENT_ORIGIN=http://localhost:4173` for CORS to let the preview through, or browse with CORS disabled.

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
