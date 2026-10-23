"""Exercise only public fixtures; never authenticate or write business data."""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

base = os.environ.get("HUB_APP_URL", "http://127.0.0.1:3001").rstrip("/")
captures = Path(os.environ.get("HUB_CALENDAR_CAPTURES", "/tmp/zulu-calendar-selection"))
captures.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
    for width, height in [(1440, 1000), (390, 844)]:
        context = browser.new_context(viewport={"width": width, "height": height}, has_touch=width < 760, timezone_id="America/Sao_Paulo", locale="pt-BR", reduced_motion="reduce")
        page = context.new_page()
        errors, writes = [], []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("request", lambda request: writes.append(request.url) if request.method not in ["GET", "HEAD", "OPTIONS"] else None)
        page.clock.install(time=datetime(2026, 10, 20, 15, 0, tzinfo=timezone.utc))
        page.goto(base + "/demo/calendar")
        # Blank month space creates an event; the date button still opens the day.
        cell = page.locator('.month-cell').filter(has=page.get_by_role('button', name='Abrir dia 19 de outubro de 2026', exact=True))
        cell.click(position={"x": 5, "y": cell.bounding_box()["height"] * .7})
        page.get_by_role("dialog", name="Novo encontro").wait_for()
        assert page.locator('input[name="start"]').input_value() == "2026-10-19T10:00"
        page.get_by_role("button", name="Fechar", exact=True).click()
        page.get_by_role("button", name="Abrir dia 19 de outubro de 2026", exact=True).click()
        assert page.locator('.calendar-selectable-column').evaluate('e => getComputedStyle(e).backgroundImage !== "none"')
        assert page.locator('[data-calendar-slot]').first.evaluate('e => getComputedStyle(e).backgroundColor') == "rgba(0, 0, 0, 0)"

        def slot(hour):
            result = page.get_by_role("button", name=f"Criar evento Seg às {hour}:00", exact=True)
            result.scroll_into_view_if_needed()
            return result

        def expect_range(start, end):
            page.get_by_role("dialog", name="Novo encontro").wait_for()
            assert page.locator('input[name="start"]').input_value() == f"2026-10-19T{start}"
            assert page.locator('input[name="end"]').input_value() == f"2026-10-19T{end}"

        if width >= 760:
            box = slot("10").bounding_box()
            page.mouse.click(box["x"] + 40, box["y"] + box["height"] * .3)
            expect_range("10:15", "11:15")
            page.get_by_role("button", name="Fechar", exact=True).click()
            # Drag down; both endpoints are included as quarter-hour slots.
            box = slot("10").bounding_box()
            x, y = box["x"] + 40, box["y"] + box["height"] * .3
            page.mouse.move(x, y)
            page.mouse.down()
            page.mouse.move(x, y + 84, steps=8)
            assert page.locator('.calendar-selection').inner_text() == "10:15 – 11:30"
            page.screenshot(path=str(captures / "desktop-selection.png"))
            page.mouse.up()
            expect_range("10:15", "11:30")
            page.get_by_role("button", name="Fechar", exact=True).click()
            # Reverse drag produces the same chronological interval.
            box = slot("11").bounding_box()
            x, y = box["x"] + 40, box["y"] + box["height"] * .3
            page.mouse.move(x, y)
            page.mouse.down()
            page.mouse.move(x, y - 84, steps=8)
            page.mouse.up()
            expect_range("10:15", "11:30")
            page.get_by_role("button", name="Fechar", exact=True).click()
            # Escape cancels the gesture without creating or opening anything.
            box = slot("10").bounding_box()
            page.mouse.move(box["x"] + 40, box["y"] + 5)
            page.mouse.down()
            page.mouse.move(box["x"] + 40, box["y"] + 50)
            page.keyboard.press("Escape")
            page.mouse.up()
            assert page.get_by_role("dialog").count() == 0
            assert page.locator('.calendar-selection').count() == 0
            # Keyboard activation remains available through HeroUI's button.
            slot("12").focus()
            page.keyboard.press("Enter")
            expect_range("12:00", "13:00")
            page.get_by_role("button", name="Fechar", exact=True).click()
            slot("13").focus()
            page.keyboard.press("Space")
            expect_range("13:00", "14:00")
        else:
            slot("10").tap(position={"x": 30, "y": 30})
            expect_range("10:00", "11:00")

        page.get_by_label("Título", exact=True).fill("Reunião de teste")
        # Invalid intervals stay in the form with an actionable error.
        page.locator('input[name="end"]').fill("2026-10-19T08:00")
        page.get_by_role("button", name="Criar encontro de teste", exact=True).click()
        assert page.get_by_role("dialog").get_by_role("alert").inner_text() == "Escolha um término depois do início."
        page.locator('input[name="end"]').fill("2026-10-19T14:30" if width >= 760 else "2026-10-19T11:30")
        page.screenshot(path=str(captures / f"form-{width}.png"))
        page.get_by_role("button", name="Criar encontro de teste", exact=True).click()
        page.get_by_role("dialog").wait_for(state="hidden")
        page.get_by_role("button", name="Reunião de teste", exact=False).click()
        page.get_by_role("dialog", name="Reunião de teste").wait_for()
        page.get_by_role("button", name="Fechar", exact=True).click()
        page.evaluate("window.scrollTo(0, 0)")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        page.screenshot(path=str(captures / f"calendar-{width}.png"), full_page=True)
        assert not errors, errors
        assert not writes, writes
        print(json.dumps({"viewport": width, "click": True, "dragAndKeyboard": width >= 760, "touch": width < 760, "localCreate": True, "pageErrors": errors, "writes": writes}))
        context.close()
    browser.close()
