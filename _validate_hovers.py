"""Capture hover-state screenshots so we can verify the button animations."""
from playwright.sync_api import sync_playwright
from pathlib import Path

URL = "http://localhost:5173"
OUT = Path(__file__).parent / "_screenshots"
OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
    page = ctx.new_page()
    page.goto(URL, wait_until="networkidle", timeout=20000)
    page.wait_for_timeout(800)

    # 1. Hero "Buy Now" button hover
    btn = page.locator('button:has-text("Buy Now")').first
    if btn.count() > 0:
        btn.scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        btn.hover()
        page.wait_for_timeout(400)
        bbox = btn.bounding_box()
        if bbox:
            page.screenshot(
                path=str(OUT / "hover-buy-now.png"),
                clip={"x": max(bbox["x"] - 40, 0), "y": max(bbox["y"] - 60, 0),
                      "width": min(bbox["width"] + 320, 900), "height": bbox["height"] + 140},
            )
        print("[hover] Buy Now ok")

    # Reset
    page.mouse.move(0, 0); page.wait_for_timeout(200)

    # 2. Quick pill hover (Publishers / category pill)
    pill = page.locator('.ms-btn-pill').first
    if pill.count() > 0:
        pill.scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        pill.hover()
        page.wait_for_timeout(400)
        bbox = pill.bounding_box()
        if bbox:
            page.screenshot(
                path=str(OUT / "hover-pill.png"),
                clip={"x": max(bbox["x"] - 60, 0), "y": max(bbox["y"] - 40, 0),
                      "width": 900, "height": bbox["height"] + 100},
            )
        print("[hover] pill ok")

    page.mouse.move(0, 0); page.wait_for_timeout(200)

    # 3. Card "+" button (scroll into view first)
    card_btn = page.locator('.ms-btn-icon').first
    if card_btn.count() > 0:
        card_btn.scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        card_btn.hover()
        page.wait_for_timeout(400)
        bbox = card_btn.bounding_box()
        if bbox:
            page.screenshot(
                path=str(OUT / "hover-add-icon.png"),
                clip={"x": max(bbox["x"] - 200, 0), "y": max(bbox["y"] - 350, 0),
                      "width": 360, "height": 460},
            )
        print("[hover] add icon ok")

    page.mouse.move(0, 0); page.wait_for_timeout(200)

    # 4. SECTION HEAD "View all →" link
    link = page.locator('.ms-btn-link').first
    if link.count() > 0:
        link.scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        link.hover()
        page.wait_for_timeout(400)
        bbox = link.bounding_box()
        if bbox:
            page.screenshot(
                path=str(OUT / "hover-view-all.png"),
                clip={"x": max(bbox["x"] - 200, 0), "y": max(bbox["y"] - 30, 0),
                      "width": 360, "height": 80},
            )
        print("[hover] view all ok")

    page.mouse.move(0, 0); page.wait_for_timeout(200)

    # 5. Search button hover
    search = page.locator('.ms-btn-search')
    if search.count() > 0:
        search.first.hover()
        page.wait_for_timeout(400)
        page.screenshot(path=str(OUT / "hover-search.png"), clip={"x": 40, "y": 30, "width": 1360, "height": 130})
        print("[hover] search ok")

    ctx.close()
    browser.close()
