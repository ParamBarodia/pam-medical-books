"""Visual smoke for the phone-only refactor: storefront, /track, /admin login."""
from playwright.sync_api import sync_playwright
from pathlib import Path

OUT = Path(__file__).parent / "_screenshots"

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    page.goto("http://localhost:5173", wait_until="domcontentloaded", timeout=20000)
    page.wait_for_timeout(2500)
    page.screenshot(path=str(OUT / "phone-only-1-home.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 900})
    print("[ok] storefront")

    page.goto("http://localhost:5173/track", wait_until="domcontentloaded", timeout=20000)
    page.wait_for_timeout(1000)
    page.screenshot(path=str(OUT / "phone-only-2-track-empty.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 900})

    # Look up our test phone (with the seeded UPI order)
    page.fill('input[placeholder*="98765"]', '9876500001')
    page.click('button:has-text("Look up")')
    page.wait_for_timeout(1500)
    page.screenshot(path=str(OUT / "phone-only-3-track-results.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 900})
    print("[ok] track")

    # Mobile admin
    ctx2 = browser.new_context(viewport={"width": 390, "height": 844})
    page2 = ctx2.new_page()
    page2.goto("http://localhost:5173/admin", wait_until="domcontentloaded", timeout=20000)
    page2.wait_for_timeout(1500)
    page2.screenshot(path=str(OUT / "phone-only-4-admin-login.png"), clip={"x": 0, "y": 0, "width": 390, "height": 844})
    print("[ok] admin login (mobile)")

    ctx.close(); ctx2.close(); browser.close()
print("done")
