"""Lobby-only checks with a fake room. No real media, accounts or provider calls.
Compile scripts/fixtures/calls-lobby.tsx with esbuild, alias next/dynamic to
scripts/fixtures/calls-room.tsx, and set HUB_CALLS_FIXTURE to the bundle path.
"""
from pathlib import Path
import json,os
from playwright.sync_api import sync_playwright
bundle=Path(os.environ.get('HUB_CALLS_FIXTURE','/tmp/hub-calls-lobby-fixture.js')).read_text()
css='\n'.join(p.read_text() for p in Path('.next/static/chunks').glob('*.css'))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width,height in [(1440,900),(390,844)]:
  ctx=b.new_context(viewport={'width':width,'height':height})
  page=ctx.new_page();errors=[]; status={'code':503,'enabled':False}; token={'code':403}; sent=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('http://fixture.invalid/',lambda r:r.fulfill(body='<html><head><style>'+css+'</style></head><body><main style="padding:24px;max-width:1100px;margin:auto"><div id="root"></div></main></body></html>',content_type='text/html'))
  page.route('**/api/integrations/status',lambda r:r.fulfill(status=status['code'],json={'livekit':status['enabled']}))
  def token_request(r):
   sent.append(r.request.post_data_json)
   r.fulfill(status=token['code'],json={'error':'Você precisa participar deste canal.'} if token['code']!=200 else {'token':'fixture','url':'wss://fixture.invalid','room':'fixture'})
  page.route('**/api/livekit/token',token_request)
  page.route('**/api/livekit/access',lambda r:r.fulfill(status=403,json={'error':'Fixture access revoked'}))
  page.clock.install()
  page.goto('http://fixture.invalid/');page.add_script_tag(content=bundle)
  page.get_by_text('Não foi possível conferir o serviço de chamadas. Tente novamente.',exact=True).wait_for()
  assert not page.get_by_text('As chamadas aguardam a configuração do LiveKit pelo administrador.',exact=True).count()
  status.update(code=401);page.get_by_role('button',name='Tentar novamente').click()
  page.get_by_text('Sua sessão expirou. Entre novamente para acessar as chamadas.',exact=True).wait_for()
  status.update(code=200,enabled=False);page.get_by_role('button',name='Tentar novamente').click()
  page.get_by_text('As chamadas aguardam a configuração do LiveKit pelo administrador.',exact=True).wait_for()
  assert page.get_by_role('button',name='Entrar na sala').is_disabled()
  # Reload for another status fetch; this fixture only has one joined channel.
  status.update(enabled=True);page.goto('http://fixture.invalid/');page.add_script_tag(content=bundle)
  page.get_by_role('combobox').select_option('joined')
  assert page.locator('option').count()==2
  page.get_by_role('button',name='Entrar na sala').click()
  page.get_by_text('Você precisa participar deste canal.',exact=True).wait_for()
  assert sent==[{'channelId':'joined'}]
  page.screenshot(path=f'/tmp/hub-calls-lobby-{width}.png',full_page=True)
  token.update(code=200);page.get_by_role('button',name='Entrar na sala').click()
  page.get_by_role('region',name='Sala fictícia').wait_for()
  page.clock.fast_forward(21000)
  page.get_by_text('Seu acesso ao canal mudou. A chamada foi encerrada.',exact=True).wait_for()
  assert not page.get_by_role('region',name='Sala fictícia').count()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  print(json.dumps({'width':width,'statusRetry':True,'sessionError':True,'configurationState':True,'membershipFilter':True,'joinError':True,'revokedAccessClosesFixture':True,'pageErrors':errors,'realMedia':False}))
  ctx.close()
 b.close()
