import fs from 'node:fs';import {createRequire} from 'node:module';const require=createRequire('/workspace/Hub/package.json'),{chromium}=require('playwright');
// Uses a caller-provided MFA session. No account provisioning or business writes.
const base=process.env.HUB_AUDIT_BASE || 'https://hub-one-azure.vercel.app';
const out=process.env.HUB_AUDIT_OUTPUT || '/tmp/zulu-production-audit';
const storageFile=process.env.HUB_AUDIT_STORAGE_STATE;
if(!storageFile || !fs.existsSync(storageFile)) throw Error('Defina HUB_AUDIT_STORAGE_STATE com uma sessão de teste já autenticada com MFA. Não envie credenciais no chat.');
fs.mkdirSync(`${out}/screens`,{recursive:true});
const groups=[['Hoje',[['overview','Hoje']]],['Trabalho',[['board','Tarefas'],['hours','Horas'],['reports','Relatórios'],['library','Biblioteca'],['notes','Notas'],['goals','Metas'],['clients','Clientes']]],['Conversas',[['chat','Mensagens'],['organization-chat','Contatos'],['calls','Chamadas'],['notifications','Notificações']]],['Agenda',[['calendar','Calendário'],['shifts','Plantões'],['absences','Ausências'],['dates','Datas do time'],['meetings','Pautas e atas']]],['Equipe',[['people','Pessoas'],['standups','Check-ins']]],['Configurações',[['settings','Preferências'],['organization','Organização'],['integrations','Integrações']]]];
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const context=await browser.newContext({storageState:storageFile,viewport:{width:1440,height:1000},timezoneId:'America/Sao_Paulo'}),page=await context.newPage();page.setDefaultTimeout(12000);
const errors=[],responses=[],rows=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)responses.push({path:new URL(r.url()).pathname,status:r.status()});});
async function inventory(){return page.locator('main').first().evaluate(main=>({heading:main.querySelector('h1')?.textContent?.trim(),text:main.innerText.slice(0,1800),buttons:[...main.querySelectorAll('button,[role="button"],a,input,select,textarea,[role="tab"]')].filter(el=>el.getBoundingClientRect().width&&el.getBoundingClientRect().height).map((el,i)=>({index:i,tag:el.tagName,role:el.getAttribute('role'),label:el.getAttribute('aria-label')||el.innerText?.trim()||el.getAttribute('placeholder')||el.getAttribute('name'),disabled:el.disabled||el.getAttribute('aria-disabled')==='true',width:Math.round(el.getBoundingClientRect().width),height:Math.round(el.getBoundingClientRect().height),foreground:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor})),overflows:[...main.querySelectorAll('*')].filter(el=>el.clientWidth>100 && el.scrollWidth>el.clientWidth+3 && !['SELECT','INPUT'].includes(el.tagName)).slice(0,12).map(el=>({tag:el.tagName,class:el.className,width:el.clientWidth,scrollWidth:el.scrollWidth}))}));}
try{
 await page.goto(base);await page.locator('.rail').waitFor();await page.waitForTimeout(1800);
 let number=5;
 for(const [group,pages] of groups){
  await page.setViewportSize({width:1440,height:1000});await page.locator('.rail').getByRole('button',{name:group,exact:true}).click();
  for(const [id,label] of pages){
   try{
    if(pages.length>1) await page.locator('.area-tabs').getByRole('tab',{name:label,exact:true}).click();
    await page.locator(`main[data-motion-page="${id}"]`).waitFor();await page.waitForTimeout(id==='organization'||id==='integrations'?1400:500);await page.mouse.move(1350,12);
    if(id==='notes') await page.getByText('Carregando colaboração…',{exact:true}).waitFor({state:'hidden'});
    const row={step:number++,id,label,group,source:'authenticated-production',desktop:await inventory()};
    await page.screenshot({path:`${out}/screens/${String(row.step).padStart(2,'0')}-prod-${id}-1440.png`,fullPage:true});
    await page.setViewportSize({width:390,height:1000});await page.waitForTimeout(200);row.mobile=await inventory();row.horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    await page.screenshot({path:`${out}/screens/${String(row.step).padStart(2,'0')}-prod-${id}-390.png`,fullPage:true});
    rows.push(row);fs.writeFileSync(`${out}/screens-index.json`,JSON.stringify({rows,errors,responses},null,2));console.log(`Captured production ${id}: ${row.desktop.buttons.length} controls; mobile overflow=${row.horizontalOverflow}`);
    await page.setViewportSize({width:1440,height:1000});
   }catch(error){rows.push({id,label,group,blocked:error.message.split('\n')[0]});console.log(`Blocked ${id}: ${error.message.split('\n')[0]}`);await page.keyboard.press('Escape');await page.setViewportSize({width:1440,height:1000});}
  }
 }
 await context.storageState({path:storageFile});fs.chmodSync(storageFile,0o600);
 for(const [route,name] of [['/site','marketing'],['/download','download'],['/privacy','privacy'],['/reset-password','reset-password'],['/invite','invite'],['/demo/dashboard','demo-home'],['/demo/workspace?page=calendar','demo-calendar'],['/demo/workspace?page=people','demo-people'],['/demo/workspace?page=chat','demo-chat']]){
  const p=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'America/Sao_Paulo'});await p.goto(base+route);await p.waitForTimeout(1000);const entry={id:name,source:name.startsWith('demo')?'demo':'public-production',route,landedPath:new URL(p.url()).pathname,title:await p.title(),text:(await p.locator('body').innerText()).slice(0,1200)};await p.screenshot({path:`${out}/screens/${String(number++).padStart(2,'0')}-${name}-1440.png`,fullPage:true});rows.push(entry);await p.close();console.log(`Captured ${name}`);
 }
 fs.writeFileSync(`${out}/screens-index.json`,JSON.stringify({rows,errors,responses},null,2));
}catch(error){console.error(error.message);process.exitCode=1;}finally{await browser.close();}
