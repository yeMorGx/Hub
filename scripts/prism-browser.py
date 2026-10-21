"""Spell UI Prism: actual WebGL2, reduced motion, fallback and timer interactions."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('HUB_APP_URL','http://127.0.0.1:3011')
OUT=Path(os.environ.get('HUB_REVIEW_DIR','.impeccable/review/zulu-prism'));OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for mode in ['animated','reduced','fallback']:
  for width,height in [(1440,1100),(390,844)]:
   page=b.new_page(viewport={'width':width,'height':height},reduced_motion='reduce' if mode!='animated' else 'no-preference')
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.add_init_script('''window.draws=0;window.contexts=0;
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(kind,...args){if(kind==='webgl2'){window.contexts++;if(MODE==='fallback')return null;}return original.call(this,kind,...args)};
    if(window.WebGL2RenderingContext){const draw=WebGL2RenderingContext.prototype.drawArrays;WebGL2RenderingContext.prototype.drawArrays=function(...args){window.draws++;return draw.apply(this,args)}};
   '''.replace('MODE',repr(mode)))
   page.goto(BASE+'/demo/dashboard');page.locator('.today-prism canvas').wait_for();page.evaluate('document.fonts.ready')
   assert page.locator('.today-prism').get_attribute('data-preset')=='Prism'
   if mode!='fallback':page.wait_for_function('window.draws>0')
   page.wait_for_timeout(700)
   before=page.evaluate('window.draws');page.wait_for_timeout(400);after=page.evaluate('window.draws')
   assert (after>before) if mode=='animated' else (after==before),(mode,before,after)
   assert page.evaluate('window.contexts')==1
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
   if mode=='animated':page.screenshot(path=str(OUT/f'{width}.png'),full_page=True)
   if mode=='fallback':page.screenshot(path=str(OUT/f'fallback-{width}.png'),full_page=True)
   page.get_by_role('button',name='Pausar para almoço',exact=True).click();page.get_by_role('button',name='Retomar trabalho',exact=True).click()
   page.get_by_label('Cenário da demonstração').select_option('empty')
   if mode=='reduced':page.screenshot(path=str(OUT/f'empty-{width}.png'),full_page=True)
   assert not errors,errors
   print(json.dumps({'mode':mode,'width':width,'drawsBefore':before,'drawsAfter':after,'contexts':1,'timerControls':True,'overflow':False,'pageErrors':errors}),flush=True)
   page.close()
 b.close()
