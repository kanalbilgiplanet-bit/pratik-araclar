const CACHE_NAME = 'pratikbase-v2';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/assets/app.min.css',
  '/favicon.svg',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('Pre-cache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// High-speed Stale-While-Revalidate & Cache-First Strategy
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  const url = new URL(req.url);

  // 1. Static Assets (CSS, JS, Fonts, Images): Cache First with background revalidate
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) {
          // Serve from cache instantly, revalidate in background
          fetch(req).then(res => {
            if (res && res.status === 200) {
              const resClone = res.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(req).then(res => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
          }
          return res;
        });
      })
    );
    return;
  }

  // 2. HTML Navigation: Fast timeout Network-First with instant cache fallback
  event.respondWith(
    new Promise((resolve) => {
      let resolved = false;

      // Fast timeout: If network doesn't answer in 800ms (mobile latency), serve cached
      const timeoutId = setTimeout(() => {
        caches.match(req).then(cached => {
          if (cached && !resolved) {
            resolved = true;
            resolve(cached);
          }
        });
      }, 800);

      fetch(req)
        .then(networkResponse => {
          clearTimeout(timeoutId);
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
          }
          if (!resolved) {
            resolved = true;
            resolve(networkResponse);
          }
        })
        .catch(() => {
          clearTimeout(timeoutId);
          caches.match(req).then(cached => {
            if (cached) {
              resolve(cached);
            } else if (req.headers.get('accept')?.includes('text/html')) {
              caches.match('/index.html').then(fallback => resolve(fallback));
            } else {
              resolve(new Response('Çevrimdışısınız', { status: 503 }));
            }
          });
        });
    })
  );
});
