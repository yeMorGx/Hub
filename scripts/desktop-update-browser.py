"""Browser fixtures for update notice. Tauri IPC and release API are mocked."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ.get('HUB_APP_URL','http://127.0.0.1:3000')
Path('/tmp/hub-update-review').mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [1360,390]:
  ctx=browser.new_context(viewport={'width':width,'height':900},user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
  ctx.add_init_script('''window.updateCalls=[];window.__TAURI_INTERNALS__={invoke:async(cmd,args)=>{window.updateCalls.push({cmd,args});if(cmd==='plugin:app|version')return '0.1.2';if(cmd==='open_desktop_update'){if(!window.updateRetried){window.updateRetried=true;throw Error('fixture');}return;}throw Error('Unexpected command');}}''')
  page=ctx.new_page()
  page.route('**/api/desktop/update',lambda r:r.fulfill(json={'release':{'version':'0.1.3'}}))
  page.goto(base+'/login')
  notice=page.get_by_role('complementary',name='Atualização do Hub')
  notice.wait_for()
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
  page.screenshot(path=f'/tmp/hub-update-review/{width}.png',full_page=True)
  page.get_by_role('button',name='Baixar atualização').click()
  page.get_by_role('alert').filter(has_text='Não foi possível abrir o download').wait_for()
  page.get_by_role('button',name='Baixar atualização').click()
  assert page.evaluate("window.updateCalls.filter(c=>c.cmd==='open_desktop_update').length") == 2
  page.get_by_role('button',name='Depois',exact=True).click()
  assert notice.count()==0
  page.reload();page.wait_for_timeout(800)
  assert notice.count()==0
  ctx.close()
 # Native updater: signed release bridge, progress, disabled dismissal, retry.
 for width in [1360,390]:
  ctx=browser.new_context(viewport={'width':width,'height':900},user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
  ctx.add_init_script('''
    window.updateCalls=[];window.callbacks={};window.callbackId=0;window.attempts=0;
    window.__TAURI_EVENT_PLUGIN_INTERNALS__={unregisterListener:()=>{}};
    window.__TAURI_INTERNALS__={
      transformCallback:fn=>{const id=++window.callbackId;window.callbacks[id]=fn;return id;},
      invoke:async(cmd,args)=>{
        window.updateCalls.push({cmd,args});
        if(cmd==='desktop_updater_supported')return true;
        if(cmd==='check_desktop_update')return {version:'0.1.4'};
        if(cmd==='plugin:event|listen'){window.progressHandler=args.handler;return 1;}
        if(cmd==='plugin:event|unlisten')return;
        if(cmd==='install_desktop_update'){
          window.attempts++;
          if(window.attempts===1)throw Error('fixture invalid signature');
          window.callbacks[window.progressHandler]({event:'hub:desktop-update',id:1,payload:{phase:'downloading',downloaded:30,total:100}});
          return new Promise(()=>{});
        }
        throw Error('Unexpected command '+cmd);
      }
    };
  ''')
  page=ctx.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(base+'/login')
  notice=page.get_by_role('complementary',name='Atualização do Hub');notice.wait_for()
  page.get_by_role('button',name='Instalar e reiniciar',exact=True).click()
  page.get_by_role('alert').filter(has_text='Não foi possível concluir').wait_for()
  page.get_by_role('button',name='Instalar e reiniciar',exact=True).click()
  page.get_by_text('Baixando atualização: 30%',exact=True).wait_for()
  assert page.get_by_role('button',name='Depois',exact=True).is_disabled()
  assert page.get_by_role('button',name='Atualizando…',exact=True).is_disabled()
  page.screenshot(path=f'/tmp/hub-update-review/automatic-download-{width}.png',full_page=True)
  page.evaluate("window.callbacks[window.progressHandler]({event:'hub:desktop-update',id:1,payload:{phase:'installing',downloaded:100,total:100}})")
  page.get_by_text('Instalando… O Hub será reiniciado.',exact=True).wait_for()
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
  assert page.evaluate("window.updateCalls.filter(c=>c.cmd==='open_desktop_update').length") == 0
  assert not errors, errors
  page.screenshot(path=f'/tmp/hub-update-review/automatic-install-{width}.png',full_page=True)
  ctx.close()
 # Current version, ordinary browser and unavailable endpoint stay quiet.
 for current,result in [('0.1.3',200),('0.1.2',503),('web',200),('legacy',200)]:
  ctx=browser.new_context(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
  if current!='web':ctx.add_init_script("window.__TAURI_INTERNALS__={invoke:async()=>"+("{throw Error('legacy')}" if current=='legacy' else json.dumps(current))+"}")
  page=ctx.new_page();page.route('**/api/desktop/update',lambda r:r.fulfill(status=result,json={'release':{'version':'0.1.3'}}))
  page.goto(base+'/login');page.wait_for_timeout(800)
  assert page.get_by_role('complementary',name='Atualização do Hub').count()==0
  ctx.close()
 browser.close()
print('PASS: 1360/390px, automatic update/progress/install/retry, legacy download/dismissal, current version, web and offline; IPC/API mocked, no real installation.')
