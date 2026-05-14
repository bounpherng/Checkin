// ============================================================
// service-worker.js — Auto-Update PWA v6.1
// ============================================================
const CACHE_VERSION = 'v6.1';
const CACHE_NAME = `checkin-cache-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/Checkin/',
  '/Checkin/index.html',
  '/Checkin/manifest.json',
];

// icon cache ແຍກຕ່າງຫາກ ໂດຍໃຊ້ relative URL
const ICON_URLS = [
  '/Checkin/icon-192.png',
  '/Checkin/icon-512.png',
];

const EXTERNAL_URLS = [
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@300;400;600;700;800&family=Cinzel:wght@700;900&display=swap',
  'https://cdn.lordicon.com/lordicon.js',
];

// ======= INSTALL =======
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log(`[SW ${CACHE_VERSION}] Installing...`);

      // Cache ໄຟລ໌ຫຼັກ
      const core = cache.addAll(PRECACHE_URLS);

      // Cache icons ດ້ວຍ no-store ເພື່ອໃຫ້ໄດ້ຮູບໃໝ່ສະເໝີ
      const icons = Promise.allSettled(
        ICON_URLS.map(url =>
          fetch(url, { cache: 'no-store', mode: 'cors' })
            .then(res => {
              if (res.ok) {
                console.log(`[SW] Cached icon: ${url}`);
                cache.put(url, res.clone());
                // cache ທັງ path version ດ້ວຍ
                const path = new URL(url, self.location.origin).pathname;
                cache.put(path, res.clone());
              }
            })
            .catch(e => console.warn(`[SW] Icon fetch failed: ${url}`, e))
        )
      );

      // Cache external fonts
      const external = Promise.allSettled(
        EXTERNAL_URLS.map(url =>
          fetch(url, { cache: 'no-store' })
            .then(res => { if (res.ok) cache.put(url, res); })
            .catch(() => {})
        )
      );

      return Promise.all([core, icons, external]);
    }).catch(err => console.error('[SW] Install failed:', err))
  );
});

// ======= ACTIVATE =======
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      ))
      .then(() => {
        console.log(`[SW ${CACHE_VERSION}] Active`);
        return self.clients.claim();
      })
  );
});

// ======= FETCH =======
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // ============================================================
  // STRATEGY 1: Network-First — HTML ແລະ manifest (ສຳຄັນ!)
  // ============================================================
  const isDoc =
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('manifest.json');

  if (isDoc && url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(res => {
          if (res.ok) {
            caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // ============================================================
  // STRATEGY 2: Icon — Network-First ສະເໝີ (ເພື່ອ icon ໃໝ່ທັນທີ)
  // ============================================================
  const isIcon =
    url.pathname.includes('icon-192') ||
    url.pathname.includes('icon-512');

  if (isIcon) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache', mode: 'cors' })
        .then(res => {
          if (res.ok) {
            caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // ============================================================
  // STRATEGY 3: Cache-First — Fonts, JS, CSS, Images ອື່ນໆ
  // ============================================================
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(res => {
          if (res && res.status === 200 &&
              (res.type === 'basic' || res.type === 'cors')) {
            caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});

// ======= MESSAGE =======
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_VERSION });
  }
});
