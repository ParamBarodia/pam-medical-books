"""Capture the new clip-path peel + glass tiles."""
from playwright.sync_api import sync_playwright
from pathlib import Path

OUT = Path(__file__).parent / "_screenshots"

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto("http://localhost:5173", wait_until="domcontentloaded", timeout=20000)
    page.wait_for_timeout(2500)

    page.screenshot(path=str(OUT / "v2-rest.png"), clip={"x": 0, "y": 100, "width": 1440, "height": 700})

    # Force-trigger the peel via JS so we don't depend on hover-revealed nav arrow
    page.evaluate("document.querySelectorAll('button[aria-label=\"Next slide\"]')[0]?.click()")
    for label, t in [("a-200", 200), ("b-450", 250), ("c-750", 300), ("d-1000", 250)]:
        page.wait_for_timeout(t)
        page.screenshot(path=str(OUT / f"v2-peel-{label}.png"), clip={"x": 0, "y": 100, "width": 1440, "height": 700})
        print(f"[ok] {label}")

    # Faculty tiles glass
    page.evaluate("window.scrollTo(0, 1280)")
    page.wait_for_timeout(800)
    page.screenshot(path=str(OUT / "v2-tiles.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 900})
    print("[ok] tiles")

    ctx.close(); browser.close()
print("done")
