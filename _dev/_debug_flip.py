"""Debug: confirm the .is-peeling class is applied and the animation actually runs.
Captures: computed clip-path before/during/after, plus screenshots."""
from playwright.sync_api import sync_playwright
from pathlib import Path

OUT = Path(__file__).parent / "_screenshots"

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto("http://localhost:5173", wait_until="domcontentloaded", timeout=20000)
    page.wait_for_timeout(2500)

    print("=== before click ===")
    print("classList:", page.evaluate("document.querySelector('.ms-hero-stack-current')?.className"))
    print("clip-path:", page.evaluate("getComputedStyle(document.querySelector('.ms-hero-stack-current'))?.clipPath"))
    print("animation:", page.evaluate("getComputedStyle(document.querySelector('.ms-hero-stack-current'))?.animation"))
    print("Next slide HTML present:", page.evaluate("!!document.querySelector('.ms-hero-stack-next')"))

    # Trigger via dot click (always visible, not hover-gated)
    page.evaluate("document.querySelectorAll('button[aria-label^=\"Go to slide\"]')[2]?.click()")
    page.wait_for_timeout(50)

    print("\n=== 50ms after click ===")
    print("classList:", page.evaluate("document.querySelector('.ms-hero-stack-current')?.className"))
    print("clip-path:", page.evaluate("getComputedStyle(document.querySelector('.ms-hero-stack-current'))?.clipPath"))
    print("animation-name:", page.evaluate("getComputedStyle(document.querySelector('.ms-hero-stack-current'))?.animationName"))

    page.wait_for_timeout(450)
    print("\n=== 500ms after click (should be mid-peel) ===")
    print("classList:", page.evaluate("document.querySelector('.ms-hero-stack-current')?.className"))
    print("clip-path:", page.evaluate("getComputedStyle(document.querySelector('.ms-hero-stack-current'))?.clipPath"))
    page.screenshot(path=str(OUT / "debug-mid.png"), clip={"x": 0, "y": 100, "width": 1440, "height": 600})

    ctx.close(); browser.close()
