const CACHE_NAME = 'online-system-cache-v1.6'; // [FIX] ອັບເດດເວີຊັ່ນ Cache

// [FIX] ປັບປຸງໃໝ່! ໃຫ້ CORE_URLS ມີສະເພາະໄຟລ໌ທີ່ຈຳເປັນແທ້ໆ (HTML/Manifest)
// ເພື່ອຫຼີກລ້ຽງ Error 206 ຈາກ 'addAll'

// 1. ໄຟລ໌ຫຼັກທີ່ຈຳເປັນສຳລັບ App Shell (ຕ້ອງ cache ໃຫ້ຜ່ານ 100%)
const CORE_URLS = [
  '/Checkin/',
  '/Checkin/index.html',
  '/Checkin/manifest.json'
];

// 2. ໄຟລ໌ເສີມທັງໝົດ (ຮູບ, Font, ວິດີໂອ) ຈະຖືກ cache ແບບແຍກກັນ
// ຖ້າໄຟລ໌ໃດໜຶ່ງ cache ບໍ່ຜ່ານ (ເຊັ່ນ 206) ກໍບໍ່ເປັນຫຍັງ, App ຍັງຕິດຕັ້ງໄດ້
const ASSET_URLS = [
  // ຮູບພາບ (ທີ່ເຄີຍເຮັດໃຫ້ v1.4 ລົ້ມ)
  'https://i.ibb.co/Nq2HzrH/cn.png',
  'https://i.ibb.co/8gPz5vZP/qr-code.png',
  
  // Fonts
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;700;800&display=swap',
  'https://fonts.gstatic.com/s/notosanslao/v19/0QIzFNIyG-MWF5ytL-IZ-sK6f8M.woff2',
  
  // ວິດີໂອ ແລະໄຟລ໌ອື່ນໆ
  'https://cdn-icons-mp4.flaticon.com/512/15594/15594572.mp4',
  'https://cdn-icons-mp4.flaticon.com/512/15594/15594543.mp4',
  'https://cdn.lordicon.com/onmwuuox.json',
  'https://cdn.lordicon.com/lordicon.js'
];


self.addEventListener('install', event => {
  console.log('[SW] Install event starting (v1.6)...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching core app shell...');
        // 1. Cache ໄຟລ໌ຫຼັກ (Core). ອັນນີ້ຕ້ອງສຳເລັດ (ມີແຕ່ 3 ໄຟລ໌, ປອດໄພ)
        return cache.addAll(CORE_URLS);
      })
      .then(() => {
        console.log('[SW] Core shell cached. Caching non-essential assets...');
        return caches.open(CACHE_NAME);
      })
      .then(cache => {
        // 2. Cache ໄຟລ໌ເສີມທັງໝົດ (Assets).
        // ເຮົາຈະ cache ທີລະອັນ ແລະເພີ່ມ .catch() ໃສ່
        // ເພື່ອວ່າຖ້າໄຟລ໌ໃດໜຶ່ງ cache ບໍ່ໄດ້ (ເຊັ່ນ ວິດີໂອ ຫຼື ຮູບ ໄດ້ 206)
        // ມັນຈະບໍ່ເຮັດໃຫ້ການຕິດຕັ້ງທັງໝົດລົ້ມເຫຼວ.
        const assetPromises = ASSET_URLS.map(url => {
          // ໃຊ້ .add() ແທນ .addAll()
          return cache.add(url).catch(err => {
            console.warn(`[SW] Failed to cache non-essential asset: ${url} - ${err.message}`);
          });
        });
        return Promise.all(assetPromises); 
      })
      .then(() => {
        console.log('[SW] Install event complete (v1.5).');
      })
      .catch(err => {
        // ຖ້າ .catch() ນີ້ເຮັດວຽກ, ໝາຍຄວາມວ່າ CORE_URLS cache ບໍ່ສຳເລັດ
        console.error('[SW] Core cache failed, install aborted:', err);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // ຖ້າພົບໃນ cache, ສົ່ງຄ່າຈາກ cache ເລີຍ
        if (response) {
          return response;
        }

        // ຖ້າບໍ່ພົບ, ໄປດຶງຈາກ network
        return fetch(event.request).then(response => {
          // ກວດສອບ response ໃຫ້ແນ່ໃຈກ່ອນ cache
          if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // ລຶບ cache ເກົ່າ (v1.4, v1.3, v1.2)
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});




