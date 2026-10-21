from playwright.sync_api import sync_playwright
import json,re,os
from datetime import datetime, timezone
# Uses a public fixture only; no auth, emails or business writes.
base=os.environ.get('HUB_APP_URL','http://127.0.0.1:3001').rstrip('/')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width,height in [(1440,1000),(390,844)]:
  ctx=b.new_context(viewport={'width':width,'height':height},timezone_id='America/Sao_Paulo')
  page=ctx.new_page(); errors=[]; writes=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:writes.append(r.url) if r.method not in ['GET','HEAD','OPTIONS'] else None)
  page.clock.install(time=datetime(2026,10,20,15,0,0,tzinfo=timezone.utc))
  page.goto(base+'/demo/calendar')
  page.get_by_role('button',name='Mês',exact=True).wait_for()
  assert page.locator('.month-cell').count()==35
  assert page.get_by_role('button',name='Mês',exact=True).get_attribute('aria-pressed')=='true'
  assert page.locator('.month-date[aria-current="date"]').inner_text()=='20'
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=f'/tmp/hub-calendar-month-{width}.png',full_page=True)
  page.get_by_role('button',name='Próximo mês',exact=True).click()
  assert 'novembro de 2026' in page.locator('.date-controls').inner_text()
  page.get_by_role('button',name='Hoje',exact=True).click()
  assert 'outubro de 2026' in page.locator('.date-controls').inner_text()
  if width<760:
   page.get_by_role('button',name='5 eventos em 20/10/2026',exact=True).click()
   assert page.get_by_role('button',name='Dia',exact=True).get_attribute('aria-pressed')=='true'
  else:
   page.get_by_role('button',name='+2 eventos',exact=True).click()
   assert page.locator('.calendar-event').count()==5
  page.get_by_role('button',name='Mês',exact=True).click()
  page.get_by_role('button',name='Abrir dia 24 de outubro de 2026',exact=True).click()
  assert page.locator('.calendar-event').count()==2
  assert '00:00 – 02:00' in page.locator('.calendar-event').filter(has_text='Manutenção noturna').inner_text()
  page.get_by_role('button',name='Criar evento Sáb às 09:00',exact=True).click()
  assert '2026-10-24' in page.get_by_role('status').inner_text()
  page.get_by_role('button',name='Semana',exact=True).click()
  assert page.locator('.day-header').count()==7
  page.get_by_role('button',name=re.compile('Sáb')).first.click()
  assert page.get_by_role('button',name='Dia',exact=True).get_attribute('aria-pressed')=='true'
  page.get_by_role('button',name=re.compile('00:00.*Manutenção noturna')).click()
  page.get_by_role('dialog',name='Manutenção noturna').wait_for()
  page.get_by_role('button',name='Fechar',exact=True).click()
  page.get_by_role('button',name='Filtrar',exact=True).click()
  page.get_by_label('Tipo de evento').select_option('meeting')
  assert page.locator('.calendar-event').count()==0
  assert page.get_by_text('Nenhum evento neste período',exact=True).is_visible()
  assert not errors,errors
  assert not writes,writes
  print(json.dumps({'viewport':width,'monthNavigation':True,'weekends':True,'midnightSplit':True,'filter':True,'overflow':False,'pageErrors':errors,'writes':writes}))
  ctx.close()
 b.close()
