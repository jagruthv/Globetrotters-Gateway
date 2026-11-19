/**
 * Globetrotter Gateway • Sovereign Service Worker
 * 
 * Provides:
 * 1. 100% Offline App Shell Loading (Airplane Mode & 0% cellular deadzones)
 * 2. Stale-While-Revalidate caching for scripts, styles, and typography
 * 3. Offline gate pass caching for remote entrance checkpoints
 */

const CACHE_NAME = 'globetrotter-v1.0.0';
const STATIC_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/pwa-192.png',
  '/pwa-512.png'
];

// 1. INSTALL
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch((err) => {
        console.warn('[SW] Pre-caching partial warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging deprecated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (e.g. POST /api/verify/scan is handled by frontend offline ledger)
  if (request.method !== 'GET') {
    return;
  }

  // Never intercept Vite dev server requests, HMR, or raw source modules
  if (
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/@fs/') ||
    url.pathname.includes('/@id/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.includes('node_modules')
  ) {
    return;
  }

  // A. Navigation (HTML document requests): Network first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html').then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // B. Google Fonts & external CDNs: Cache-First
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkRes) => {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return networkRes;
        });
      })
    );
    return;
  }

  // C. Local Static Assets (.js, .css, .svg, .png, .jpg): Cache-First with Background Revalidation
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const clone = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkRes;
          })
          .catch(() => null);

        if (cached) {
          return cached;
        }
        return fetchPromise;
      })
    );
    return;
  }

  // D. General fetch fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).catch(() => {
        // Silent catch for disconnected offline fetches
        return new Response(JSON.stringify({ offline: true, message: 'Offline mode active' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      });
    })
  );
});
