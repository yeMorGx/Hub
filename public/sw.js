/* Hub PWA shell only. Authenticated documents, RSC and team data are never cached. */
const CACHE = 'hub-public-shell-v1';
const PUBLIC_ASSETS = ['/offline.html', '/pwa/icon/192', '/pwa/icon/512'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLIC_ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('hub-public-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html').then(response => response || new Response('Sem conexão. Conecte-se para abrir o Hub.', {status:503, headers:{'Content-Type':'text/plain;charset=utf-8'}}))));
    return;
  }
  if (url.pathname.startsWith('/_next/static/') || PUBLIC_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
      }
      return response;
    })));
  }
});
