// ============================================================
// service-worker.js — Auto-Update PWA v7.0
// ============================================================
const CACHE_VERSION = 'v7.0'; // ອັບເດດເວີຊັ່ນເພື່ອລ້າງ Cache ເກົ່າທີ່ຜິດພາດ
const CACHE_NAME = `checkin-cache-${CACHE_VERSION}`;

// ໃຊ້ Relative Path ທັງໝົດເພື່ອປ້ອງກັນບັນຫາໃນ GitHub Pages
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

const EXTERNAL_URLS = [
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@300;400;600;700;800&family=Cinzel:wght@700;900&display=swap'
];

// ======= INSTALL =======
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log(`[SW ${CACHE_VERSION}] Installing & Caching Assets...`);
      // Cache ໄຟລ໌ພາຍໃນ
      cache.addAll(PRECACHE_URLS);
      // Cache ໄຟລ໌ພາຍນອກ
      return Promise.allSettled(
        EXTERNAL_URLS.map(url =>
          fetch(url, { mode: 'no-cors' })
            .then(res => cache.put(url, res))
            .catch(err => console.warn('[SW] External fetch failed:', url))
        )
      );
    })
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

  // STRATEGY 1: Network-First (ສຳລັບ HTML ແລະ Manifest ເພື່ອໃຫ້ໄດ້ເວີຊັ່ນໃໝ່ສະເໝີ)
  const isDoc = url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname.endsWith('manifest.json');
  
  if (isDoc && url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // STRATEGY 2: Cache-First (ສຳລັບຮູບພາບ, ໄອຄອນ ແລະ ຊັບພະຍາກອນອື່ນໆ ເພື່ອຄວາມໄວ ແລະ ໃຊ້ແບບອອບລາຍໄດ້)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(res => {
          if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
          }
          return res;
        })
        .catch(() => cached); // ຖ້າ Offline ແລະ ບໍ່ມີ Cache ກໍປ່ອຍຜ່ານ
    })
  );
});

// ======= MESSAGE =======
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
