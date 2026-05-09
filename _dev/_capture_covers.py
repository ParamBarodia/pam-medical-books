"""Capture sections containing books we know have real covers."""
from playwright.sync_api import sync_playwright
from pathlib import Path

OUT = Path(__file__).parent / "_screenshots"

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto("http://localhost:5173", wait_until="domcontentloaded", timeout=20000)
    # Wait for image lazy-loading
    page.wait_for_timeout(5000)
    page.screenshot(path=str(OUT / "real-covers-fold.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 900})
    page.evaluate("window.scrollTo(0, 1100)")
    page.wait_for_timeout(1500)
    page.screenshot(path=str(OUT / "real-covers-grid.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 900})
    page.evaluate("window.scrollTo(0, 2000)")
    page.wait_for_timeout(1500)
    page.screenshot(path=str(OUT / "real-covers-grid2.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 900})
    print("done")
    ctx.close()
    browser.close()
