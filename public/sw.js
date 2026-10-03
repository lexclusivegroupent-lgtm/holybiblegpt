const CACHE_NAME = 'hbgpt-v5'; // bumped: v5 adds push notification support (push + notificationclick handlers)
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
  // Stale-While-Revalidate Strategy
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      const networkFetch = fetch(event.request).then(response => {
        // Cache valid responses only (and not AI calls which might be POST or dynamic)
        if (response.status === 200 && event.request.method === 'GET' && !event.request.url.includes('/api/')) {
          cache.put(event.request, response.clone());
        }
        return response;
      });
      return cachedResponse || networkFetch;
    })
  );
});
