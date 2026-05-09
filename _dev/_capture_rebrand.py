"""Capture the rebrand: navbar wordmark, hero, footer, mobile."""
from playwright.sync_api import sync_playwright
from pathlib import Path

OUT = Path(__file__).parent / "_screenshots"

with sync_playwright() as p:
    browser = p.chromium.launch()

    # Desktop
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto("http://localhost:5173", wait_until="domcontentloaded", timeout=20000)
    page.wait_for_timeout(3000)
    page.screenshot(path=str(OUT / "rebrand-desktop-fold.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 900})
    # Footer
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.wait_for_timeout(800)
    page.screenshot(path=str(OUT / "rebrand-desktop-footer.png"), clip={"x": 0, "y": 200, "width": 1440, "height": 700})
    ctx.close()

    # Mobile
    ctx = browser.new_context(viewport={"width": 375, "height": 812})
    page = ctx.new_page()
    page.goto("http://localhost:5173", wait_until="domcontentloaded", timeout=20000)
    page.wait_for_timeout(2500)
    page.screenshot(path=str(OUT / "rebrand-mobile-fold.png"), clip={"x": 0, "y": 0, "width": 375, "height": 812})
    ctx.close()
    browser.close()

print("done")
