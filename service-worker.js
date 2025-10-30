const CACHE_NAME = 'online-system-cache-v1.1.0'; // ອັບເດດເວີຊັ່ນ Cache
const urlsToCache = [
  './', // ໝາຍເຖິງ root ຂອງ sub-directory
  './index.html',
  './manifest.json', // ເພີ່ມ manifest ເຂົ້າ cache
  'https://i.ibb.co/N65431ND/Logo.png', // ໃຊ້ URL ທີ່ໃຊ້ງານໄດ້
  'https://i.ibb.co/F4VGPVB1/image.png',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;700&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Failed to add resources to cache', err);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Return cached response if found
        }
        return fetch(event.request).then(response => {
          // ກວດສອບ response ໃຫ້ແນ່ໃຈກ່ອນ cache
          if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
            return response;
          }

          // ຕ້ອງ clone response ເພາະ response ເປັນ stream ໃຊ້ໄດ້ຄັ້ງດຽວ
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
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
