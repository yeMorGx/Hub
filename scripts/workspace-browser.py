"""QA of public in-memory fixtures; no login or business writes."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE=os.environ.get('HUB_APP_URL','http://127.0.0.1:3001').rstrip('/')
OUT=Path(os.environ.get('HUB_REVIEW_DIR','/tmp/zulu-workspace-qa'));OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width,height in [(1440,1000),(390,844)]:
  context=browser.new_context(viewport={'width':width,'height':height},locale='pt-BR',timezone_id='America/Sao_Paulo',accept_downloads=True)
  page=context.new_page();errors=[];writes=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:writes.append(r.url) if r.method not in ['GET','HEAD','OPTIONS'] else None)
  page.goto(BASE+'/demo/dashboard')
  page.locator('.greeting-signature > g path').first.wait_for()
  assert page.locator('.today-journey').count()==0
  assert page.locator('.person-unread-badge').count()>0
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  if width>760:
   assert page.locator('.rail').evaluate('e=>getComputedStyle(e).backgroundColor')==page.locator('.topbar').evaluate('e=>getComputedStyle(e).backgroundColor')
   assert 'radial-gradient' in page.locator('.app-content').evaluate('e=>getComputedStyle(e,"::before").backgroundImage')
  page.wait_for_timeout(1200)
  page.screenshot(path=str(OUT/f'dashboard-{width}.png'),full_page=True)
  page.get_by_role('button',name='Trocar time: Estúdio',exact=True).click()
  page.get_by_role('menu',name='Trocar time').wait_for()
  page.screenshot(path=str(OUT/f'teams-{width}.png'))
  page.keyboard.press('Escape')
  page.reload();page.locator('.greeting-signature > g path').first.wait_for()
  assert page.evaluate('sessionStorage.getItem("zulu:signature:demo-user")')=='seen'
  assert page.locator('.opening-greeting').get_attribute('data-signature-play')=='false'
  page.goto(BASE+'/demo/workspace')
  page.get_by_role('button',name='Gerar relatório',exact=True).click()
  page.get_by_role('button',name='Baixar PDF',exact=True).wait_for()
  assert page.get_by_role('button',name='Baixar PDF',exact=True).is_enabled()
  assert page.locator('.report-person-list details').count()==3
  assert '12h 00min' in page.locator('.report-summary').inner_text()
  page.screenshot(path=str(OUT/f'report-{width}.png'),full_page=True)
  with page.expect_download() as download:
   page.get_by_role('button',name='Baixar PDF',exact=True).click()
  download.value.save_as(str(OUT/f'report-{width}.pdf'))
  page.goto(BASE+'/demo/workspace?page=settings')
  page.get_by_role('heading',name='Sua conta',exact=True).wait_for()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(OUT/f'settings-{width}.png'),full_page=True)
  page.locator('.settings-tabs').get_by_role('tab',name='Preferências',exact=True).click()
  page.get_by_role('button',name='Tema do aplicativo',exact=False).click()
  page.get_by_role('option',name='Escuro',exact=True).click();page.get_by_role('listbox').wait_for(state='hidden')
  assert page.locator('html').get_attribute('data-zulu-theme')=='dark'
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.evaluate('scrollTo(0,0)');page.wait_for_timeout(400)
  page.screenshot(path=str(OUT/f'dark-{width}.png'),full_page=True)
  page.get_by_role('button',name='Tema do aplicativo',exact=False).click();page.get_by_role('option',name='Claro',exact=True).click();page.get_by_role('listbox').wait_for(state='hidden')
  if width<760:
   page.get_by_role('button',name='Abrir navegação',exact=True).click()
   page.wait_for_function("Math.abs(document.querySelector('.workspace-drawer').getBoundingClientRect().left)<1")
   page.wait_for_timeout(900)
   page.screenshot(path=str(OUT/'drawer-mobile.png'))
   page.get_by_role('dialog',name='Navegação principal').get_by_role('button',name='Fechar navegação',exact=True).click()
  page.goto(BASE+'/demo/workspace?role=member')
  assert page.get_by_role('button',name='Pessoa do relatório',exact=True).count()==0
  page.get_by_role('button',name='Gerar relatório',exact=True).click()
  expect(page.locator('.report-person-list details')).to_have_count(1)
  assert not errors,errors
  assert not writes,writes
  print(json.dumps({'viewport':width,'dashboard':True,'frame':True,'settings':True,'reportAndPdf':True,'memberReport':True,'errors':errors,'writes':writes}),flush=True)
  context.close()
 browser.close()
