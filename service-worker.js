// 🔹 ປ່ຽນຄ່ານີ້ທຸກເທື່ອທີ່ອັບເດດລະບົບ
const APP_VERSION = 'v2026.05.15';

// 🔹 cache name = app name + version
const CACHE_NAME = `checkin-pwa-${APP_VERSION}`;

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ================= INSTALL =================
self.addEventListener('install', (event) => {
  self.skipWaiting(); // ໃຫ້ version ໃໝ່ເຮັດວຽກທັນທີ
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ Caching assets ' + APP_VERSION + '...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// ================= ACTIVATE =================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          // 🔥 ລົບ cache ເກົ່າທີ່ບໍ່ກົງ version
          if (cache !== CACHE_NAME) {
            console.log('🧹 Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ================= FETCH (Cache First) =================
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
