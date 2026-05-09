# Dev scripts

Throwaway Playwright + curl scripts used during development for visual
validation, smoke testing, and debugging. Not part of the product.

| Script | Purpose |
|---|---|
| `_capture_covers.py` | Screenshots the homepage book grid to verify cover-image enrichment |
| `_capture_flip.py` | Captures the hero page-peel mid-animation for visual QA |
| `_capture_rebrand.py` | Pre/post screenshots of the MedShelf → Pam Medical Books rebrand |
| `_capture_v2.py` | Captures the clip-path peel + glass-tinted faculty tiles |
| `_debug_flip.py` | Inspects live `getComputedStyle()` during the hero peel animation |
| `_inspect.py` | Dumps console errors + DOM state from the live page |
| `_phone_only_smoke.py` | End-to-end smoke for storefront, /track, /admin login |
| `_smoke.py` | Older end-to-end (pre phone-only); checks wishlist/account/COD |
| `_tour.py` | 8-shot guided tour: storefront → cart → checkout → tracking |

Most of these expect:
- Vite dev server on `http://localhost:5173`
- API on `http://localhost:4000`
- A test customer or admin phone in the `.env` allowlist

Output goes to `../_screenshots/` (gitignored).

Run with: `cd .. && PYTHONIOENCODING=utf-8 python _dev/<script>.py`
