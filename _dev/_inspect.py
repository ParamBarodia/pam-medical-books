"""Open page and dump console errors + DOM info to debug the empty hero."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    errors = []
    page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text[:200]}"))
    page.on("pageerror", lambda exc: errors.append(f"[PAGE-ERROR] {str(exc)[:300]}"))

    page.goto("http://localhost:5173", wait_until="domcontentloaded", timeout=20000)
    page.wait_for_timeout(3500)

    print("--- Console events ---")
    for e in errors:
        print(e)

    print("\n--- HTML inside .ms-hero-banner ---")
    html = page.evaluate("document.querySelector('.ms-hero-banner')?.outerHTML?.slice(0, 1500) || 'NOT FOUND'")
    print(html)

    print("\n--- Children count of .ms-flipbook-wrap ---")
    n = page.evaluate("document.querySelector('.ms-flipbook-wrap')?.children.length")
    print(n)

    ctx.close(); browser.close()
