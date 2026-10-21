"""Tauri IPC mock only. No native app, credentials or backend writes."""
from pathlib import Path
import json,os
from playwright.sync_api import sync_playwright
bundle=Path(os.environ.get('HUB_BADGE_FIXTURE','/tmp/hub-desktop-badge-fixture.js')).read_text()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for platform,agent in [('Windows','Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),('macOS','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')]:
  ctx=b.new_context(user_agent=agent);page=ctx.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('<html><body>Desktop badge fixture</body></html>');page.add_script_tag(content=bundle)
  for count in [1,12,120,0]:page.evaluate('count=>window.fixtureSetUnread(count)',count)
  calls=page.evaluate('window.fixtureBadgeCalls')
  if platform=='Windows':
   assert len([c for c in calls if c['command']=='plugin:image|new'])==3,calls
   assert len([c for c in calls if c['command']=='plugin:resources|close'])==3,calls
   overlay=[c for c in calls if c['command']=='plugin:window|set_overlay_icon']
   assert len(overlay)==4,calls
   assert not overlay[-1]['args'].get('icon'),overlay[-1]
   assert not any(c['command']=='plugin:window|set_badge_count' for c in calls)
   for image in [c for c in calls if c['command']=='plugin:image|new']:
    assert image['args']['width']==32 and image['args']['height']==32
  else:
   assert len([c for c in calls if c['command']=='plugin:window|set_badge_count'])==4,calls
   assert not any(c['command']=='plugin:image|new' for c in calls)
  assert not errors,errors
  print(json.dumps({'platform':platform,'updates':4,'overlayResourcesClosed':platform=='Windows','pageErrors':errors,'native':False}))
  ctx.close()
 b.close()
