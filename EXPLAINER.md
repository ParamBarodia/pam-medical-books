# MedShelf — How It All Works (Client-Friendly Explainer)

This document explains the moving pieces of your bookstore website **in plain language**, so you can re-explain to the client (or anyone non-technical) without losing them. No jargon. Where I use a tech word, I'll define it.

---

## 1. The 3 things every ecommerce site needs

Picture a real bookshop, but online. It needs three rooms:

| Real shop | Online shop | Tool we use |
|---|---|---|
| **The shelves** — books arranged with prices | **Catalog** — list of all books, prices, photos | **Sanity** (a CMS) |
| **The billing counter** — adds up your purchases, takes payment, gives a receipt | **Cart + Orders + Payment** — adds up, takes money, generates order ID | **Our own backend** (Express + database) + **Razorpay** |
| **The delivery boy** — takes the parcel to the customer's address | **Courier integration** — books a Delhivery / Shiprocket pickup automatically | **Shiprocket** or **Delhivery API** |

**These are 3 separate systems.** They talk to each other over the internet. The advantage: each one is best-in-class at its job, and if one breaks the others keep working.

---

## 2. What is a "CMS"?

**CMS = Content Management System.** Think of it as **Tally / Vyapar, but for the website's catalog instead of accounts**.

Imagine: the client opens a website (like Gmail), logs in, and sees a clean dashboard with all 1000 books. They can click a book, change the price, upload a new cover photo, mark it "out of stock", and click Save. **2 minutes later, the website shows the new price.** No developer needed.

