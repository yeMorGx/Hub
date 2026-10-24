import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const bundle=fs.readFileSync('/tmp/zulu-call-qa/fixture.js','utf8');
const css=fs.readdirSync('.next/static/chunks').filter(name=>name.endsWith('.css')).map(name=>fs.readFileSync(`.next/static/chunks/${name}`,'utf8')).join('\n');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try {
 for(const failNative of [false,true]) {
  // Deliberately not a Windows user-agent: runtime, not UA, must determine capture.
  const page=await browser.newPage({viewport:{width:1280,height:900},userAgent:'ZULU Desktop QA'}),errors=[];
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
     return [{sourceId:'monitor:1',title:'Monitor principal',detail:'2560 × 1440',kind:'monitor',width:2560,height:1440,primary:true}];
    }
    if(command==='preview_native_screen_source')return '';
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
  console.log(JSON.stringify({desktopRuntime:true,windowsUserAgent:false,nativeFailure:failNative,browserCaptureCalls:0,nativeRouting:true,realWindowsCapture:false}));
  await page.close();
 }
}finally{await browser.close();}
