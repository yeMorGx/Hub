"""Mini timer UI with simulated Tauri IPC; native window resizing is checked on Windows CI."""
import ast,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
source=ast.parse(Path('scripts/desktop-runtime-browser.py').read_text())
MOCK=next(ast.literal_eval(node.value) for node in source.body if isinstance(node,ast.Assign) and any(isinstance(target,ast.Name) and target.id=='MOCK' for target in node.targets))
MOCK+='''
window.timer.description='Revisão da interface';window.timer.project='ZULU';window.timer.compact=false;
const previousInvoke=window.__TAURI_INTERNALS__.invoke;
window.__TAURI_INTERNALS__.invoke=async(cmd,args={})=>{
 if(cmd==='desktop_mini'&&['compact','expand'].includes(args.action)){window.timer.compact=args.action==='compact';return {...window.timer};}
 return previousInvoke(cmd,args);
};
'''
base=os.environ.get('HUB_APP_URL','http://127.0.0.1:3001')
out=Path(os.environ.get('HUB_REVIEW_DIR','/tmp/zulu-workspace-qa'));out.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':392,'height':88});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.add_init_script(MOCK)
 page.goto(base+'/desktop/timer');expect(page.get_by_role('button',name='Pausar para almoço')).to_be_enabled()
 assert 'Revisão da interface' in page.locator('.mini-clock').inner_text()
 assert page.locator('body').evaluate('e=>getComputedStyle(e).backgroundColor')=='rgba(0, 0, 0, 0)'
 assert page.locator('.mini-clock small').evaluate('e=>e.getBoundingClientRect().height>=28')
 page.wait_for_timeout(600)
 page.screenshot(path=str(out/'mini-expanded.png'))
 page.get_by_role('button',name='Diminuir mini timer').click();page.set_viewport_size({'width':244,'height':64})
 expect(page.locator('.mini-compact')).to_be_visible();assert page.get_by_role('button',name='Encerrar e salvar').count()==0
 expect(page.get_by_role('button',name='Pausar para almoço')).to_be_enabled()
 page.screenshot(path=str(out/'mini-compact.png'))
 page.get_by_role('button',name='Pausar para almoço').click();expect(page.get_by_role('button',name='Retomar trabalho')).to_be_enabled()
 page.get_by_role('button',name='Retomar trabalho').click();expect(page.get_by_role('button',name='Pausar para almoço')).to_be_enabled()
 page.get_by_role('button',name='Expandir mini timer').click();page.set_viewport_size({'width':392,'height':88})
 expect(page.get_by_role('button',name='Encerrar e salvar')).to_be_enabled();page.get_by_role('button',name='Encerrar e salvar').click()
 expect(page.get_by_role('button',name='Encerrar e salvar')).to_be_disabled()
 assert not errors,errors
 print(json.dumps({'miniExpanded':True,'miniCompact':True,'transparent':True,'pauseResumeStop':True,'errors':errors}))
 browser.close()
