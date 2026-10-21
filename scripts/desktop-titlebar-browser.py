"""Window chrome IPC contract and dashboard flat styling; no account writes."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = os.environ.get('HUB_APP_URL', 'http://127.0.0.1:3004')
OUT = Path('.impeccable/review/dashboard-flat'); OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for mode in ['web', 'legacy', 'desktop']:
        page = browser.new_page(viewport={'width':1440,'height':1100}, user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36')
        if mode != 'web':
            page.add_init_script('''window.actions=[];window.maximized=false;window.__TAURI_INTERNALS__={invoke:async(cmd,args)=>{
              if(cmd!=='desktop_titlebar'||MODE==='legacy')throw Error('Unavailable');
              window.actions.push(args.action);
              if(args.action==='toggle_maximize')window.maximized=!window.maximized;
              return {supported:true,maximized:window.maximized};
            }};'''.replace('MODE',repr(mode)))
        page.goto(BASE+'/demo/dashboard')
        page.get_by_role('heading',name='Seu tempo, hoje',exact=True).wait_for()
        page.evaluate('document.fonts.ready')
        if mode == 'desktop':
            page.wait_for_function("window.actions.includes('enable')")
            page.get_by_role('button',name='Maximizar janela',exact=True).click()
            page.get_by_role('button',name='Restaurar janela',exact=True).click()
            page.get_by_role('button',name='Minimizar janela',exact=True).click()
            page.locator('.desktop-titlebar-drag').dispatch_event('mousedown',{'button':0,'detail':1})
            page.evaluate("document.title='(3) Hub'")
            page.get_by_label('3 mensagens não lidas').wait_for()
            assert page.locator('.rail').bounding_box()['y'] == 36
            assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
            page.screenshot(path=str(OUT/'desktop-titlebar.png'),full_page=True)
            page.get_by_role('button',name='Fechar Hub',exact=True).click()
            actions=page.evaluate('window.actions')
            assert all(x in actions for x in ['enable','minimize','toggle_maximize','drag','close']),actions
        else:
            page.wait_for_timeout(400)
            assert page.locator('.desktop-titlebar').count()==0
        borders=page.locator('.dashboard-redesign').evaluate('''root=>[root,...root.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).filter(e=>{let s=getComputedStyle(e);return ['Top','Right','Bottom','Left'].some(k=>parseFloat(s['border'+k+'Width'])>0&&s['border'+k+'Style']!=='none'&&s['border'+k+'Color']!=='rgba(0, 0, 0, 0)')}).map(e=>e.className)''')
        assert not borders,borders
        if mode == 'web':
            for view in ['Mês', 'Dia', 'Semana']:
                page.get_by_role('button', name=view, exact=True).click()
                assert page.locator('.calendar-section').evaluate("r=>[r,...r.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).every(e=>{let s=getComputedStyle(e);return ['Top','Right','Bottom','Left'].every(k=>parseFloat(s['border'+k+'Width'])===0||s['border'+k+'Style']==='none')})")
            page.get_by_role('button', name='Filtrar', exact=True).click()
            assert page.locator('.filter-popover').evaluate("e=>getComputedStyle(e).borderTopWidth==='0px'")
            page.get_by_label('Tipo de evento', exact=True).select_option('all')
            page.get_by_role('button', name='Novo evento', exact=True).click()
            assert page.get_by_role('dialog').evaluate("e=>getComputedStyle(e).borderTopWidth==='0px'")
            page.get_by_role('button', name='Voltar ao dashboard', exact=True).click()
        print(mode, 'passed')
        page.close()
    browser.close()
