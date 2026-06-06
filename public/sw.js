const CACHE_NAME = 'the-lab-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const isHtml = request.mode === 'navigate' || 
                 (request.headers.get('accept') && request.headers.get('accept').includes('text/html'));
  
  if (isHtml) {
    // HTML navigation: always check network first to get fresh asset hashes
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Cache static assets (images, icons, fonts)
  const url = request.url;
  const isStaticAsset = url.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
  
  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((networkResponse) => {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return networkResponse;
        });
      })
    );
  } else {
    // For JS, CSS bundles, etc: always fetch from network to avoid stale hashed assets
    event.respondWith(fetch(request));
  }
});