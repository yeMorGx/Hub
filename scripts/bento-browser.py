"""HeroUI dashboard composition and form contracts, without authenticated writes."""
import json, os, re, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from dashboard_browser_helpers import select_scenario
BASE=os.environ.get('HUB_APP_URL','http://127.0.0.1:3018').rstrip('/')
OUT=Path(os.environ.get('HUB_REVIEW_DIR','.impeccable/review/zulu-bento'));OUT.mkdir(parents=True,exist_ok=True)
subprocess.run(['node','-e',"require('esbuild').buildSync({entryPoints:['scripts/fixtures/dashboard-ui-harness.tsx'],bundle:true,outfile:'/tmp/zulu-ui-harness.js',format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'\"production\"'}})"],check=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for w,h in ([] if os.environ.get('HUB_FORM_ONLY') else [(1440,1100),(1280,900),(1024,900),(390,844),(320,740)]):
  page=b.new_page(viewport={'width':w,'height':h},reduced_motion='reduce',timezone_id='America/Sao_Paulo')
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE+'/demo/dashboard');page.get_by_role('heading',name='Seu tempo, hoje',exact=True).wait_for();page.evaluate('document.fonts.ready')
  assert page.locator('.today-layout [data-slot=card]').count()>=6
  assert page.locator('.today-timer-primary').get_attribute('data-slot')=='button'
  assert page.get_by_role('progressbar',name='Jornada de hoje').get_attribute('data-slot')=='progress-bar'
  assert page.get_by_role('radiogroup',name='Visualização da agenda').count()==1
  assert page.locator('.today-office-person .avatar [data-slot=avatar-fallback]').count()==1
  assert '/dashboard/home-office.webp' in page.locator('.today-home-office').evaluate('e=>getComputedStyle(e,"::before").backgroundImage')
  assert page.evaluate('(url)=>fetch(url).then(response=>response.ok)', BASE+'/dashboard/home-office.webp')
  blocks={c:page.locator('.'+c).bounding_box() for c in ['today-focus','today-home-office','today-journey']}
  if w>1200:assert abs(blocks['today-focus']['y']-blocks['today-home-office']['y'])<2 and blocks['today-home-office']['x']>blocks['today-focus']['x']
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  page.screenshot(path=str(OUT/f'{w}.png'),full_page=True)
  if w in [1440,390]:
   trigger=page.get_by_role('button',name='Novo evento',exact=True);trigger.click()
   dialog=page.get_by_role('dialog',name='Novo evento',exact=True);dialog.wait_for()
   assert dialog.get_attribute('data-slot')=='modal-dialog'
   assert dialog.bounding_box()['width']<=min(w,540)
   for _ in range(6):
    page.keyboard.press('Tab');assert dialog.evaluate('e=>e.contains(document.activeElement)')
   page.screenshot(path=str(OUT/f'modal-{w}.png'));page.keyboard.press('Escape');dialog.wait_for(state='hidden')
   assert trigger.evaluate('e=>e===document.activeElement')
   page.get_by_role('button',name='Filtrar',exact=True).click()
   page.get_by_role('menu').wait_for();page.screenshot(path=str(OUT/f'filter-{w}.png'))
   page.get_by_role('menuitemradio',name='Home office',exact=True).click();assert page.locator('.calendar-event').count()==0
   page.get_by_role('button',name='Filtrar',exact=True).click();page.get_by_role('menuitemradio',name='Todos os eventos',exact=True).click()
   page.get_by_role('radio',name='Mês',exact=True).click();assert page.locator('.calendar-month').count()==1
   page.get_by_role('radio',name='Dia',exact=True).click();assert page.locator('.calendar-grid.day-view').count()==1
   page.get_by_role('radio',name='Semana',exact=True).click()
   page.get_by_role('button',name='Escolher data',exact=True).click();picker=page.get_by_role('dialog',name='Escolher data da agenda');picker.wait_for();page.wait_for_timeout(150)
   assert picker.get_by_role('grid').count()==1
   page.screenshot(path=str(OUT/f'date-{w}.png'));page.keyboard.press('Escape')
   select_scenario(page,'empty');assert page.get_by_role('button',name='Escolher atividade',exact=True).count()==1
   page.get_by_role('button',name='Escolher atividade',exact=True).click();page.get_by_label('Atividade',exact=True).fill('Planejar a semana');page.get_by_role('button',name='Iniciar atividade',exact=True).click();page.locator('.zulu-toast-region .toast').wait_for();assert page.locator('.zulu-toast-region .toast').count()==1
   if w==1440:page.screenshot(path=str(OUT/'toast-1440.png'))
  assert not errors,errors
  print(json.dumps({'width':w,'bento':True,'heroUI':True,'image':True,'overflow':False,'pageErrors':errors}),flush=True)
  page.close()
 # Exercise the same source components in a local, intercepted test page. No new
 # endpoint is deployed and no account, email, Supabase or production write is used.
 page=b.new_page(viewport={'width':1000,'height':800},reduced_motion='reduce',service_workers='block')
 page.goto(BASE+'/demo/dashboard');css=page.locator('link[rel=stylesheet]').evaluate_all('es=>es.map(e=>e.href)')
 page.route('**/__zulu_ui_test',lambda route:route.fulfill(content_type='text/html',body='<!doctype html><html lang="pt-BR"><head>'+''.join('<link rel="stylesheet" href="'+u+'">' for u in css)+'</head><body><div id="root"></div><script src="/__zulu_ui_test.js"></script></body></html>'))
 page.route('**/__zulu_ui_test.js',lambda route:route.fulfill(content_type='application/javascript',path='/tmp/zulu-ui-harness.js'))
 page.goto(BASE+'/__zulu_ui_test');save=page.get_by_role('button',name='Salvar',exact=True);save.wait_for()
 save.click();assert page.get_by_test_id('form-result').inner_text()==''
 page.get_by_label('Título',exact=True).fill('Trabalho')
 save.click();assert page.get_by_test_id('form-result').inner_text()==''
 page.get_by_role('button',name=re.compile('Projeto')).filter(has_not=page.locator('[disabled]')).first.click()
 page.get_by_role('option',name='Projeto 1',exact=True).click();page.locator('.zulu-checkbox [data-slot=checkbox-content]').click();assert page.get_by_role('checkbox',name='Pessoa do time').is_checked();save.click()
 data=json.loads(page.get_by_test_id('form-result').inner_text());assert data=={'title':'Trabalho','project':'p1','members':'person1'},data
 assert page.locator('label label:not([data-a11y-ignore])').count()==0
 print(json.dumps({'formContract':True,'requiredTitle':True,'requiredEmptySelect':True,'submittedValues':True,'checkbox':True,'disabledFieldOmitted':True}),flush=True)
 b.close()
