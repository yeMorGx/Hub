"""Spell UI Prism/Lava: crossfade, stable WebGL2 layers and real timer states."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('HUB_APP_URL','http://127.0.0.1:3011')
OUT=Path(os.environ.get('HUB_REVIEW_DIR','.impeccable/review/zulu-lava'));OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for mode in ['animated','reduced','fallback']:
  for width,height in [(1440,1100),(390,844)]:
   page=b.new_page(viewport={'width':width,'height':height},reduced_motion='reduce' if mode!='animated' else 'no-preference')
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.add_init_script('''window.draws=0;window.layerDraws={Prism:0,Lava:0};window.contexts=0;
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(kind,...args){if(kind==='webgl2'){window.contexts++;if(MODE==='fallback')return null;}return original.call(this,kind,...args)};
    if(window.WebGL2RenderingContext){const draw=WebGL2RenderingContext.prototype.drawArrays;WebGL2RenderingContext.prototype.drawArrays=function(...args){window.draws++;window.layerDraws[this.canvas.parentElement.dataset.preset]++;return draw.apply(this,args)}};
   '''.replace('MODE',repr(mode)))
   page.goto(BASE+'/demo/dashboard');page.locator('.today-lava canvas').wait_for();page.evaluate('document.fonts.ready')
   assert page.locator('[data-preset=Prism]').count()==1 and page.locator('[data-preset=Lava]').count()==1
   if mode!='fallback':page.wait_for_function('window.draws>0')
   page.wait_for_timeout(700)
   before=page.evaluate('window.draws');page.wait_for_timeout(400);after=page.evaluate('window.draws')
   assert (after>before) if mode=='animated' else (after==before),(mode,before,after)
   assert page.evaluate('window.contexts')==2
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
   if mode=='animated':page.screenshot(path=str(OUT/f'{width}.png'),full_page=True)
   if mode=='fallback':page.screenshot(path=str(OUT/f'fallback-{width}.png'),full_page=True)
   assert page.locator('.today-lava').evaluate('(e)=>getComputedStyle(e).opacity')=='1'
   start=page.evaluate('({...window.layerDraws})');page.wait_for_timeout(180)
   end=page.evaluate('({...window.layerDraws})')
   if mode=='animated':assert end['Lava']>start['Lava'] and end['Prism']==start['Prism'],(start,end)
   page.get_by_role('button',name='Pausar para almoço',exact=True).click()
   page.wait_for_timeout(100)
   opacity=float(page.locator('.today-lava').evaluate('(e)=>getComputedStyle(e).opacity'))
   assert (0<opacity<1) if mode=='animated' else opacity==0,opacity
   page.wait_for_timeout(700)
   assert page.locator('.today-lava').evaluate('(e)=>getComputedStyle(e).opacity')=='0'
   if mode=='animated':page.screenshot(path=str(OUT/f'prism-paused-{width}.png'),full_page=True)
   start=page.evaluate('({...window.layerDraws})');page.wait_for_timeout(180)
   end=page.evaluate('({...window.layerDraws})')
   if mode=='animated':assert end['Prism']>start['Prism'] and end['Lava']==start['Lava'],(start,end)
   page.get_by_role('button',name='Retomar trabalho',exact=True).click()
   page.wait_for_timeout(100)
   opacity=float(page.locator('.today-lava').evaluate('(e)=>getComputedStyle(e).opacity'))
   assert (0<opacity<1) if mode=='animated' else opacity==1,opacity
   # Reverse the fade mid-flight; no layer remounts, no delayed timer action.
   page.get_by_role('button',name='Pausar para almoço',exact=True).click()
   page.get_by_role('button',name='Retomar trabalho',exact=True).click()
   page.wait_for_timeout(750)
   assert page.locator('.today-lava').evaluate('(e)=>getComputedStyle(e).opacity')=='1'
   page.get_by_role('button',name='Encerrar e salvar',exact=True).click()
   page.wait_for_timeout(750)
   assert page.locator('.today-lava').evaluate('(e)=>getComputedStyle(e).opacity')=='0'
   assert page.evaluate('window.contexts')==2
   page.get_by_label('Cenário da demonstração').select_option('empty')
   if mode=='reduced':page.screenshot(path=str(OUT/f'empty-{width}.png'),full_page=True)
   if mode=='reduced':
    old=page.evaluate('window.draws');page.set_viewport_size({'width':width-20,'height':height});page.wait_for_timeout(250)
    assert page.evaluate('window.draws')>old
   assert not errors,errors
   print(json.dumps({'mode':mode,'width':width,'drawsBefore':before,'drawsAfter':after,'contexts':2,'crossfade':True,'inactiveLayerPaused':True,'timerControls':True,'overflow':False,'pageErrors':errors}),flush=True)
   page.close()
 b.close()
