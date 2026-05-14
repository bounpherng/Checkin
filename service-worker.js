// ============================================================
// ⚠️ ສຳຄັນ: ທຸກເທື່ອທີ່ອັບເດດ icon, HTML, ຫຼື assets ໃດໆ
//    ໃຫ້ປ່ຽນເລກ version ນີ້ (ເຊັ່ນ v3.1 → v3.2)
//    ເພື່ອບັງຄັບໃຫ້ cache ຖືກລ້າງ ແລະ ໂຫຼດຂໍ້ມູນໃໝ່
// ============================================================
const CACHE_NAME = 'online-system-cache-v3.0';

// ໄຟລ໌ຫຼັກ (ຕ້ອງ cache ສຳເລັດ ຫຼືຍົກເລີກທັງໝົດ)
const CORE_URLS = [
  '/Checkin/',
  '/Checkin/index.html',
  '/Checkin/manifest.json',
  '/Checkin/icon-192.png',
  '/Checkin/icon-512.png',
];

// ໄຟລ໌ພາຍນອກ (cache ລົ້ມເຫຼວໄດ້ ແອັບຍັງໃຊ້ງານໄດ້ປົກກະຕິ)
const OPTIONAL_URLS = [
  'https://i.ibb.co/8gPz5vZP/qr-code.png',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;700;800&display=swap',
  'https://fonts.gstatic.com/s/notosanslao/v19/0QIzFNIyG-MWF5ytL-IZ-sK6f8M.woff2',
  'https://cdn-icons-mp4.flaticon.com/512/15594/15594572.mp4',
  'https://cdn-icons-mp4.flaticon.com/512/15594/15594543.mp4',
  'https://cdn.lordicon.com/onmwuuox.json',
  'https://cdn.lordicon.com/lordicon.js',
];

// ============================
// INSTALL
// ============================
self.addEventListener('install', event => {
  console.log('[SW] Installing:', CACHE_NAME);

  // ✅ skipWaiting: SW ໃໝ່ activate ທັນທີ ໂດຍບໍ່ຕ້ອງລໍ tab ເກົ່າປິດ
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // 1) Cache ໄຟລ໌ຫຼັກໃຫ້ສຳເລັດກ່ອນ (ຖ້າລົ້ມເຫຼວ install ຈະຢຸດ)
      await cache.addAll(CORE_URLS);
      console.log('[SW] Core files cached successfully');

      // 2) Cache ໄຟລ໌ພາຍນອກ (ລົ້ມເຫຼວ 1 URL ໄດ້ ໂດຍບໍ່ກະທົບ install)
      const results = await Promise.allSettled(
        OPTIONAL_URLS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Optional cache failed:', url, err))
        )
      );
      console.log('[SW] Optional files cached:', results.filter(r => r.status === 'fulfilled').length, '/', OPTIONAL_URLS.length);
    })
  );
});

// ============================
// ACTIVATE
// ============================
self.addEventListener('activate', event => {
  console.log('[SW] Activating:', CACHE_NAME);

  // ✅ clients.claim: SW ໃໝ່ຄວບຄຸມທຸກ tab ທັນທີ ໂດຍບໍ່ຕ້ອງ reload
  self.clients.claim();

  // ລຶບ cache ເກົ່າທີ່ version ບໍ່ກົງ
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    )
  );
});

// ============================
// FETCH
// ============================
self.addEventListener('fetch', event => {
  // ຂ້າມ request ທີ່ບໍ່ໃຊ້ http/https (ເຊັ່ນ chrome-extension)
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // ✅ Network-First: ສຳລັບ HTML ແລະ manifest
  //    → ດຶງຈາກ network ກ່ອນສະເໝີ, ຖ້າ offline ຈຶ່ງໃຊ້ cache
  //    → ໝາຍຄວາມວ່າ icon ແລະ UI ໃໝ່ຈະປາກົດທັນທີ
  const isNavigate = event.request.mode === 'navigate';
  const isHtmlOrManifest =
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('manifest.json') ||
    url.pathname === '/Checkin/';

  if (isNavigate || isHtmlOrManifest) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // ✅ Cache-First: ສຳລັບ assets (icon, font, video, json)
  //    → ໃຊ້ cache ກ່ອນ ສຳລັບໂຫຼດໄວ, ແລ້ວ update cache ໃນ background
  event.respondWith(staleWhileRevalidate(event.request));
});

// ============================================================
// Helper: Network-First
// ຟາກ network ກ່ອນ, ຖ້າລົ້ມເຫຼວ (offline) ໃຊ້ cache
// ============================================================
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    // ເກັບ response ໃໝ່ໄວ້ໃນ cache (ທົດແທນຂອງເກົ່າ)
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Offline: ສົ່ງ cache ກັບ
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Offline – serving from cache:', request.url);
      return cachedResponse;
    }
    // ບໍ່ມີທັງ network ແລະ cache
    return new Response('<h2>ບໍ່ສາມາດໂຫຼດໄດ້ (Offline)</h2>', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

// ============================================================
// Helper: Stale-While-Revalidate
// ສົ່ງ cache ກ່ອນໃຫ້ໄວ, ແລ້ວ update cache ຈາກ network ໃນ background
// ============================================================
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);

  // Update cache ໃນ background (ບໍ່ block UI)
  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (
        networkResponse &&
        (networkResponse.status === 200) &&
        (networkResponse.type === 'basic' || networkResponse.type === 'cors')
      ) {
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, networkResponse.clone());
        });
      }
      return networkResponse;
    })
    .catch(err => {
      console.warn('[SW] Network fetch failed:', request.url, err);
    });

  // ສົ່ງ cache ທັນທີ (ຖ້າມີ), ຖ້າບໍ່ມີ ລໍ network
  return cachedResponse || fetchPromise;
}