**That's a CMS.** We're using one called **Sanity** ([sanity.io](https://sanity.io)).

### Why "free"?

Sanity charges only when you cross certain limits. The free plan covers:
- ✅ Up to **10,000 books** in the catalog (we'll have 1000-5000)
- ✅ **3 editor logins** (you + maybe 2 from client side)
- ✅ **100,000 page-views per month** of book data (a small Indian bookstore won't hit this)
- ✅ **10 GB of image bandwidth per month** (enough for ~50,000 monthly visitors browsing covers)

If the client crosses these (good problem to have — means business is booming), Sanity costs about **$15/month (~₹1,200)**.

### What does the client see?

A login page → a dashboard like this:

```
┌─────────────────────────────────────────────────────────────┐
│ 📚 MedShelf — Catalog                                        │
├─────────────────────────────────────────────────────────────┤
│ [+ Add Book]  [Import CSV]    🔍 Search…                     │
│                                                             │
│  📕 Robbins Basic Pathology      ₹1,799   In stock: 18       │
│  📗 Gray's Anatomy 4th Ed         ₹1,499   In stock: 24       │
│  📘 BD Chaurasia Vol 1            ₹  695   In stock: 47       │
│  📕 Park's PSM 27th Ed            ₹1,175   In stock: 22       │
│  …                                                          │
└─────────────────────────────────────────────────────────────┘
```

Click a book → form with all fields → edit → Save. Done.

### How is this different from a normal website admin?

It's the **same idea** as building a custom admin panel — but:
- **We don't have to build it.** Sanity's team built it. Free.
- **It's polished.** Drag-drop image upload, undo, history, search, multi-edit.
- **It works on phone.** The client can update prices from a tea shop on their phone.
- **It auto-saves drafts** while the client is editing.

If we built our own admin, it would take 1-2 weeks of development time and never look as good. Using Sanity, the dashboard is ready in 1 day.

---

## 3. What is a "CDN"?

**CDN = Content Delivery Network.** Think of it as **a chain of FedEx warehouses spread across the world**, each holding a copy of your book covers.

### The problem CDN solves

Imagine your shop is in Bengaluru. A customer in Patna opens your website. Without a CDN, the cover image of "Robbins Pathology" travels:

```
Server in Bengaluru ──── 1500 km ────→ Customer in Patna
   ⏱  takes 800 ms                       (slow website = customer leaves)
```

With a CDN, that same image is **already cached** in a Patna data centre:

```
Server in Patna  ── 50 km ──→ Customer in Patna
   ⏱  takes 20 ms                  (fast = customer buys)
```

### Why this matters for a 1000-book site

1000 books × 1 cover image each = 1000 photos. Average size from a publisher: 800 KB.
**Total = 800 MB of images.**

If those sit on your own server:
- ❌ Server bandwidth gets eaten when 100 users browse
- ❌ Mobile users on 4G see a blank page for 3 seconds while images load
- ❌ Server storage cost rises every time you add more books
- ❌ You have to write code to resize images for thumbnails vs full views

If those sit on Sanity's CDN:
- ✅ Each cover loads in 20-50 ms anywhere in India (Sanity has a Mumbai data centre)
- ✅ Sanity automatically generates 12 sizes per image (thumbnail, card, modal, etc.)
- ✅ Sanity converts JPG → WebP (a modern format, 30% smaller for the same quality)
- ✅ You never see the storage cost — it's included in the free plan up to 10 GB

### What "free CDN" means

Sanity's free plan includes **10 GB of CDN bandwidth/month**. That's enough for **~50,000 monthly visitors** browsing 5 book covers each. If you ever cross that, the next tier is ~₹1,200/month.

For comparison, building this yourself: **AWS CloudFront ≈ ₹2,500/mo + 1 week of dev work to set up**. Cloudflare R2 + custom CDN: **free, but 2 days of dev work**. Sanity: **free, 0 days of dev work, just upload images and they appear on the CDN automatically**.

---

## 4. How do these pieces talk to each other?

Pretend a customer in Pune buys "Robbins Pathology". Here's what happens behind the scenes, in order:

```
                    ┌─────────────────────────┐
                    │   Customer's browser    │
                    │   (Chrome on phone)     │
                    └────────────┬────────────┘
                                 │
            (1) "Show me homepage"
                                 │
                                 ↓
        ┌────────────────────────────────────────────┐
        │ Frontend on Vercel — medshelf.in           │
        │ (the website itself, the React code)       │
        └─────┬───────────────────────┬──────────────┘
              │                       │
   (2) "Give me 8         (3) "Give me cover
       featured books"          images"
              │                       │
              ↓                       ↓
        ┌──────────────┐      ┌──────────────┐
        │   Sanity     │      │ Sanity CDN   │
        │   (Catalog)  │      │   (Images)   │
        └──────────────┘      └──────────────┘
              │
              │ Returns: titles, prices, descriptions in JSON
              │
              ↓
   Customer sees the homepage → clicks "Add to Cart"
              │
              ↓
        ┌────────────────────────────────────────────┐
        │ Our Backend on Render                      │
        │ (Express + Postgres database)              │
        │  - Saves cart                              │
        │  - Handles login                           │
        │  - Stores orders                           │
        └─────┬───────────────────────┬──────────────┘
              │                       │
    (4) Customer clicks      (5) "Pay ₹1,799"
        Checkout                     │
              │                       ↓
              │              ┌──────────────┐
              │              │   Razorpay   │
              │              │ (UPI/Card)   │
              │              └──────────────┘
              │                       │
              │     (6) "Payment success"
              ↓                       │
        ┌──────────────┐      ┌──────────────┐
        │ Save order   │←─────│ Webhook      │
        │ as PAID      │      │ from Razorpay│
        └──────┬───────┘      └──────────────┘
               │
   (7) "Book a courier pickup"
               │
               ↓
        ┌──────────────┐
        │ Shiprocket   │  → emails customer the tracking link
        │ (Delivery)   │  → schedules pickup at warehouse
        └──────────────┘
               │
   (8) Decrement stock count
               │
               ↓
        ┌──────────────┐
        │   Sanity     │  → "1 less Robbins in stock"
        │   (Catalog)  │
        └──────────────┘
```

### The golden rule

**Each system does ONE thing.** When something breaks (Razorpay outage, Shiprocket API down) — only that one thing breaks, the rest keeps working.

This is called **separation of concerns**. It's how Flipkart, Amazon, BigBasket all work too.

---

## 5. Delivery — how does a book actually reach the customer?

You have **three options**. Most Indian small ecom sites use option B.

### Option A — Client's own delivery (only if they have a bike-boy)

- Client gets an email "New order from Patna"
- Client packs book → gives to local courier (DTDC, Bluedart) → manually emails tracking number
- **Pros:** No tech needed. Client has full control.
- **Cons:** Doesn't scale past ~10 orders/day. Can't deliver outside the city.

### Option B — Shiprocket (recommended for India)

[Shiprocket](https://shiprocket.in) is a "courier aggregator" — they have deals with **17 courier companies** (Delhivery, Bluedart, Ekart, India Post, etc.). Your site talks to Shiprocket's API:

```
Customer pays → Order goes into Shiprocket → Shiprocket picks the cheapest
courier serving that PIN code → Schedules pickup at warehouse → Provides
tracking → Customer gets WhatsApp/SMS updates → Money settles in client's
bank account in 5 days.
```

- **Pros:**
  - Single integration → access to 17 couriers
  - Automatic cheapest-rate picking
  - Free up to 100 orders/month, then ₹19/shipment
  - Built-in WhatsApp / email customer updates
  - Returns / RTO (return to origin) handled
  - Settlement to client's bank account is automatic

- **Cons:**
  - Client needs a Shiprocket account (free signup)
  - Pickup is from one warehouse address (not multiple)

**This is what almost every Indian D2C brand uses.** Snitch, BlueTokai, Plix, Wakefit — all run on Shiprocket.

### Option C — Direct courier API (Delhivery / Bluedart)

If client already has a deal with one courier (say, Delhivery), we integrate directly with their API. Slightly cheaper per shipment but locks you into one courier.

### What client needs to provide for delivery

1. **Warehouse address** (where books ship from)
2. **GST number** (legally required on all couriers)
3. **Shiprocket account** (signup is free, takes 30 min) **OR** existing courier API credentials
4. **Decision on RTO policy** — what happens to undelivered packages

---

## 6. Stock / inventory — how does the client update from their side?

Two flows: **manual** (the client edits Sanity) and **automatic** (the system updates itself when an order ships).

### Manual updates (client does it themselves)

Whenever a publisher delivers new stock or the client counts inventory:

1. Client opens Sanity Studio (sanity.in.medshelf.in or similar)
2. Logs in (Google account / email-password)
3. Searches for the book → opens it → changes "Stock: 18" → Save
4. **Done.** The website immediately reflects 18 copies in stock.

If they have new stock for 50 books at once, they can:
- Use the **bulk-edit feature** of Sanity Studio (select 50 → set field → save)
- Or upload a **CSV file** with `book_id, new_stock_count` columns and we run an import script

### Automatic updates (system does it)

When a customer's order is paid, our backend automatically:
- Decrements the stock count in Sanity
- If stock hits 0, the book shows "Out of Stock — Notify Me"
- If stock falls below 5, sends an email to the client: "⚠️ Low stock: Robbins Pathology only 4 left"

### Edge cases the client might ask about

| Question | Answer |
|---|---|
| _"What if 2 customers add the last copy at the same time?"_ | Whoever pays first wins. The second customer sees "Out of stock" at checkout. (Standard ecom behaviour.) |
| _"What if I sell a book in my physical shop AND online?"_ | Two options: (1) one warehouse, deduct manually each evening; (2) integrate with Tally / Vyapar so physical sales auto-sync. Option 2 is extra dev work. |
| _"Can I see a low-stock report?"_ | Yes — Sanity Studio has a built-in filter "Stock < 5" that shows all low-stock books. |
| _"Can I bulk update prices when a publisher revises?"_ | Yes — CSV import or bulk-edit in Sanity. |

---

## 7. The full list of "things needed for this ecom"

If client asks "what do you need from me to launch this?", here's the answer:

### From the client (one-time)

1. **Domain name** — `medshelf.in` or whatever they own (₹500-1500/year, GoDaddy / Cloudflare)
2. **GST number** — required for invoices and Razorpay/Shiprocket
3. **Razorpay account** — for accepting payments (KYC verification ~3 days)
4. **Shiprocket account** — for deliveries (free signup, 30 min)
5. **Bank account** — for receiving money (linked to Razorpay)
6. **Warehouse address** — where books ship from
7. **Logo + brand colors** — already approved (paper-warm + oxblood)
8. **Initial book catalog** — Excel/CSV with book details OR they hand-type in Sanity

### From you (contractor)

1. **Frontend code** (the Vite/React app) — already built
2. **Backend code** (Express + Postgres) — already built  
3. **Sanity setup** — book schema + Studio configuration (1 day)
4. **CSV importer script** — to bulk-load 1000 books (1 day, after seeing the format)
5. **Razorpay integration** (test → live) — already coded for test, swap keys for live
6. **Shiprocket integration** — new work, ~1-2 days
7. **Email/SMS confirmations** — Resend or SendGrid (~half day)
8. **Deployment** — Vercel + Render + custom domain (~half day)
9. **Documentation** — basic "how to add a book" video for the client

**Total dev time after client meeting: ~3 weeks for one developer.**

---

## 8. Cost summary (what to tell the client)

| Cost | Amount | Frequency |
|---|---|---|
| Domain (`.in` or `.com`) | ₹500–1500 | per year |
| Sanity (catalog + image CDN) | **₹0** | per month (free tier covers 1000-5000 books) |
| Vercel (frontend hosting) | **₹0** | per month |
| Render (backend hosting) | **₹0** | per month (₹600 if traffic exceeds free tier) |
| Neon (Postgres database) | **₹0** | per month (3 GB free) |
| Razorpay | **2% of each transaction** | per order |
| Shiprocket | **~₹50-80 per shipment** | per order |
| Email service (Resend) | **₹0** | per month (3,000 emails/mo free) |
| SSL certificate | **₹0** | (Let's Encrypt, auto-renewed) |
| **TOTAL FIXED MONTHLY** | **₹0–₹600** | |
| **PER ORDER** | **2% Razorpay + ~₹70 shipping = ~₹100 on a ₹2000 order** | |

**Translation for client:**
> "If your shop sells ₹0 per month, the website costs you ₹0 per month plus ₹1000-1500/year for the domain. The day you sell ₹50,000 worth of books, the website takes about ~₹3,500 in payment + delivery fees and you keep ₹46,500 minus the cost of the books. There are no upfront infrastructure costs."

---

## 9. The 60-second client pitch (what to literally say)

> "Sir/Ma'am, here's how it'll work:
>
> **The website** is two parts. One part is your shop window — what customers see. We host that on a free service called Vercel. It's the same thing companies like Tata 1mg use.
>
> **The book catalog** — all 1000 books with their photos, prices, descriptions — sits in a system called Sanity. Think of it like Tally for your website. You log in, you can change prices, you can mark something out of stock, you can add a new book. The website updates immediately. No developer needed for daily updates.
>
> **The book photos** are stored on Sanity's photo network — they have copies in Mumbai, Delhi, Bangalore data centres. So when a customer in Patna opens your site, the photos load in 50 milliseconds. Fast site = customer buys.
>
> **The cart, the payment, the order** — that's a separate system we build. Money goes through Razorpay (same as PhonePe, Zomato use). Razorpay charges 2% per order — that's the only fixed business cost.
>
> **Delivery** is through Shiprocket. They give you access to Delhivery, Blue Dart, India Post, all 17 couriers, and pick the cheapest one for each customer's PIN code. They pick up from your warehouse. Customer gets WhatsApp tracking automatically.
>
> **Stock levels** — when a customer pays, the system automatically reduces the stock count by 1. If a book is out of stock, the site shows 'Notify Me' instead of 'Add to Cart'. You can also bulk-update from Sanity whenever you receive new shipments from publishers.
>
> **Total monthly cost to keep this running, ignoring orders, is ₹0 for the first year.** Once you cross 50,000 visitors a month or 100 orders a month, we'd pay about ₹2,000/month for higher tiers. Your domain is ₹1,500/year. Razorpay takes 2% per sale, Shiprocket takes ~₹70 per delivery."

That's it. That's the conversation.

---

## TL;DR sticky-note version

| Question | One-line answer |
|---|---|
| What's a CMS? | Tally for your website's catalog. Free, looks like Gmail, you log in and edit. |
| What's a CDN? | A network of warehouses for your photos so they load fast everywhere in India. |
| Who builds the admin panel? | We don't — Sanity gives us one for free. |
| Where do books come from? | We import from a CSV / Excel the client provides, OR they type in Sanity. |
| Where do book photos live? | Sanity's free CDN — 10 GB free, automatic resize. |
| How does delivery work? | Shiprocket — one integration, 17 couriers. ~₹70 per shipment. |
| How is stock updated? | Automatic on order; manual via Sanity Studio anytime. |
| Total monthly cost to client? | ₹0 baseline + 2% per order for Razorpay + ~₹70 per delivery for shipping. |
| What does the client need to give us? | Domain, GST number, Razorpay account, warehouse address, and the book catalog (Excel/photos). |
