# What to Get From the Client

A short, actionable checklist. **Start with the 🔴 Must-haves.** Don't write code until you have all of those.

---

## 🔴 Must-haves (without these you cannot start work)

### 1. Business basics
- [ ] **Business legal name** — exact spelling for invoices and Razorpay
- [ ] **GST number** — required by Razorpay, Shiprocket, and Indian law
- [ ] **PAN of the business / proprietor**
- [ ] **Business address** (warehouse / shop) — for pickup and invoices
- [ ] **Bank account details** — for Razorpay and Shiprocket settlements

### 2. The catalog
- [ ] **How many books at launch?** _(50, 200, 1000, 5000?)_
- [ ] **Master list** in any format — Excel, Google Sheet, paper, "scrape from publisher", or "I'll dictate"
- [ ] **Cover image source** — they have photos? Publisher PDFs? Scrape from Amazon? You'll photograph?
- [ ] **Categories they think in** — exact names: "MBBS Year 1", "BDS", "NEET-PG"… use THEIR words

### 3. Brand & contact
- [ ] **Logo file** (SVG or high-res PNG)
- [ ] **Tagline / one-liner** they want under the logo
- [ ] **Customer-facing phone number**
- [ ] **WhatsApp number** (could be same as above)
- [ ] **Customer-service email** — `support@theirdomain.in` ideally

### 4. Domain
- [ ] **Domain name** — registered or to be registered? (`.in`, `.com`, `.co.in`)
- [ ] **Registrar login** — GoDaddy / BigRock / Cloudflare access for DNS

---

## 🟡 Important (need before launch, not before starting)

### 5. Payment gateway
- [ ] **Razorpay account** — they sign up at razorpay.com, KYC takes ~3 days
  - You'll need: `KEY_ID` and `KEY_SECRET` (live, not test)
- [ ] **Decision on payment methods**: UPI? Cards? Net banking? COD?
- [ ] **GST invoice settings** — Razorpay can auto-generate, confirm they want this

### 6. Shipping
- [ ] **Shiprocket account** — free signup at shiprocket.in
  - You'll need: their API credentials
- [ ] **Pickup warehouse address** — where bike-boy comes
- [ ] **Default packaging dimensions** — average book size + weight (Shiprocket asks)
- [ ] **Free shipping threshold** — ₹499? ₹999? Never free?
- [ ] **Serviceable PIN codes** — all-India or limited to a few states?

### 7. Business rules
- [ ] **Discount strategy** — flat 20% off MRP? Tiered (₹100 off ₹5K+, ₹200 off ₹10K+)? Coupons?
- [ ] **Return policy** — accept returns? How many days? (7-day standard for India)
- [ ] **Cancellation policy** — can customers cancel before shipping?
- [ ] **Refund timeline** — instant via Razorpay or after they receive returned book?
- [ ] **Out-of-stock behavior** — show "Notify Me" or hide entirely?

### 8. Initial content (text the client must write)
- [ ] **About Us** copy (200-300 words)
- [ ] **Refund / Return policy** (legal page)
- [ ] **Shipping policy** (legal page)
- [ ] **Privacy policy** + **Terms of Service** (Razorpay/Shiprocket need these for KYC)
- [ ] **FAQ** — top 10 questions customers ask in their physical shop

---

## 🟢 Nice-to-have (can decide later, won't block launch)

### 9. Marketing & SEO
- [ ] **Social media handles** (Instagram, Facebook, YouTube)
- [ ] **Existing customer email list** — can we import for newsletter?
- [ ] **Photographs of the actual shop** — adds trust to "About Us"
- [ ] **Photos of staff / family** — same purpose
- [ ] **Testimonials** — real ones from regular customers

### 10. Operations
- [ ] **Daily order capacity** they can fulfill — 10? 50? 200?
- [ ] **Holiday calendar** — when's the shop closed?
- [ ] **Working hours** — already on the site, confirm
- [ ] **Bulk order discount** — for medical colleges buying 50+ copies?

### 11. Future roadmap (just to know)
- [ ] **Mobile app planned?** (affects how we structure the API)
- [ ] **Multi-language?** (English + Hindi later?)
- [ ] **Affiliate program?** (medical students earning commission)
- [ ] **Subscriptions?** (monthly book box?)

---

## 📲 Copy-paste WhatsApp message to send the client

> **Subject: MedShelf — list of things I need from you to start**
>
> Sir/Ma'am, here's the list of things needed to start building. I've split it into 3 priority levels.
>
> **Most urgent (need to begin):**
> 1. Business legal name + GST number + PAN
> 2. Bank account details
> 3. Warehouse / shop address
> 4. Logo (high-quality file)
> 5. Customer phone + WhatsApp number
> 6. Domain name (already bought or want me to suggest?)
> 7. How many books at launch (rough number)?
> 8. Do you have a list of books in Excel/Google Sheet anywhere? In any format is fine.
> 9. Where do book cover photos come from — publishers, Amazon, your phone?
>
> **Need before website goes live:**
> 10. Razorpay account (I'll send you signup link, takes 3 days for verification)
> 11. Shiprocket account for delivery (free, 30-min signup)
> 12. About Us text (~200 words)
> 13. Refund / Return / Privacy / Terms — these are legally required pages
> 14. Discount strategy (10% flat? Tiered? Coupon codes?)
> 15. Return policy — how many days?
> 16. Free shipping threshold (e.g., free over ₹999)?
>
> **Can decide later:**
> 17. Social media handles
> 18. Photos of your shop / staff (for About Us page)
> 19. Customer testimonials if you have any
> 20. Bulk order discount for colleges?
>
> Once I have items 1-9 I can start building and importing the catalog. Items 10-16 we'll need before going live but I can begin work without them.
>
> Reply with whatever you have ready, even partial. We'll fill in the rest in our next call.

---

## Quick reference — what each ask unlocks

| Ask | Unlocks |
|---|---|
| GST + PAN + bank | Razorpay live account, Shiprocket account, legal invoices |
| Master book list | The catalog itself (you import into Sanity) |
| Cover image source | Image strategy (upload vs hotlink vs scrape) |
| Domain | Hosting setup, SSL, email |
| Logo + brand | Header / footer / favicon / OG image |
| About / Policies | Razorpay needs these displayed for KYC approval |
| Razorpay credentials | Live payments |
| Shiprocket credentials | Delivery automation |
| Categories | URL structure, navigation, filters |
| Discount strategy | Cart math, promo bar copy |

---

## My priority — get these 3 first, the rest can wait

If the client is busy and you can only get 3 things at the meeting:

1. **GST + PAN + bank account info** → blocks Razorpay/Shiprocket KYC, takes 3+ days to clear
2. **Master book list (any format)** → blocks catalog import, the longest-running work item
3. **Domain name** → blocks DNS / SSL / email setup

With those three you can build and demo. Everything else can be filled in over the following 2-3 weeks while you build.
