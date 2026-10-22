"""Project creation and lunch timing in the isolated dashboard demo."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
from dashboard_browser_helpers import select_scenario
out=Path(os.environ.get('HUB_REVIEW_DIR','/tmp/zulu-project-lunch'));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('HUB_APP_URL','http://127.0.0.1:3022')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for width,height in [(1440,1100),(390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce',timezone_id='America/Sao_Paulo')
  errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
  page.goto(base+'/demo/dashboard');page.get_by_role('heading',name='Seu tempo, hoje',exact=True).wait_for()
  select_scenario(page,'idle');page.locator('.today-timer-primary').click()
  page.locator('.today-activity-form .select__trigger').click()
  page.get_by_role('button',name='Adicionar novo projeto',exact=True).wait_for()
  page.screenshot(path=str(out/f'project-dropdown-{width}.png'),full_page=True)
  page.get_by_role('button',name='Adicionar novo projeto',exact=True).click()
  field=page.get_by_label('Nome do novo projeto',exact=True)
  field.wait_for();assert field.evaluate('e=>e===document.activeElement')
  field.fill('Projeto Aurora');page.get_by_role('button',name='Criar projeto',exact=True).click()
  page.locator('.today-new-project').wait_for(state='hidden')
  assert 'Projeto Aurora' in page.locator('.today-activity-form .select__trigger').inner_text()
  page.get_by_label('Atividade',exact=True).fill('Revisar identidade')
  page.get_by_role('button',name='Iniciar atividade',exact=True).click()
  page.locator('.today-activity-picker').wait_for(state='hidden')
  assert 'Projeto Aurora' in page.locator('.today-activity').inner_text()
  page.get_by_role('button',name='Pausar para almoço',exact=True).click()
  lunch=page.get_by_role('timer',name='Duração do almoço',exact=True)
  lunch.wait_for();work=page.locator('.today-clock').inner_text();before=lunch.inner_text()
  page.wait_for_timeout(2200)
  assert lunch.inner_text()!=before,(before,lunch.inner_text())
  assert page.locator('.today-clock').inner_text()==work
  assert 'Desde' in page.locator('.today-lunch-timer').inner_text()
  page.screenshot(path=str(out/f'lunch-{width}.png'),full_page=True)
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  page.get_by_role('button',name='Retomar trabalho',exact=True).click()
  page.locator('.today-lunch-timer').wait_for(state='hidden')
  page.wait_for_timeout(1200);assert page.locator('.today-clock').inner_text()!=work
  assert not errors,errors
  print(json.dumps({'width':width,'projectCreateAndSelect':True,'lunchAdvancesWorkFreezes':True,'resume':True,'overflow':False,'pageErrors':errors}),flush=True)
  page.close()
 browser.close()
