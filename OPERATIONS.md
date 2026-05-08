# MedShelf — Operations Handbook

This is the practical "how to actually run this" guide. Two audiences:

- **Part A** — for you (the contractor / developer): your responsibilities, what you maintain, monitoring, backups.
- **Part B** — for the client (the bookshop owner): what they can self-serve, the daily workflow, how to add/update books.

Print Part B and hand it to the client at handoff. It becomes their user manual.

---

# PART A — Your side (contractor responsibilities)

## A1. The clean split — who owns what

This is the most important rule of the whole project. Never blur it.

| Concern | Who handles it | Tool |
|---|---|---|
| **Add/edit books, prices, stock, descriptions, images** | **Client** | Sanity Studio (no code) |
| **Mark book out of stock / back in stock** | **Client** | Sanity Studio |
| **Add a new category (e.g. "Veterinary")** | **Client** | Sanity Studio |
| **Edit homepage banner copy** | **Client** | Sanity Studio (editable fields) |
| **Edit Terms of Service / Refund policy** | **Client** | Sanity Studio (rich text page) |
| **View orders + mark fulfilled** | **Client** | Admin panel (we'll build a small `/admin/orders` page) |
| **Refund a customer** | **Client** | Razorpay dashboard |
| **Adjust prices in bulk** | **Client** | Sanity bulk-edit OR CSV import |
| | | |
| **Change site colors / fonts** | **You** | Code deploy |
| **Add a new section to homepage** | **You** | Code deploy |
| **Fix a bug** | **You** | Code deploy |
| **Database backups** | **You** | Automated job |
| **Domain renewal** | **You** (remind client) | GoDaddy / Cloudflare |
| **Razorpay test → live key swap** | **You** | One-time |
| **SSL certificate** | **You** (auto-renews) | Vercel / Render handles it |

### The principle

**If it's content, the client edits it.**
**If it's code, you edit it.**

Anything the client wants to change "weekly or more often" should be a CMS field, not hardcoded. Anything that changes "once a year or less" can be hardcoded — saves Sanity bloat.

---

## A2. Your monthly maintenance checklist (~30 min/month)

| Task | Frequency | Why |
|---|---|---|
| Check Sanity usage dashboard (storage, bandwidth) | Monthly | Catch overages before billing surprises |
| Check Render / Vercel logs for errors | Weekly | 5xx errors = bugs to fix |
| Verify automated DB backup ran | Weekly | If backup fails 4 weeks in a row, you have no DR |
| Update npm dependencies | Monthly | Security patches |
| Confirm SSL is valid (browser shows lock icon) | Monthly | Certbot/Vercel auto-renew but verify |
| Razorpay settlement reconciliation | Monthly | Match Razorpay payout to your DB orders |
| Review low-stock alerts archive | Monthly | Catch trends ("Robbins always runs out") |

Put this in your calendar as a recurring 30-min task.

---

## A3. Backups — the part nobody thinks about until disaster

### What needs backing up

| Data | Where it lives | Backup strategy |
|---|---|---|
| **Catalog (books, descriptions, images)** | Sanity | Sanity has built-in version history (every edit = a revision). Plus: weekly export script you run as a cron job. |
| **Orders, customer accounts, addresses** | Postgres on Neon | Neon does automatic point-in-time recovery for 7 days on free tier. Plus: weekly `pg_dump` to your own S3/Drive. |
| **Code** | GitHub | Git is its own backup. Push tags at every release. |
| **Environment variables** (Razorpay keys etc.) | Render / Vercel dashboard | Document them in a password manager (1Password/Bitwarden). Lose these = client locked out of their own service. |

### Concrete backup commands you should set up

```bash
# Weekly Postgres backup → save to Google Drive
pg_dump $DATABASE_URL > medshelf-$(date +%F).sql
rclone copy medshelf-$(date +%F).sql gdrive:medshelf-backups/

# Weekly Sanity export → JSON of the entire dataset
npx sanity dataset export production sanity-$(date +%F).tar.gz
```

Run both on a free tier of [GitHub Actions](https://docs.github.com/en/actions) with a cron schedule. Total cost: ₹0/month.

---

## A4. Monitoring — knowing when things break

For a small Indian bookstore, you don't need Datadog or Sentry. You need three things:

| Need | Tool | Cost |
|---|---|---|
| **"Is the site up?"** | UptimeRobot — pings every 5 min, emails/SMSes you on failure | ₹0 |
| **"Is anyone getting 500 errors?"** | Sentry free tier (5K events/mo) | ₹0 |
| **"How are orders trending?"** | Vercel Analytics (free) + your own `/admin/orders` page | ₹0 |

Set up UptimeRobot to ping `https://medshelf.in/api/health` every 5 minutes. If it fails twice in a row you get an SMS.

---

## A5. What the client should **never** be able to do

Lock these down at handoff:

1. **Run database queries directly.** Read-only Postgres replica is OK if they want SQL; primary is yours alone.
2. **Deploy code.** They don't get GitHub repo write access. They request changes; you deploy.
3. **Rotate JWT secret / Razorpay live keys.** Doing this without coordination logs out every customer mid-checkout.
4. **Delete books.** In Sanity Studio, set the schema to disallow `delete` — books should be marked `archived: true` instead. (Otherwise an order that references a deleted book crashes the order page.)
5. **Bulk-edit pricing without preview.** Sanity has a "draft" mode — train the client to always preview before publishing bulk changes.

---

## A6. The "client just calls you panicking" runbook

These are the 5 things that will go wrong in the first 6 months. Have answers ready:

| Panic | Likely cause | Fix |
|---|---|---|
| _"My customer paid but didn't get the book in their account"_ | Razorpay webhook didn't reach your backend | Check Razorpay dashboard → resend webhook for that order |
| _"All my books disappeared from the website!"_ | Client accidentally hit "Unpublish" in Sanity Studio | Sanity has version history → restore previous version (1 click) |
| _"The site is super slow today"_ | Render free tier cold-started OR Sanity rate limit hit | Check Render dashboard → if cold, upgrade to ₹600/mo paid tier |
| _"A customer is shouting on WhatsApp about not getting the book"_ | Shiprocket pickup delayed, or wrong address | Check Shiprocket dashboard → reach out to courier → offer ₹100 store credit |
| _"I need to cancel an order and refund"_ | Customer changed mind | Razorpay dashboard → "Refund" button → mark order `cancelled` in your admin |

Keep this list in a Google Doc the client can also see — many of these they can fix themselves.

---

# PART B — Client's user manual

> *(Hand this section to the client at handoff. Translate to Hindi if useful.)*

## B1. Daily operations — what you'll do most

### When you receive a new shipment from a publisher

1. Open Sanity Studio: `studio.medshelf.in` — log in with your email.
2. For **books already in the catalog:**
   - Search the title → Click → change `Stock` field → click `Publish`.
   - Repeat for each book.
   - For 50+ books, use the **bulk edit** feature: filter, multi-select, set field, save.
3. For **brand new books:**
   - Click `+ New Book` (top right).
   - Fill all fields: Title, Author, Edition, Publisher, ISBN, Price, MRP, Stock, Cover Photo, Description, Category.
   - Click `Publish`.
   - Book goes live on the site in 2 minutes.

### When stock runs low

- Sanity Studio shows a red dot next to any book with `Stock < 5`.
- Use the filter `Stock < 5` to see all low-stock books at once.
- You'll also receive a daily email at 9 AM listing all low-stock items.

### When a customer places an order

You don't need to do anything manually. The system automatically:

1. Decrements stock by however many copies they bought
2. Books a Shiprocket pickup
3. Emails the customer their order ID + tracking link
4. Sends you a notification "New order: #MS-12345, Bengaluru, ₹2,799"

You only act if:
- **Pickup didn't happen** (rare — Shiprocket alerts you on the dashboard).
- **Customer requests refund/cancellation** — see B3 below.

### When a customer asks "where's my order?"

1. Open `admin.medshelf.in/orders` (the orders dashboard we'll build for you).
2. Search by order ID, phone, or email.
3. Click → see full status: Placed → Paid → Shipped → Delivered.
4. Click the tracking link → opens Shiprocket page with courier ETA.
5. Reply to the customer with this info.

---

## B2. Adding books in bulk (CSV import)

If a publisher sends you an Excel of 200 new books, don't type them one by one.

1. Save the Excel as `.csv`.
2. Match columns to our template:
   ```
   title, author, edition, isbn, publisher, mrp, price, stock, category, description, image_url
   ```
3. WhatsApp the file to your developer.
4. Developer runs the importer (takes 5 minutes).
5. All 200 books appear in Sanity Studio. You verify and `Publish`.

If you want to do it yourself: Sanity has an [import tool](https://www.sanity.io/docs/importing-data) — but starting out, send to your developer.

---

## B3. Handling refunds and cancellations

### Customer wants a refund (book returned, damaged, etc.)

1. Open Razorpay Dashboard → Find the payment → Click `Refund`.
2. Razorpay refunds the customer's UPI/card automatically (3-5 days).
3. Open `admin.medshelf.in/orders` → find the order → mark as `Refunded`.
4. Stock automatically goes back up by 1.

### Customer cancels before delivery

1. Open `admin.medshelf.in/orders` → find order → click `Cancel`.
2. System asks "Issue refund?" → click Yes.
3. Same as above — Razorpay handles money, stock goes back up.

---

## B4. Updating the website itself (banners, copy, policies)

You can edit these from Sanity Studio without your developer:

| Section | Where to edit | When |
|---|---|---|
| Top promo bar offers ("₹100 off ₹5K+") | `Site Settings → Promo Bar` | Whenever you change discounts |
| Hero banner image / headline | `Site Settings → Hero` | Seasonal sales, festival offers |
| Phone / WhatsApp number | `Site Settings → Contact` | Rare |
| Operating hours | `Site Settings → Hours` | If you change shop timings |
| About Us / Refund Policy / Terms / Privacy | `Pages → [page]` | Once or twice a year |
| Newsletter banner copy | `Site Settings → Newsletter` | Anytime |

You **can't** change without your developer:
- Site colors / fonts
- Page layout / structure
- Adding new types of pages
- Changing how checkout / payments work

If you want any of those, message your developer.

---

## B5. Daily / weekly / monthly checklist for you (the client)

### Every day (~10 minutes)
- [ ] Check `admin.medshelf.in/orders` for new orders
- [ ] Pack and hand to courier (Shiprocket auto-schedules pickup)
- [ ] Reply to any customer WhatsApp queries

### Every week (~30 minutes)
- [ ] Check low-stock email — restock anything below 5 copies
- [ ] Reconcile Razorpay payouts against your bank statement
- [ ] Check Sanity Studio for any books with missing photos / descriptions

### Every month (~1 hour)
- [ ] Review which books sold the most (Sanity Studio has a "sold count" field — sort descending)
- [ ] Decide what to reorder from publishers
- [ ] Add seasonal promo: festival sale, exam season pricing, etc.
- [ ] Pay your dev contractor's monthly retainer (if any)

---

## B6. Your emergency contacts

Save these in your phone, in a sticky note, on your desk — wherever:

| When this happens | Call this | At |
|---|---|---|
| Site is down | Your developer | _(your number)_ |
| Razorpay payment failed for a customer | Razorpay support | 1800 419 5556 |
| Shiprocket courier issue | Shiprocket support | care@shiprocket.com |
| Domain expiring | GoDaddy / your registrar | _(account email)_ |
| GST / invoice question | Your CA / accountant | _(theirs)_ |

---

# PART C — Best practices summary (for you, the developer)

## C1. Code & deployments

1. **Never deploy on Friday.** Indian medical students shop weekends. Deploy Mon-Wed.
2. **Always tag releases.** `git tag v1.2.0` before deploying. Easy rollback.
3. **Test on staging first.** Vercel auto-creates preview URLs per PR. Use them.
4. **Never push secrets.** Razorpay live keys, JWT secret — only in Vercel/Render env vars, never in `.env` committed to git.
5. **Rate-limit the API.** Add `express-rate-limit` to your routes. Stops scrapers and accidental DDoS.

## C2. Sanity schema discipline

1. **No "delete" — only "archive".** Add `archived: boolean` to the book schema. Set `true` instead of deleting. Old orders still reference these.
2. **Validate inputs.** Sanity supports field validation. Force `mrp >= price >= 0`, `stock >= 0`, ISBN format, etc.
3. **Required fields.** Title, MRP, price, stock — required. Without these, the book breaks rendering.
4. **Document the schema.** A `docs/sanity-fields.md` explaining what each field is for. The client will ask.

## C3. Inventory consistency

The hard part of ecommerce is keeping stock counts honest across:
- Sanity (display / catalog)
- Postgres (what was sold)
- Physical shelf (actual books)

**Rule of thumb:** Sanity is the source of truth for *display*. Postgres orders are the source of truth for *what was sold*. Once a week, reconcile by:

```
Sanity stock + sold this week = Sanity stock at week start
```

If they don't match, you have a missing order or duplicate decrement. Investigate.

## C4. Order state machine — keep it simple

```
placed → paid → shipped → delivered → completed
                    ↓
               cancelled / refunded
```

Don't let an order skip states. Razorpay → "paid". Shiprocket pickup confirmed → "shipped". Shiprocket delivery confirmed → "delivered". Manual button for "completed" / "cancelled".

## C5. Security basics (don't skip)

1. **HTTPS only.** Vercel/Render handle this. Verify the redirect.
2. **bcrypt passwords with cost ≥ 10.** Already in our code.
3. **JWT in httpOnly cookie**, not localStorage, in production. (Currently localStorage for simplicity — flip before launch.)
4. **CSRF protection on POST/DELETE.** `csurf` middleware or use SameSite=strict cookies.
5. **Rate-limit login attempts.** 5 attempts per 15 min per IP.
6. **Razorpay webhook signature verification.** Already in `routes/orders.js`. Verify it actually verifies before going live.

---

## TL;DR for you (one paragraph)

Your job after launch is mostly **monitoring and small bug fixes**. The client owns daily operations: adding books, updating stock, handling orders. **Sanity Studio is their dashboard** — they don't need you to add a book or change a price. **You only deploy code when something needs to change visually or structurally.** Set up automated backups (cron + GitHub Actions), automated uptime monitoring (UptimeRobot), and a small `/admin/orders` page for the client to fulfill orders. After launch, expect ~30 min/month of routine maintenance + 2-4 hours/month of "client called with a question."

That's the entire operations model.
