"""Daily workflow in the public in-memory preview; no account or backend writes."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
from dashboard_browser_helpers import select_scenario
BASE = os.environ.get('HUB_APP_URL', 'http://127.0.0.1:3022').rstrip('/')
OUT = Path(os.environ.get('HUB_REVIEW_DIR', '/tmp/zulu-workflow')); OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox', '--enable-unsafe-swiftshader'])
    for width, height in [(1440,1100), (390,844), (320,740)]:
        page = browser.new_page(viewport={'width':width,'height':height}, reduced_motion='reduce', timezone_id='America/Sao_Paulo')
        errors, writes = [], []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('request', lambda r: writes.append(r.url) if r.method not in ('GET','HEAD','OPTIONS') and ('/rest/v1/' in r.url or '/auth/v1/' in r.url) else None)
        page.goto(BASE+'/demo/dashboard'); page.get_by_role('heading', name='Seu tempo, hoje', exact=True).wait_for()
        page.evaluate('document.fonts.ready')
        assert page.locator('.app-footer, .today-demo-footer, footer').count() == 0
        rail = page.locator('.rail')
        shape = rail.evaluate('e=>({radius:parseFloat(getComputedStyle(e).borderRadius),border:getComputedStyle(e).borderWidth,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})')
        assert shape['radius'] >= 20 and shape['border'] == '0px' and shape['left'] >= 10 and shape['right'] <= width-10, shape
        assert rail.locator('.today-nav-icon svg').count() >= 7
        assert page.locator('.today-balances').inner_text().count('a mais') == 2
        assert 'feitas' in page.locator('.today-balances').inner_text() and 'previstas até hoje' in page.locator('.today-balances').inner_text()
        assert 'incluem a meta de hoje' in page.locator('.today-balance-basis').inner_text()
        assert 'Interface do aplicativo' in page.locator('.today-people-card').inner_text()
        assert 'Pode dar uma olhada' in page.locator('.today-inbox').inner_text()
        page.locator('.today-inbox-message').click(); page.get_by_role('dialog',name='Conversa direta',exact=True).wait_for(); page.keyboard.press('Escape')
        select_scenario(page,'idle')
        trigger = page.locator('.today-timer-primary'); trigger.click()
        picker = page.get_by_role('region', name='Escolher atividade', exact=True)
        picker.wait_for(); assert trigger.get_attribute('aria-expanded') == 'true'
        field = page.get_by_label('Atividade', exact=True)
        assert field.evaluate('e=>e===document.activeElement')
        assert page.url.endswith('/demo/dashboard')
        page.get_by_role('button',name='Iniciar atividade',exact=True).click()
        assert page.locator('.today-activity-picker').count() == 1 and field.evaluate('e=>!e.checkValidity()')
        task = picker.get_by_role('button',name='Revisar o calendário Tarefa',exact=True)
        task.click(); assert field.input_value() == 'Revisar o calendário'
        assert task.get_attribute('aria-pressed') == 'true'
        assert 'Lançamento ZULU' in picker.locator('.select__trigger').inner_text()
        page.screenshot(path=str(OUT/f'activity-{width}.png'),full_page=True)
        page.get_by_role('button',name='Iniciar atividade',exact=True).click(); picker.wait_for(state='hidden')
        assert 'Revisar o calendário' in page.locator('.today-people-card').inner_text()
        page.get_by_role('button',name='Pausar para almoço',exact=True).click(); assert 'Almoço · Revisar o calendário' in page.locator('.today-people-card').inner_text()
        page.get_by_role('button',name='Encerrar e salvar',exact=True).click(); assert 'Revisar o calendário' not in page.locator('.today-people-card').inner_text()
        trigger.click(); field.fill('Planejamento com o time'); page.keyboard.press('Escape'); picker.wait_for(state='hidden')
        assert trigger.evaluate('e=>e===document.activeElement')
        trigger.click(); field.fill('Revisar documentação'); page.get_by_role('button',name='Iniciar atividade',exact=True).click()
        assert 'Revisar documentação' in page.locator('.today-people-card').inner_text()
        select_scenario(page,'empty'); assert page.locator('.today-inbox-message').count() == 0
        assert 'As pessoas do time aparecerão aqui.' in page.locator('.today-people-card').inner_text()
        select_scenario(page,'running'); page.evaluate('window.scrollTo(0,0)')
        page.screenshot(path=str(OUT/f'final-{width}.png'),full_page=True)
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
        assert not errors and not writes, (errors,writes)
        print(json.dumps({'width':width,'floatingRail':True,'footerRemoved':True,'explicitBalance':True,'inlineTaskAndText':True,'focusAndEscape':True,'activityPauseStop':True,'dmPreview':True,'noBackendWrites':True,'pageErrors':errors}),flush=True)
        page.close()
    for reduced in [False, True]:
        page = browser.new_page(viewport={'width':1440,'height':1100}, reduced_motion='reduce' if reduced else 'no-preference')
        page.goto(BASE+'/demo/dashboard'); page.get_by_role('heading',name='Seu tempo, hoje',exact=True).wait_for()
        home = page.get_by_role('link',name='Hoje',exact=True); group = home.locator('.today-nav-icon svg g').first
        home.hover(); page.wait_for_timeout(200)
        transform = group.evaluate('e=>getComputedStyle(e).transform')
        assert (transform == 'none') if reduced else (transform != 'none'), transform
        page.mouse.move(1000,700); page.wait_for_timeout(700)
        home.focus(); page.wait_for_timeout(200)
        transform = group.evaluate('e=>getComputedStyle(e).transform')
        assert (transform == 'none') if reduced else (transform != 'none'), transform
        print(json.dumps({'hugeiconsHoverAndKeyboard':True,'reducedMotion':reduced}),flush=True)
        page.close()
    browser.close()
