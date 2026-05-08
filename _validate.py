"""Visual validation for the full-stack MedShelf at http://localhost:5173."""
from playwright.sync_api import sync_playwright
from pathlib import Path

URL = "http://localhost:5173"
OUT = Path(__file__).parent / "_screenshots"
OUT.mkdir(exist_ok=True)

VIEWPORTS = [
    ("mobile-375",   375,  812),
    ("tablet-768",   768,  1024),
    ("desktop-1440", 1440, 900),
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    for name, w, h in VIEWPORTS:
        ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=2)
        page = ctx.new_page()
        page.goto(URL, wait_until="networkidle", timeout=20000)
        page.wait_for_timeout(800)
        page.screenshot(path=str(OUT / f"{name}-fold.png"), full_page=False)
        page.screenshot(path=str(OUT / f"{name}-full.png"), full_page=True)
        print(f"[{name}] {w}x{h} ok")
        ctx.close()
    browser.close()
print("Done →", OUT)
