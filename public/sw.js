/* ZULU PWA shell only. Authenticated documents, RSC and team data are never cached. */
const CACHE = 'hub-public-shell-v3';
const PUBLIC_ASSETS = ['/offline.html', '/offline.css', '/offline-reader.js', '/offline-vault.js', '/pwa/icon/192?v=zulu-1', '/pwa/icon/512?v=zulu-1', '/brand/zulu-mark.svg', '/brand/zulu-wordmark.svg'];
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
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html').then(response => response || new Response('Sem conexão. Conecte-se para abrir o ZULU.', {status:503, headers:{'Content-Type':'text/plain;charset=utf-8'}}))));
    return;
  }
  if (url.pathname.startsWith('/_next/static/') || PUBLIC_ASSETS.includes(url.pathname) || PUBLIC_ASSETS.includes(url.pathname + url.search)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
      }
      return response;
    })));
  }
});

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { /* Generic fallback. */ }
  let destination = new URL('/?inbox=1', self.location.origin);
  try { const target = new URL(payload.url || '/?inbox=1', self.location.origin); if (target.origin === self.location.origin) destination = target; } catch { /* Keep own origin. */ }
  event.waitUntil(self.registration.showNotification('ZULU', {
    body: typeof payload.body === 'string' ? payload.body : 'Há uma atualização para você.',
    icon: '/pwa/icon/192', badge: '/pwa/icon/192',
    tag: typeof payload.id === 'string' ? payload.id : 'hub-update',
    data: { url: destination.href },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/?inbox=1', self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows => {
    const existing=windows.find(client=>new URL(client.url).origin===self.location.origin);
    if(existing){await existing.navigate(target.href);return existing.focus();}
    return clients.openWindow(target.href);
  }));
});
