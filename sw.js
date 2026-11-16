self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
});

self.addEventListener('fetch', (event) => {
  // গেমটি অনলাইনে স্মুথভাবে রান করার জন্য
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
