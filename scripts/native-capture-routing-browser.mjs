import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const bundle=fs.readFileSync('/tmp/zulu-call-qa/fixture.js','utf8');
const css=fs.readdirSync('.next/static/chunks').filter(name=>name.endsWith('.css')).map(name=>fs.readFileSync(`.next/static/chunks/${name}`,'utf8')).join('\n');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try {
 for(const width of [1440,870,390]) for(const failNative of [false,true]) {
  // Deliberately not a Windows user-agent: runtime, not UA, must determine capture.
  const page=await browser.newPage({viewport:{width,height:921},userAgent:'ZULU Desktop QA'}),errors=[];
  page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fixture.invalid/',r=>r.fulfill({contentType:'text/html',body:`<html><head><style>${css}</style></head><body><div id="root"></div></body></html>`}));
  await page.route('**/api/livekit/token',r=>r.fulfill({json:{token:'fixture-native',url:'wss://fixture.invalid'}}));
  await page.goto('https://fixture.invalid/');
  await page.evaluate(fail=>{
   window.__nativeCommands=[];window.__browserCaptureCalls=0;
   window.__TAURI_INTERNALS__={transformCallback:()=>1,invoke:async(command,args)=>{
    window.__nativeCommands.push({command,args});
    if(command==='plugin:event|listen')return 1;
    if(command==='list_native_screen_sources') {
     if(fail)throw 'Captura nativa indisponível neste dispositivo.';
     return [{sourceId:'monitor:1',title:'Monitor principal',detail:'2560 × 1440',kind:'monitor',width:2560,height:1440,primary:true}, ...['Editor de projetos','Documentos do time','Conversa da equipe','Planejamento semanal','Apresentação de resultados'].map((title,i)=>({sourceId:`window:${i}`,title,detail:'Janela · 1920 × 1080',kind:'window',width:1920,height:1080,primary:false}))];
    }
    if(command==='preview_native_screen_source')return 'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#232433"/><text x="400" y="255" text-anchor="middle" fill="#d9d3ec" font-size="24" font-family="sans-serif">Prévia simulada</text></svg>');
    return null;
   }};
  },failNative);
  await page.addScriptTag({content:bundle});
  await page.getByRole('button',{name:'Compartilhar tela',exact:true}).click();
  if(failNative) {
   await page.getByRole('alert').filter({hasText:'Captura nativa indisponível'}).waitFor();
   assert.equal(await page.getByRole('dialog').count(),0);
  } else {
   await page.getByRole('dialog').waitFor();
   await page.getByText('Monitor principal',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Monitor principal',exact:false}).click();
   const controls=await page.locator('.share-quality-options .radio__control').evaluateAll(els=>els.map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})));
   assert.equal(controls.length,3);assert(controls.every(el=>el.w===16 && el.h===16),JSON.stringify(controls));
   assert(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth));
   assert.equal(await page.locator('.native-share-source').count(),6);
   await page.getByText('Mais nítida',{exact:true}).click();
   await page.getByRole('button',{name:'Compartilhar 1440p · 60 FPS',exact:true}).waitFor();
   await page.getByText('Equilibrada',{exact:true}).click();
   await page.getByRole('dialog').evaluate(el=>{el.scrollTop=0;el.querySelectorAll('*').forEach(child=>{if(child.scrollHeight>child.clientHeight && child.clientHeight>250 && !child.classList.contains('native-share-source-list'))child.scrollTop=0;});});
   const action=await page.getByRole('button',{name:'Compartilhar 1080p · 30 FPS',exact:true}).boundingBox();assert(action && action.y+action.height<=921,'share action below viewport');
   await page.waitForTimeout(200);
   await page.getByRole('dialog').screenshot({path:`/tmp/zulu-call-qa/share-picker-${width}.png`});
   await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
   const focus=page.locator('.screen-share-dialog .radio__content[data-focus-visible=true]');
   assert.equal(await focus.count(),1);
   assert.notEqual(await focus.evaluate(el=>getComputedStyle(el).outlineStyle),'none');
   await page.getByRole('dialog').screenshot({path:`/tmp/zulu-call-qa/share-picker-focus-${width}.png`});
   await page.getByRole('button',{name:'Compartilhar 1080p · 30 FPS',exact:true}).click();
   await page.getByRole('button',{name:'Parar compartilhamento',exact:true}).waitFor();
   const commands=await page.evaluate(()=>window.__nativeCommands);
   assert(commands.some(c=>c.command==='start_native_screen_share'&&c.args.sourceId==='monitor:1'&&c.args.quality==='balanced'));
   await page.getByRole('button',{name:'Parar compartilhamento',exact:true}).click();
   await page.getByRole('button',{name:'Compartilhar tela',exact:true}).waitFor();
   assert((await page.evaluate(()=>window.__nativeCommands)).some(c=>c.command==='stop_native_screen_share'));
  }
  assert.equal(await page.evaluate(()=>window.__browserCaptureCalls),0);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({width,desktopRuntime:true,windowsUserAgent:false,nativeFailure:failNative,browserCaptureCalls:0,nativeRouting:true,realWindowsCapture:false}));
  await page.close();
 }
}finally{await browser.close();}
