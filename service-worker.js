// ============================================================
// service-worker.js — ອັບເດດອັດຕະໂນມັດ (Auto-Update PWA)
// ປ່ຽນ CACHE_VERSION ທຸກຄັ້ງທີ່ຕ້ອງການໃຫ້ app ໂຫຼດໃໝ່ທັນທີ
// ============================================================
const CACHE_VERSION = 'v5.0'; // ◄ ປ່ຽນຕົວເລກນີ້ທຸກຄັ້ງທີ່ update
const CACHE_NAME = `online-system-cache-${CACHE_VERSION}`;

// ໄຟລ໌ທີ່ຕ້ອງ cache (network-first ສຳລັບ HTML, cache-first ສຳລັບ assets)
const PRECACHE_URLS = [
  '/Checkin/',
  '/Checkin/index.html',
  '/Checkin/manifest.json',
  // ✅ ໃຊ້ absolute path — GitHub Pages serve icon ໂດຍກົງ
  '/Checkin/icon-192.png',
  '/Checkin/icon-512.png',
];

// URL ພາຍນອກ (ຈະ cache ຫຼັງດາວໂຫຼດ)
const EXTERNAL_URLS = [
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@300;400;600;700;800&family=Cinzel:wght@700;900&display=swap',
  'https://cdn.lordicon.com/lordicon.js',
  'https://cdn.lordicon.com/onmwuuox.json',
];

// ======= INSTALL =======
self.addEventListener('install', event => {
  // skipWaiting: ບໍ່ລໍຖ້າ — activate ທັນທີ
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log(`[SW ${CACHE_VERSION}] Installing cache...`);

      // Cache ໄຟລ໌ຫຼັກ (ຕ້ອງສຳເລັດ)
      const precachePromise = cache.addAll(PRECACHE_URLS);

      // Cache ໄຟລ໌ພາຍນອກ (ລອງດີທີ່ສຸດ, ຜິດພາດໄດ້)
      const externalPromise = Promise.allSettled(
        EXTERNAL_URLS.map(url =>
          fetch(url, { cache: 'no-store' })
            .then(res => { if (res.ok) cache.put(url, res); })
            .catch(() => {})
        )
      );

      return Promise.all([precachePromise, externalPromise]);
    }).catch(err => console.error('[SW] Install failed:', err))
  );
});

// ======= ACTIVATE — ລຶບ cache ເກົ່າທັງໝົດ =======
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => {
      console.log(`[SW ${CACHE_VERSION}] Active & controlling all tabs`);
      // ຄວບຄຸມທຸກ tab ທັນທີ ໂດຍບໍ່ຕ້ອງ refresh
      return self.clients.claim();
    })
  );
});

// ======= FETCH — ເລືອກ strategy ຕາມປະເພດໄຟລ໌ =======
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ຂ້າມ request ທີ່ບໍ່ແມ່ນ GET
  if (event.request.method !== 'GET') return;

  // ຂ້າມ Chrome extension URLs
  if (url.protocol === 'chrome-extension:') return;

  // ============================================================
  // STRATEGY 1: Network-First ສຳລັບ HTML ຫຼື index
  // ໝາຍຄວາມວ່າ: ດຶງໃໝ່ຈາກ server ທຸກຄັ້ງ, cache ເປັນ backup
  // ============================================================
  const isHTMLorManifest =
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('manifest.json');

  if (isHTMLorManifest && url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(networkRes => {
          if (networkRes.ok) {
            caches.open(CACHE_NAME).then(c => c.put(event.request, networkRes.clone()));
          }
          return networkRes;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // ============================================================
  // STRATEGY 2: Stale-While-Revalidate ສຳລັບ Icons & Images
  // ໝາຍຄວາມວ່າ: ສົ່ງ cache ກ່ອນ ແຕ່ update ໃນ background
  // ============================================================
  const isIcon =
    url.pathname.includes('icon-') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg');

  if (isIcon) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request, { cache: 'no-cache' })
            .then(networkRes => {
              if (networkRes.ok) cache.put(event.request, networkRes.clone());
              return networkRes;
            })
            .catch(() => cached);

          // ສົ່ງ cache ທັນທີ ແຕ່ update ໃນ background
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // ============================================================
  // STRATEGY 3: Cache-First ສຳລັບ Fonts, JS, CSS ທົ່ວໄປ
  // ============================================================
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(networkRes => {
        if (
          networkRes &&
          networkRes.status === 200 &&
          (networkRes.type === 'basic' || networkRes.type === 'cors')
        ) {
          caches.open(CACHE_NAME).then(c => c.put(event.request, networkRes.clone()));
        }
        return networkRes;
      }).catch(() => cached);
    })
  );
});

// ======= MESSAGE — ຮັບຄຳສັ່ງຈາກ main app =======
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});
