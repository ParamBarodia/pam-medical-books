"""Smoke test new wires: WishlistDrawer, AccountDrawer, COD checkout path."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, time, urllib.request

URL = "http://localhost:5173"
API = "http://localhost:4000/api"
OUT = Path(__file__).parent / "_screenshots"

email = f"smoke_{int(time.time())}@test.dev"

# Sign up via API to get a token
def post(path, body, token=None):
    req = urllib.request.Request(API + path, method="POST",
        headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})},
        data=json.dumps(body).encode())
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

resp = post("/auth/signup", {"email": email, "password": "password123", "name": "Smoke Tester"})
token = resp["token"]
print(f"[ok] signed up {email} via API")

# Add a book to the user's wishlist via API
books = json.loads(urllib.request.urlopen(API + "/books").read())
first_id = books[0]["id"]
post("/wishlist", {"bookId": first_id}, token=token)
print(f"[ok] wishlisted book {first_id}")

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    # Inject token before page loads
    page.add_init_script(f"localStorage.setItem('ms_token', {json.dumps(token)})")

    page.goto(URL, wait_until="networkidle", timeout=20000)
    page.wait_for_timeout(800)

    # Account drawer
    page.click('[aria-label="Account"]')
    page.wait_for_timeout(900)
    page.screenshot(path=str(OUT / "wired-account.png"), clip={"x": 920, "y": 0, "width": 520, "height": 900})
    print("[ok] account drawer captured")
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)

    # Wishlist drawer (should show 1 book)
    page.click('[aria-label="Wishlist"]')
    page.wait_for_timeout(900)
    page.screenshot(path=str(OUT / "wired-wishlist.png"), clip={"x": 980, "y": 0, "width": 460, "height": 900})
    print("[ok] wishlist drawer captured (with item)")
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)

    # Add the same book to cart (just call the API and refresh)
    post("/cart", {"bookId": first_id, "qty": 1, "isBundle": False}, token=token)
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(700)

    # Open cart, proceed to checkout
    page.click('[aria-label="Cart"]')
    page.wait_for_timeout(500)
    page.click('button:has-text("Proceed to Checkout")')
    page.wait_for_timeout(500)

    # Address
    page.fill('input >> nth=0', 'Smoke Tester')
    page.fill('input >> nth=1', '9876543210')
    page.fill('input >> nth=2', email)
    page.fill('input >> nth=3', '123 Test Street')
    page.fill('input >> nth=4', 'Apt 4')
    page.fill('input >> nth=5', 'Mumbai')
    page.fill('input >> nth=6', 'Maharashtra')
    page.fill('input >> nth=7', '400001')
    page.click('button:has-text("Continue to Payment")')
    page.wait_for_timeout(400)

    # Pick COD
    page.click('text=Cash on Delivery')
    page.wait_for_timeout(200)
    page.click('button:has-text("Place Order")')
    page.wait_for_timeout(2500)
    page.screenshot(path=str(OUT / "wired-cod-confirm.png"))
    print("[ok] COD checkout completed")

    ctx.close()
    browser.close()

print("done")
