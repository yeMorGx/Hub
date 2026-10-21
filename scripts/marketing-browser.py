"""Public marketing UI tests. No authentication, business writes or installer execution."""
import json,os,re
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ.get('HUB_APP_URL','http://127.0.0.1:3100')
release=Path('lib/desktop/public-release.ts').read_text()
version=re.search(r'version: "([^"]+)"',release).group(1)
sha256=re.search(r'sha256: "([^"]+)"',release).group(1)
out=Path(os.environ.get('HUB_MARKETING_EVIDENCE','/tmp/hub-marketing-final'));out.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [1440,390]:
  ctx=b.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce',permissions=['clipboard-read','clipboard-write'])
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/site',wait_until='networkidle',timeout=60000)
  page.evaluate("document.querySelectorAll('img').forEach(i=>i.loading='eager')")
  page.wait_for_function("Array.from(document.querySelectorAll('img')).every(i=>i.complete&&i.naturalWidth>0)")
  page.screenshot(path=str(out/f'site-{width}.png'),full_page=True,animations='disabled')
  assert page.locator('h1').count()==1
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  assert page.get_by_role('link',name='Conheça os downloads').get_attribute('href')=='/download'
  for label in ['Conversas','Tarefas','Calendário','Visão do dia']:
   tab=page.get_by_role('tab',name=label,exact=True);tab.click();assert tab.get_attribute('aria-selected')=='true'
   image=page.get_by_role('tabpanel').locator('img');assert image.get_attribute('src')
  page.get_by_role('tab',name='Visão do dia',exact=True).focus();page.keyboard.press('ArrowDown');assert page.get_by_role('tab',name='Conversas',exact=True).get_attribute('aria-selected')=='true'
  page.get_by_role('button',name='Experimentar timer',exact=True).click();page.wait_for_timeout(1200)
  assert page.locator('.m-focus-clock').inner_text()!='00:00:00'
  page.get_by_role('button',name='Parar demonstração do timer').click()
  question=page.locator('.m-faq-list details').first;question.locator('summary').click();assert question.get_attribute('open') is not None
  if width==390:
   page.get_by_role('button',name='Abrir menu').click();page.locator('#marketing-menu').get_by_role('link',name='Ir para downloads').click()
  else:page.get_by_role('link',name='Conheça os downloads').click()
  page.wait_for_url('**/download');page.wait_for_load_state('networkidle')
  assert page.get_by_role('link',name='Baixar para Windows',exact=True).get_attribute('href')==f'https://github.com/yeMorGx/Hub/releases/download/desktop-v{version}/Hub_{version}_x64-setup.exe'
  assert page.locator('h1').count()==1
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  page.screenshot(path=str(out/f'download-{width}.png'),full_page=True,animations='disabled')
  checksum=page.locator('.m-checksum');checksum.locator('summary').click();checksum.get_by_role('button',name='Copiar SHA-256').click()
  assert page.evaluate('navigator.clipboard.readText()')==sha256
  assert not errors,errors
  print(json.dumps({'width':width,'pages':2,'tabs':4,'keyboard':True,'timer':True,'faq':True,'navigation':True,'clipboard':True,'overflow':False,'pageErrors':errors}),flush=True)
  ctx.close()
 # Narrow desktop and minimum mobile: render only, avoid new design passes.
 for width in [1280,320]:
  page=b.new_page(viewport={'width':width,'height':900})
  for route in ['site','download']:
   page.goto(base+'/'+route,wait_until='domcontentloaded');assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(width,route)
  page.close()
 b.close()
