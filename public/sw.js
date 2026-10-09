const CACHE_NAME = 'hbgpt-v6'; // bumped: v6 forces every returning browser to drop its stale cache and
// re-fetch fresh code — today's paywall/logo/KV fixes were otherwise invisible to anyone
// whose service worker had already cached an older build.
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/favicon-16x16.png',
  '/icons/favicon-32x32.png',
  '/icons/apple-touch-icon.png',
  '/icons/android-chrome-192x192.png',
  '/icons/android-chrome-512x512.png',
  '/bible/kjv.json',
  '/assets/index.css' // Assuming css location, but standard build usually handles this. Keeping safe list.
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Evict old cache versions (e.g. hbgpt-v1) so stale pages/icons don't linger for return visitors
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('push', event => {
  // Payload is JSON built by api/push-send-daily.ts: { title, body, icon, badge, url }
  let data = { title: 'Holy Bible GPT', body: 'A new verse is waiting for you.', icon: '/icons/android-chrome-192x192.png', badge: '/icons/android-chrome-192x192.png', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // ignore malformed payloads, fall back to defaults
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // The page shell ('/' and '/index.html') references content-hashed JS/CSS
  // filenames that change on every deploy. Serving it stale-first (as the
  // old strategy below did for everything) meant a returning visitor could
  // keep running yesterday's app indefinitely — every deploy silently
  // invisible to them until a cache-version bump forced a reset. Network-
  // first here means a new deploy shows up on the very next load, with the
  // cached copy only as an offline fallback.
  const isAppShell = event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html';
  if (isAppShell) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.open(CACHE_NAME).then(cache => cache.match(event.request)))
    );
    return;
  }

  // Everything else (content-hashed JS/CSS, icons, Bible data) is safe to
  // serve stale-while-revalidate: hashed assets never change under the same
  // URL, and this keeps the app fast and offline-capable for those.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      const networkFetch = fetch(event.request).then(response => {
        if (response.status === 200 && event.request.method === 'GET' && !url.pathname.startsWith('/api/')) {
          cache.put(event.request, response.clone());
        }
        return response;
      });
      return cachedResponse || networkFetch;
    })
  );
});
