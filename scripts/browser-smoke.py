"""Anonymous smoke checks. Requires Python Playwright and installed Chromium.
No accounts, emails or business writes; any attempted Auth write is aborted.
"""
import os
import unittest
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('HUB_APP_URL', 'http://127.0.0.1:3000').rstrip('/')

class PublicBrowserChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.driver = sync_playwright().start()
        cls.browser = cls.driver.chromium.launch(
            executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),
            headless=True, args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.driver.stop()

    def setUp(self):
        self.context = self.browser.new_context()
        self.blocked_writes = []
        def prevent_auth_write(route):
            if route.request.method not in ('GET', 'HEAD', 'OPTIONS'):
                self.blocked_writes.append(route.request.method)
                route.abort()
            else:
                route.continue_()
        self.context.route('**/auth/v1/**', prevent_auth_write)
        self.page = self.context.new_page()
        self.page_errors = []
        self.page.on('pageerror', lambda error: self.page_errors.append(str(error)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.blocked_writes, [], 'Unexpected Auth write was blocked')
        self.assertEqual(self.page_errors, [])

    def test_signup_constraints_and_password_visibility(self):
        self.page.goto(BASE + '/login')
        self.page.get_by_role('button', name='Criar conta', exact=True).click()
        self.page.get_by_label('Seu nome').fill('Pessoa de teste local')
        self.page.get_by_label('E-mail', exact=True).fill('local-check@example.invalid')
        password = self.page.get_by_label('Senha', exact=True)
        password.fill('curta')
        self.assertFalse(password.evaluate('(el) => el.checkValidity()'))
        self.page.get_by_role('button', name='Criar minha conta', exact=True).click()
        expect(self.page.get_by_role('heading', name='Seu time começa aqui.')).to_be_visible()
        self.page.get_by_role('button', name='Mostrar senha', exact=True).click()
        expect(password).to_have_attribute('type', 'text')
        self.page.get_by_role('button', name='Ocultar senha', exact=True).click()
        expect(password).to_have_attribute('type', 'password')
        self.page.get_by_role('button', name='Voltar para entrar', exact=True).click()
        self.page.get_by_role('button', name='Esqueceu a senha?', exact=True).click()
        expect(self.page.get_by_role('heading', name='Vamos recuperar seu acesso.')).to_be_visible()
        expect(self.page.locator('input[name="password"]')).to_have_count(0)

    def test_invalid_callback_stays_on_browser_origin(self):
        self.page.goto(BASE + '/auth/callback?next=https%3A%2F%2Fexample.invalid%2F')
        expect(self.page.get_by_role('alert').filter(has_text='Este link expirou')).to_be_visible()
        self.assertEqual(urlsplit(self.page.url).netloc, urlsplit(BASE).netloc)
        self.assertEqual(urlsplit(self.page.url).path, '/login')

    def test_password_reset_without_session_has_no_password_form(self):
        self.page.goto(BASE + '/reset-password')
        expect(self.page.get_by_role('link', name='Voltar para entrar')).to_be_visible()
        expect(self.page.get_by_role('alert').filter(has_text='Sua sessão expirou')).to_be_visible()
        expect(self.page.locator('input[name="password"]')).to_have_count(0)

    def test_demo_declares_fiction_after_hydration(self):
        self.page.goto(BASE + '/demo')
        expect(self.page.locator('.demo-label')).to_have_text('Demonstração')
        expect(self.page.get_by_role('heading', name='Visão geral.')).to_be_visible()

    def test_pwa_offline_fallback_and_public_cache(self):
        self.page.goto(BASE + '/login')
        self.page.evaluate('navigator.serviceWorker.ready')
        self.page.wait_for_function('navigator.serviceWorker.controller !== null')
        self.context.set_offline(True)
        self.page.goto(BASE + '/')
        expect(self.page.get_by_role('heading', name='Conversas, mesmo sem conexão.')).to_be_visible()
        expect(self.page.locator('body')).to_contain_text('Sua senha offline')
        paths = self.page.evaluate('''async () => {
          const requests = (await Promise.all((await caches.keys()).map(async key =>
            (await (await caches.open(key)).keys()).map(request => new URL(request.url).pathname)
          ))).flat();
          return requests;
        }''')
        self.assertIn('/offline.html', paths)
        for path in paths:
            self.assertTrue(path in ['/offline.html', '/offline.css', '/offline-reader.js', '/offline-vault.js', '/pwa/icon/192', '/pwa/icon/512'] or path.startswith('/_next/static/'), path)
        self.context.set_offline(False)
        self.page.goto(BASE + '/login')
        expect(self.page.get_by_role('heading', name='Bom ter você por aqui.')).to_be_visible()

    def test_offline_messages_are_encrypted_and_require_local_password(self):
        self.page.goto(BASE + '/login')
        self.page.wait_for_function('navigator.serviceWorker.controller !== null')
        result = self.page.evaluate("""async () => {
          const vault = await import('/offline-vault.js');
          await vault.enableVault('fixture-user', 'fixture-only-password-123');
          await vault.saveConversation('fixture-user', {id:'fixture-channel', name:'Canal local', savedAt:Date.now(), messages:[{id:'fixture-message', author:'Pessoa fictícia', body:'CONTEUDO_PRIVADO_FIXTURE', createdAt:new Date().toISOString()}]});
          vault.lockVault();
          const record = await new Promise((resolve,reject)=>{const r=indexedDB.open('hub-offline-v1',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('vault');const q=tx.objectStore('vault').get('record');q.onsuccess=()=>resolve(q.result);tx.oncomplete=()=>db.close()};r.onerror=reject});
          let wrong=false;try{await vault.unlockVault('wrong-password-fixture')}catch{wrong=true}
          let other=false;try{await vault.unlockVault('fixture-only-password-123','different-user')}catch{other=true}
          return {raw:JSON.stringify(record),wrong,other};
        }""")
        self.assertNotIn('CONTEUDO_PRIVADO_FIXTURE', result['raw'])
        self.assertNotIn('Pessoa fictícia', result['raw'])
        self.assertTrue(result['wrong'])
        self.assertTrue(result['other'])
        self.context.set_offline(True)
        self.page.goto(BASE + '/offline.html')
        self.page.get_by_label('Sua senha offline').fill('fixture-only-password-123')
        self.page.get_by_role('button', name='Desbloquear', exact=True).click()
        expect(self.page.locator('#messages')).to_contain_text('CONTEUDO_PRIVADO_FIXTURE')
        self.page.get_by_role('button',name='Bloquear',exact=True).click()
        expect(self.page.locator('#messages')).to_be_empty()
        self.assertEqual(self.page.locator('textarea').count(),0)
        self.context.set_offline(False)

    def test_demo_reports_export_csv_and_pdf(self):
        self.page.goto(BASE + '/demo/operations')
        self.page.get_by_role('button',name='Gestão',exact=True).click()
        self.page.get_by_role('button',name='Gerar relatório',exact=True).click()
        expect(self.page.locator('body')).to_contain_text('13,25 h')
        with self.page.expect_download() as csv_info:
            self.page.get_by_role('button',name='CSV',exact=True).click()
        csv = csv_info.value
        with open(csv.path(),'r',encoding='utf-8-sig') as file:
            content=file.read()
        self.assertIn('Marina Costa',content)
        self.assertIn('Lançamento Hub',content)
        with self.page.expect_download() as pdf_info:
            self.page.get_by_role('button',name='PDF',exact=True).click()
        pdf = pdf_info.value
        with open(pdf.path(),'rb') as file:
            content=file.read()
        self.assertTrue(content.startswith(b'%PDF-'))
        self.assertGreater(len(content),3000)

if __name__ == '__main__':
    unittest.main(verbosity=2)
