"""Public demo only: browser download and native bridge outcomes; no real reports."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('HUB_APP_URL','http://127.0.0.1:3004').rstrip('/')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'],proxy={'server':os.environ['HTTPS_PROXY']} if base.startswith('https:') and os.environ.get('HTTPS_PROXY') else None)
 for width in [1440,390]:
  page=browser.new_page(viewport={'width':width,'height':1000},accept_downloads=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/demo/workspace')
  page.get_by_role('button',name='Gerar relatório',exact=True).click()
  pdf=page.get_by_role('button',name='Baixar PDF',exact=True);expect(pdf).to_be_enabled()
  with page.expect_download() as d:pdf.click()
  path=Path(d.value.path());assert path.read_bytes().startswith(b'%PDF-')
  expect(page.get_by_role('status')).to_contain_text('Download solicitado')
  page.evaluate("""window.exportMode='saved';window.exports=[];window.__TAURI_INTERNALS__={invoke:async(command,args)=>{
   if(command!=='save_report_export')return {supported:false};
   window.exports.push(args);
   if(window.exportMode==='old')throw 'Command save_report_export not found';
   if(window.exportMode==='failure')throw 'write failed';
   return {saved:window.exportMode==='saved'};
  }}""")
  pdf.click();expect(page.get_by_role('status')).to_have_text('Relatório salvo.')
  assert page.evaluate("exports[0].filename.endsWith('.pdf') && exports[0].bytes.length>1000 && new TextDecoder().decode(new Uint8Array(exports[0].bytes.slice(0,5)))==='%PDF-'")
  page.evaluate("window.exportMode='cancelled'")
  page.get_by_role('button',name='CSV',exact=True).click();expect(page.get_by_role('status')).to_have_text('Exportação cancelada.')
  assert page.evaluate("exports[1].filename.endsWith('.csv') && new TextDecoder().decode(new Uint8Array(exports[1].bytes)).includes('Pessoa')")
  page.evaluate("window.exportMode='failure'")
  pdf.click();expect(page.locator('.hours-report [role=alert]')).to_contain_text('Confira a pasta')
  page.evaluate("window.exportMode='old'")
  pdf.click();expect(page.locator('.hours-report [role=alert]')).to_contain_text('Atualize o aplicativo')
  assert not errors,errors
  print(json.dumps({'width':width,'browserPdf':True,'nativePdfBytes':True,'csvCancel':True,'writeFailure':True,'oldVersionMessage':True,'errors':errors}),flush=True)
  page.close()
 browser.close()
