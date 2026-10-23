"""Public fixtures only; SQL tests verify actual authorization. No accounts or business writes."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('HUB_APP_URL','http://127.0.0.1:3003').rstrip('/')
out=Path(os.environ.get('HUB_REVIEW_DIR','/tmp/zulu-admin-qa'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'],proxy={'server':os.environ['HTTPS_PROXY']} if base.startswith('https:') and os.environ.get('HTTPS_PROXY') else None)
 for width,height in [(1440,1000),(390,844)]:
  context=browser.new_context(viewport={'width':width,'height':height},locale='pt-BR',reduced_motion='reduce')
  page=context.new_page();errors=[];writes=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:writes.append(r.url) if r.method not in ['GET','HEAD','OPTIONS'] else None)
  page.goto(base+'/demo/workspace?page=organization')
  page.get_by_role('heading',name='Forma',exact=True).wait_for()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(out/f'people-{width}.png'),full_page=True)
  page.get_by_label('Cargo exibido',exact=True).fill('Direção de produto e operações')
  page.get_by_role('button',name='Revisar alterações',exact=True).click()
  expect(page.get_by_role('dialog',name='Revisar alteração')).to_be_visible()
  page.get_by_role('button',name='Confirmar e executar',exact=True).click()
  expect(page.get_by_role('dialog')).to_have_count(0)
  page.get_by_role('tab',name='Convites',exact=True).click()
  page.screenshot(path=str(out/f'invites-{width}.png'),full_page=True)
  page.get_by_role('tab',name='Aprovações',exact=False).click()
  page.screenshot(path=str(out/f'approvals-{width}.png'),full_page=True)
  page.get_by_role('button',name='Revisar e aprovar',exact=True).click();expect(page.get_by_role('dialog',name='Aprovar alteração')).to_be_visible()
  page.get_by_role('dialog').get_by_role('button',name='Confirmar',exact=True).click()
  expect(page.locator('.org-status.status-executed')).to_be_visible()
  page.get_by_role('tab',name='Funcionalidades',exact=True).click()
  page.screenshot(path=str(out/f'features-{width}.png'),full_page=True)
  page.get_by_role('tab',name='Políticas',exact=True).click()
  page.screenshot(path=str(out/f'policies-{width}.png'),full_page=True)
  page.goto(base+'/demo/workspace?page=library')
  page.get_by_role('button',name='Conhecimento do Estúdio Biblioteca',exact=True).click()
  page.screenshot(path=str(out/f'library-{width}.png'),full_page=True)
  page.get_by_role('button',name='Guia de trabalho do time',exact=False).first.click()
  page.get_by_role('heading',name='Nosso jeito de trabalhar',exact=True).wait_for()
  page.screenshot(path=str(out/f'document-{width}.png'),full_page=True)
  page.get_by_role('button',name='Compartilhar',exact=True).click()
  expect(page.get_by_role('dialog',name='Compartilhar acesso')).to_be_visible()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(out/f'share-{width}.png'))
  page.keyboard.press('Escape')
  assert not errors,errors
  assert not writes,writes
  print(json.dumps({'width':width,'people':True,'reviewAndConfirm':True,'invites':True,'approval':True,'features':True,'policies':True,'library':True,'share':True,'errors':errors,'writes':writes}),flush=True)
  context.close()
 browser.close()
