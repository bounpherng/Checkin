// ============================================================
// service-worker.js — Auto Update PWA v8.0
// ============================================================

const CACHE_VERSION = 'v8.0';
const CACHE_NAME = `checkin-cache-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html?v=8.0',
  './manifest.json?v=8.0',
  './icon-192.png?v=8.0',
  './icon-512.png?v=8.0'
];

// ===== INSTALL =====
self.addEventListener('install', event => {

  self.skipWaiting();

  event.waitUntil(

    caches.open(CACHE_NAME).then(async cache => {

      console.log('[SW] Installing...');

      await cache.addAll(PRECACHE_URLS);

    })

  );

});

// ===== ACTIVATE =====
self.addEventListener('activate', event => {

  event.waitUntil(

    caches.keys().then(keys => {

      return Promise.all(

        keys.map(key => {

          if (key !== CACHE_NAME) {

            console.log('[SW] Delete old cache:', key);

            return caches.delete(key);

          }

        })

      );

    }).then(() => self.clients.claim())

  );

});

// ===== FETCH =====
self.addEventListener('fetch', event => {

  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // HTML = Network First
  if (
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('manifest.json')
  ) {

    event.respondWith(

      fetch(event.request, {
        cache: 'no-store'
      })

      .then(res => {

        const clone = res.clone();

        caches.open(CACHE_NAME)
          .then(cache => cache.put(event.request, clone));

        return res;

      })

      .catch(() => caches.match(event.request))

    );

    return;

  }

  // Other Files = Cache First
  event.respondWith(

    caches.match(event.request)

      .then(cached => {

        if (cached) return cached;

        return fetch(event.request)

          .then(res => {

            if (
              res &&
              res.status === 200
            ) {

              const clone = res.clone();

              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, clone));

            }

            return res;

          });

      })

  );

});

// ===== MESSAGE =====
self.addEventListener('message', event => {

  if (event.data?.type === 'SKIP_WAITING') {

    self.skipWaiting();

  }

});
