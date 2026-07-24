const CACHE_NAME = 'the-lab-v4';

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
  const url = request.url;

  // Never cache icons or manifest: always check network first for instant PWA icon updates
  const isPwaIconOrManifest = url.includes('icon.svg') || 
                               url.includes('pwa-') || 
                               url.includes('manifest.json') || 
                               url.includes('favicon');

  if (isPwaIconOrManifest) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  const isHtml = request.mode === 'navigate' || 
                 (request.headers.get('accept') && request.headers.get('accept').includes('text/html'));
  
  if (isHtml) {
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
    event.respondWith(fetch(request));
  }
});