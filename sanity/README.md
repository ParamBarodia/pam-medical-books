# Sanity Studio for MedShelf

The catalog editor. The client logs in here to add/edit books, prices, stock, photos.

## First-time setup (you, the developer, do this once)

```bash
cd sanity

# 1. Install
npm install

# 2. Initialise the Sanity project (one-time, opens browser)
npx sanity init --env

#   When prompted:
#   - Login with Google
#   - Create new project: "MedShelf"
#   - Use default dataset name: "production"
#   - Use default output path: ./
#   - This writes the project ID into .env.development

# 3. Run locally to verify
npm run dev
#   Studio opens at http://localhost:3333

# 4. Deploy to Sanity's CDN
npm run deploy
#   Choose hostname: "medshelf-studio"
#   Live at https://medshelf-studio.sanity.studio
```

## Custom domain (optional)

In Sanity dashboard → Settings → Custom domain → add `studio.medshelf.in`.
Then in Cloudflare/your DNS:
```
studio.medshelf.in   CNAME → medshelf-studio.sanity.studio
```

## Schema overview

| File | Document type | Purpose |
|---|---|---|
| `schemas/book.js` | `book` | The full book record |
| `schemas/bundle.js` | `bundle` | Curated combos referencing books |
| `schemas/testimonial.js` | `testimonial` | Reviews shown on homepage |
| `schemas/siteSettings.js` | `siteSettings` (singleton) | Promo bar, hero, contact, pricing rules |
| `schemas/page.js` | `page` | About, Refund Policy, Terms, etc. |

## How the app talks to Sanity

- **Public reads** (homepage, search, product detail): use the `useCdn: true` client — fast, ~1 minute eventual consistency.
- **Backend writes** (decrement stock when an order ships): use a server-side write token via `useCdn: false`.

## Env vars

Studio:
- `SANITY_STUDIO_PROJECT_ID` — your Sanity project ID

Client app (Vite):
- `VITE_SANITY_PROJECT_ID`
- `VITE_SANITY_DATASET` (defaults to `production`)

Backend (Express):
- `SANITY_PROJECT_ID`
- `SANITY_DATASET`
- `SANITY_WRITE_TOKEN` — get from Sanity dashboard → API → Tokens (Editor permissions)
