"""Desktop controls and mini timer with explicit IPC fixtures; no authenticated writes."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from dashboard_browser_helpers import select_scenario
BASE=os.environ.get('HUB_APP_URL','http://127.0.0.1:3025').rstrip('/')
OUT=Path(os.environ.get('HUB_REVIEW_DIR','/tmp/zulu-runtime-review'));OUT.mkdir(parents=True,exist_ok=True)
MOCK='''
 window.calls=[];window.maximized=false;window.auto=false;window.miniVisible=false;window.callbacks={};window.callbackId=0;
 window.timer={phase:'running',elapsedSeconds:3600,canControl:true,busy:false,sampledAt:Date.now(),error:null};window.lastTimer=Date.now();
 window.__TAURI_EVENT_PLUGIN_INTERNALS__={unregisterListener:()=>{}};
 window.__TAURI_INTERNALS__={transformCallback:fn=>{const id=++window.callbackId;window.callbacks[id]=fn;return id;},invoke:async(cmd,args={})=>{
  window.calls.push({cmd,args});
  if(cmd==='desktop_titlebar'){if(args.action==='toggle_maximize')window.maximized=!window.maximized;return {supported:true,maximized:window.maximized};}
  if(cmd==='desktop_runtime'){
   if(args.action==='set_autostart')window.auto=args.enabled;
   if(args.action==='show_mini')window.miniVisible=true;
   if(args.action==='hide_mini')window.miniVisible=false;
   return {supported:true,background:true,autostart:window.auto,miniVisible:window.miniVisible};
  }
  if(cmd==='desktop_mini'){
   if(window.timer.phase==='running'){window.timer.elapsedSeconds+=Math.floor((Date.now()-window.lastTimer)/1000);}window.lastTimer=Date.now();
   if(args.action==='pause')window.timer.phase='lunch';if(args.action==='resume')window.timer.phase='running';
   if(args.action==='stop'){window.timer.phase='idle';window.timer.elapsedSeconds=0;window.timer.canControl=false;}
   window.timer.sampledAt=Date.now();return {...window.timer};
  }
  if(cmd==='plugin:event|listen')return ++window.callbackId;
  if(cmd==='plugin:event|unlisten')return;
  if(cmd==='desktop_updater_supported')return false;
  if(cmd==='plugin:app|version')return '99.0.0';
  throw Error('Unexpected IPC '+cmd);
 }};
'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for width in [1440,390]:
  page=browser.new_page(viewport={'width':width,'height':1000},reduced_motion='reduce',user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36')
  page.add_init_script(MOCK);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE+'/demo/dashboard');page.locator('#desktop-titlebar-content .topbar').wait_for();page.evaluate('document.fonts.ready')
  assert page.locator('.app-content > .topbar').count()==0
  assert page.locator('.rail .avatar').count()==0
  assert page.locator('.today-person small svg').count()==0
  assert not page.get_by_text('Presença indisponível',exact=True).count()
  assert page.locator('.desktop-titlebar').bounding_box()['height']==48
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  if width==1440:assert page.locator('.rail').bounding_box()['y']==60
  page.get_by_role('button',name='Abrir mini timer',exact=True).click()
  assert page.evaluate("window.calls.some(c=>c.cmd==='desktop_runtime'&&c.args.action==='show_mini')")
  page.get_by_role('button',name='Opções do aplicativo',exact=True).click()
  check=page.get_by_role('checkbox',name='Abrir ao ligar o PC',exact=True);expect(check).to_be_enabled()
  page.locator('.desktop-runtime-popover .zulu-checkbox [data-slot=checkbox-content]').click();expect(check).to_be_checked()
  expect(check).to_be_enabled();page.locator('.desktop-runtime-popover .zulu-checkbox [data-slot=checkbox-content]').click();expect(check).not_to_be_checked()
  page.screenshot(path=str(OUT/f'options-{width}.png'));page.keyboard.press('Escape')
  select_scenario(page,'idle');page.locator('.today-timer-primary').click();picker=page.locator('.today-activity-picker');picker.wait_for()
  assert 'blur(24px)' in picker.evaluate('e=>getComputedStyle(e).backdropFilter')
  assert page.get_by_label('Atividade',exact=True).evaluate('e=>e===document.activeElement')
  page.screenshot(path=str(OUT/f'glass-{width}.png'),full_page=True)
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  assert not errors,errors
  print(json.dumps({'width':width,'titlebarPortal':True,'singleProfile':True,'noActivityPlay':True,'startupToggle':True,'miniCommand':True,'liquidGlass':True,'pageErrors':errors}),flush=True)
  page.close()
 page=browser.new_page(viewport={'width':328,'height':80},reduced_motion='reduce',user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
 page.add_init_script(MOCK);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'/desktop/timer');timer=page.get_by_role('timer');expect(timer).to_have_text('01:00:00')
 assert page.locator('.desktop-titlebar').count()==0
 assert page.evaluate('getComputedStyle(document.body).backgroundColor')=='rgba(0, 0, 0, 0)'
 assert page.locator('.mini-capsule').evaluate('e=>getComputedStyle(e).borderRadius')=='999px'
 assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
 page.screenshot(path=str(OUT/'mini-running.png'),omit_background=True)
 page.get_by_role('button',name='Pausar para almoço',exact=True).click();page.get_by_role('button',name='Retomar trabalho',exact=True).wait_for()
 paused=timer.inner_text();page.wait_for_timeout(1500);assert timer.inner_text()==paused
 page.screenshot(path=str(OUT/'mini-lunch.png'),omit_background=True)
 page.get_by_role('button',name='Retomar trabalho',exact=True).click();page.wait_for_timeout(1600);assert timer.inner_text()!=paused
 page.get_by_role('button',name='Encerrar e salvar',exact=True).click();expect(timer).to_have_text('00:00:00')
 expect(page.get_by_role('button',name='Pausar para almoço',exact=True)).to_be_disabled()
 page.get_by_role('button',name='Ocultar mini timer',exact=True).click()
 assert page.evaluate("window.calls.some(c=>c.cmd==='desktop_mini'&&c.args.action==='hide')")
 assert not page.evaluate("window.calls.some(c=>c.cmd==='desktop_titlebar'||c.cmd==='check_desktop_update')")
 assert not errors,errors
 print(json.dumps({'miniCapsule':True,'pauseResumeStop':True,'transparent':True,'noHeaderOrUpdater':True,'pageErrors':errors}),flush=True)
 browser.close()
