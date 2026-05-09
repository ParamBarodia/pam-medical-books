"""Capture the hero carousel at multiple points during the flip animation."""
from playwright.sync_api import sync_playwright
from pathlib import Path

OUT = Path(__file__).parent / "_screenshots"
CAPS = [
    ("a-rest", 0),       # before clicking
    ("b-150ms", 150),    # early rotation
    ("c-400ms", 400),    # ~35% through, ~-50deg
    ("d-700ms", 700),    # ~63% through, ~-130deg
    ("e-after", 1300),   # after the flip completes
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto("http://localhost:5173", wait_until="domcontentloaded", timeout=20000)
    page.wait_for_timeout(2500)

    page.screenshot(path=str(OUT / "carousel-a-rest.png"), clip={"x": 0, "y": 100, "width": 1440, "height": 600})

    page.click('[aria-label="Next slide"]')
    elapsed = 0
    for name, t in CAPS[1:]:
        wait = t - elapsed
        if wait > 0: page.wait_for_timeout(wait)
        elapsed = t
        page.screenshot(path=str(OUT / f"carousel-{name}.png"), clip={"x": 0, "y": 100, "width": 1440, "height": 600})
        print(f"[ok] {name}")

    ctx.close(); browser.close()
print("done")
