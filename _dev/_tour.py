"""Capture a tour of the rebranded site for review."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, time, urllib.request

URL = "http://localhost:5173"
API = "http://localhost:4000/api"
OUT = Path(__file__).parent / "_screenshots"

# Sign up and pre-load wishlist + cart so the drawers have content to show
email = f"tour_{int(time.time())}@local.dev"

def post(path, body, token=None):
    req = urllib.request.Request(API + path, method="POST",
        headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})},
        data=json.dumps(body).encode())
    return json.loads(urllib.request.urlopen(req).read())

token = post("/auth/signup", {"email": email, "password": "password123", "name": "Demo User"})["token"]
books = json.loads(urllib.request.urlopen(API + "/books?limit=10").read())
post("/wishlist", {"bookId": books[0]["id"]}, token=token)
post("/wishlist", {"bookId": books[2]["id"]}, token=token)
post("/cart", {"bookId": books[0]["id"], "qty": 1, "isBundle": False}, token=token)
post("/cart", {"bookId": books[1]["id"], "qty": 2, "isBundle": False}, token=token)

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.add_init_script(f"localStorage.setItem('ms_token', {json.dumps(token)})")
    page.goto(URL, wait_until="domcontentloaded", timeout=20000)
    page.wait_for_timeout(3500)

    # 1. Top fold (navbar wordmark + hero)
    page.screenshot(path=str(OUT / "tour-1-fold.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 900})

    # 2. Bestsellers section (real covers visible)
    page.evaluate("window.scrollTo(0, 1900)")
    page.wait_for_timeout(1200)
    page.screenshot(path=str(OUT / "tour-2-bestsellers.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 900})

    # 3. Pam Guarantee banner
    page.evaluate("""() => {
      const els = [...document.querySelectorAll('*')].filter(e => e.textContent && e.textContent.includes('100% Original'));
      if (els[0]) els[0].scrollIntoView({block:'center'});
    }""")
    page.wait_for_timeout(800)
    page.screenshot(path=str(OUT / "tour-3-guarantee.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 900})

    # 4. Footer
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.wait_for_timeout(800)
    page.screenshot(path=str(OUT / "tour-4-footer.png"), clip={"x": 0, "y": 100, "width": 1440, "height": 800})

    # Back to top, open drawers
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(500)

    def close_drawer():
        # Click the X button inside the open drawer (the one that's visible)
        page.evaluate("""() => {
          const dialogs = [...document.querySelectorAll('[role="dialog"]')];
          const open = dialogs.find(d => d.offsetParent !== null);
          if (!open) return;
          const closeBtn = open.querySelector('button[aria-label="Close"], button[aria-label="Close cart"]');
          if (closeBtn) closeBtn.click();
        }""")
        page.wait_for_timeout(400)

    # 5. Wishlist drawer
    page.click('[aria-label="Wishlist"]')
    page.wait_for_timeout(900)
    page.screenshot(path=str(OUT / "tour-5-wishlist.png"), clip={"x": 940, "y": 0, "width": 500, "height": 900})
    close_drawer()

    # 6. Account drawer
    page.click('[aria-label="Account"]')
    page.wait_for_timeout(900)
    page.screenshot(path=str(OUT / "tour-6-account.png"), clip={"x": 920, "y": 0, "width": 520, "height": 900})
    close_drawer()

    # 7. Cart drawer (already populated)
    page.click('[aria-label="Cart"]')
    page.wait_for_timeout(900)
    page.screenshot(path=str(OUT / "tour-7-cart.png"), clip={"x": 940, "y": 0, "width": 500, "height": 900})
    ctx.close()

    # 8. Mobile fold
    ctx = browser.new_context(viewport={"width": 375, "height": 812})
    page = ctx.new_page()
    page.goto(URL, wait_until="domcontentloaded", timeout=20000)
    page.wait_for_timeout(3000)
    page.screenshot(path=str(OUT / "tour-8-mobile.png"), clip={"x": 0, "y": 0, "width": 375, "height": 812})
    ctx.close()
    browser.close()

print("done")
