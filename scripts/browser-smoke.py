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
        expect(self.page.get_by_role('heading', name='Seu time espera por você.')).to_be_visible()
        expect(self.page.locator('body')).to_contain_text('Você está sem conexão.')
        paths = self.page.evaluate('''async () => {
          const requests = (await Promise.all((await caches.keys()).map(async key =>
            (await (await caches.open(key)).keys()).map(request => new URL(request.url).pathname)
          ))).flat();
          return requests;
        }''')
        self.assertIn('/offline.html', paths)
        for path in paths:
            self.assertTrue(path in ['/offline.html', '/pwa/icon/192', '/pwa/icon/512'] or path.startswith('/_next/static/'), path)
        self.context.set_offline(False)
        self.page.goto(BASE + '/login')
        expect(self.page.get_by_role('heading', name='Bom ter você por aqui.')).to_be_visible()

if __name__ == '__main__':
    unittest.main(verbosity=2)
