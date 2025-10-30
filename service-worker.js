const CACHE_NAME = 'online-system-cache-v1.1.2'; // ອັບເດດເວີຊັ່ນ Cache
const urlsToCache = [
  './', // ໝາຍເຖິງ root ຂອງ sub-directory
  './index.html',
  './manifest.json', // ເພີ່ມ manifest ເຂົ້າ cache
  'https://i.ibb.co/N65431ND/Logo.png', // Logo icon (from index and manifest)
  'https://i.ibb.co/8gPz5vZP/qr-code.png', // QR code image (from index)
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;700&display=swap' // Font
  // External scripts (lordicon, flaticon) ຈະຖືກ cache ໂດຍ 'fetch' event ເມື່ອໂຫຼດຄັ້ງທຳອິດ
];

self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        // addAll ເປັນ atomic - ຖ້າໄຟລ໌ໃດໜຶ່ງລົ້ມເຫຼວ, cache ທັງໝົດຈະລົ້ມເຫຼວ
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Service Worker: Failed to cache app shell', err);
      })
  );
});

self.addEventListener('fetch', event => {
  // ເຮົາຈະຈັດການສະເພາະ GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // ພົບໃນ Cache - return response
        if (response) {
          return response;
        }

        // ບໍ່ພົບໃນ Cache - ໄປເອົາຈາກ network
        return fetch(event.request).then(
          response => {
            // ກວດສອບວ່າ response ຖືກຕ້ອງ
            if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
              return response;
            }

            // ສິ່ງສຳຄັນ: Clone response ເພາະ response ເປັນ stream
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                console.log('Service Worker: Caching new resource:', event.request.url);
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(err => {
          // Network request ລົ້ມເຫຼວ
          console.error('Service Worker: Fetch failed', err);
          // ທ່ານສາມາດ return ໜ້າ offline ສຳຮອງໄດ້ຢູ່ຈຸດນີ້
        });
      })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  const cacheWhitelist = [CACHE_NAME]; // ກຳນົດ cache ທີ່ຖືກຕ້ອງ
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // ລົບ cache ເກົ່າທີ່ບໍ່ຢູ່ໃນ whitelist
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
