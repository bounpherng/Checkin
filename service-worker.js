const CACHE_NAME = 'online-system-cache-v1.6'; // [ປັບປຸງ] ອັບເດດເວີຊັ່ນ Cache ເປັນ v1.6

// [FIX] ປ່ຽນເສັ້ນທາງ (paths) ໃຫ້ເປັນ absolute ສຳລັບ GitHub Pages
const urlsToCache = [
  '/Checkin/', // ໝາຍເຖິງ root ຂອງ sub-directory
  '/Checkin/index.html',
  '/Checkin/manifest.json', // ເພີ່ມ manifest ເຂົ້າ cache
  
  // [ປັບປຸງ] ໃຊ້ໄອຄອນທັງສອງຂະໜາດທີ່ໂຮສຢູ່ໃນ GitHub Pages
  '/Checkin/icon-192.png', 
  '/Checkin/icon-512.png', 
  
  'https://i.ibb.co/8gPz5vZP/qr-code.png', // URL QR code
  
  // [FIX] ແກ້ໄຂ URL ຂອງ font ທີ່ພິມຜິດ (httpss -> https) ແລະອັບເດດໃຫ້ຕົງກັບ HTML
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;700;800&display=swap',
  'https://fonts.gstatic.com/s/notosanslao/v19/0QIzFNIyG-MWF5ytL-IZ-sK6f8M.woff2', // browser ອາດຈະ request font file
  
  // URL ຂອງວິດີໂອ ແລະ lord-icon (ຖ້າຕ້ອງການໃຫ້ offline ໄດ້)
  'https://cdn-icons-mp4.flaticon.com/512/15594/15594572.mp4',
  'https://cdn-icons-mp4.flaticon.com/512/15594/15594543.mp4',
  'https://cdn.lordicon.com/onmwuuox.json',
  'https://cdn.lordicon.com/lordicon.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // ໃຊ້ addAll ເພື່ອດາວໂຫຼດ ແລະ cache ທຸກ URL
        // ຖ້າມີ URL ໃດໜຶ່ງດາວໂຫຼດບໍ່ສຳເລັດ, service worker ຈະ install ບໍ່ຜ່ານ
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Failed to add resources to cache', err);
        // ຖ້າ cache ບາງ URL ບໍ່ສຳເລັດ (ເຊັ່ນ ວິດີໂອ), ອາດຈະລອງ cache ແບບອື່ນ
        // ແຕ່ສຳລັບ PWA ໄຟລ໌ຫຼັກ (index, manifest) ຕ້ອງ cache ໃຫ້ສຳເລັດ
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

          // ຕ້ອງ clone response ເພາະ response ເປັນ stream ໃຊ້ໄດ້ຄັ້ງດຽວ
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              // ເກັບ response ທີ່ດຶງມາໃໝ່ໄວ້ໃນ cache
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
          // ລຶບ cache ເກົ່າທີ່ບໍ່ໄດ້ໃຊ້ແລ້ວ
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
