"""Shared dashboard UI, using public in-memory fixtures. No account or business writes.

Run with HUB_APP_URL=http://127.0.0.1:3000 python scripts/dashboard-browser.py.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from dashboard_browser_helpers import select_scenario

BASE = os.environ.get("HUB_APP_URL", "http://127.0.0.1:3000").rstrip("/")
OUTPUT = Path(os.environ.get("HUB_REVIEW_DIR", ".impeccable/review/dashboard"))
OUTPUT.mkdir(parents=True, exist_ok=True)


def capture(page, name):
    page.evaluate("window.scrollTo(0, 0)")
    page.screenshot(path=str(OUTPUT / name), full_page=True)


with sync_playwright() as driver:
    browser = driver.chromium.launch(
        executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"),
        headless=True, args=["--no-sandbox"],
    )
    for width, height in [(1440, 1100), (1280, 900), (390, 844)]:
        page = browser.new_page(
            viewport={"width": width, "height": height},
            timezone_id="America/Sao_Paulo", reduced_motion="reduce",
        )
        errors, writes = [], []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("request", lambda request: writes.append(request.url)
                if request.method not in ("GET", "HEAD", "OPTIONS") and
                ("/auth/v1/" in request.url or "/rest/v1/" in request.url) else None)
        page.goto(BASE + "/demo/dashboard")
        page.get_by_role("heading", name="Seu tempo, hoje", exact=True).wait_for()
        page.evaluate("document.fonts.ready")
        assert not page.evaluate("document.documentElement.scrollWidth > innerWidth")
        capture(page, f"{width}.png")

        page.get_by_role("button", name="Pausar para almoço", exact=True).focus()
        page.keyboard.press("Tab")
        stop = page.get_by_role("button", name="Encerrar e salvar", exact=True)
        assert stop.evaluate("el => el === document.activeElement")
        assert stop.evaluate("el => getComputedStyle(el).outlineColor") == "rgb(255, 255, 255)"
        if width == 1440:
            capture(page, "focus-1440.png")

        page.get_by_role("button", name="Pausar para almoço", exact=True).click()
        page.get_by_role("button", name="Retomar trabalho", exact=True).wait_for()
        paused = page.locator(".today-clock").inner_text()
        page.wait_for_timeout(1200)
        assert page.locator(".today-clock").inner_text() == paused
        page.get_by_role("button", name="Retomar trabalho", exact=True).click()
        page.wait_for_timeout(1100)
        assert page.locator(".today-clock").inner_text() != paused
        page.get_by_role("button", name="Encerrar e salvar", exact=True).click()
        assert page.locator(".today-clock").inner_text() == "00:00:00"
        assert not page.locator(".today-recent").first.is_disabled()
        page.locator(".today-recent").first.click()
        page.get_by_role("button", name="Pausar para almoço", exact=True).wait_for()

        select_scenario(page, "lunch")
        page.get_by_text("O almoço não entra nas horas. Retome quando voltar.", exact=True).wait_for()
        if width == 1440:
            capture(page, "lunch-1440.png")
        select_scenario(page, "unconfigured")
        page.get_by_role("button", name="Configurar minha jornada", exact=True).wait_for()
        assert page.locator(".today-progress").count() == 0
        if width == 390:
            capture(page, "unconfigured-390.png")

        select_scenario(page, "holiday")
        page.locator(".today-home-office").get_by_text("Semana sem home office · feriado", exact=True).wait_for()
        assert page.locator(".today-office-person .avatar").count() == 0
        assert page.locator(".home-office-assignment").count() == 0
        assert "Lia Martins" in page.locator(".today-office-next").inner_text()
        if width == 1440:
            capture(page, "holiday-1440.png")
        office = page.locator(".today-home-office").inner_text()
        page.get_by_role("radio", name="Semana", exact=True).click()
        page.get_by_role("button", name="Próxima semana", exact=True).click()
        assert page.locator(".today-home-office").inner_text() == office

        select_scenario(page, "empty")
        page.get_by_text("Sem home office na escala", exact=True).wait_for()
        page.get_by_text("As pessoas do time aparecerão aqui.", exact=True).wait_for()
        assert page.locator(".today-recent").count() == 0
        if width == 390:
            capture(page, "empty-390.png")
        select_scenario(page, "error")
        page.get_by_text("Não foi possível carregar a escala.", exact=True).wait_for()
        page.get_by_role("button", name="Tentar novamente", exact=True).click()
        assert page.get_by_text("Não foi possível carregar a escala.", exact=True).count() == 0
        assert not page.evaluate("document.documentElement.scrollWidth > innerWidth")
        assert not errors, errors
        assert not writes, writes
        print(json.dumps({"width": width, "pauseResume": True, "stopRestart": True,
                          "unconfigured": True, "holiday": True, "dateIndependent": True,
                          "empty": True, "retry": True, "overflow": False,
                          "pageErrors": errors, "businessWrites": writes}))
        page.close()
    browser.close()
