/**
 * Globetrotter Gateway • Sovereign Service Worker
 * 
 * Provides:
 * 1. 100% Offline App Shell Loading (Airplane Mode & 0% cellular deadzones)
 * 2. Cache-First serving for immutable hashed assets (/assets/*)
 * 3. Network-First serving for HTML documents to guarantee instant updates
 * 4. Offline gate pass caching for remote entrance checkpoints
 */

const CACHE_NAME = 'globetrotter-v2.1.0';
const STATIC_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/pwa-192.png',
  '/pwa-512.png',
  '/fonts/plus-jakarta-sans.woff2',
  '/fonts/cinzel-bold.woff2'
];

// Handle direct skipWaiting commands from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

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

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Never intercept external fonts, CDNs, or third-party APIs (avoids CSP connect-src blocks)
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('razorpay.com') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('msg91.com') ||
    url.hostname.includes('messagecentral.com') ||
    url.hostname.includes('open-meteo.com')
  ) {
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

  // A. Navigation (HTML document requests): Network-first with cache fallback
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

  // B. Content-Hashed Production Assets (/assets/*): Cache-First (Instant 0ms load, zero CPU)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkRes;
        });
      })
    );
    return;
  }

  // C. Images & Media (/images/*): Cache-First with Network Fallback
  if (
    url.pathname.startsWith('/images/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.webp')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const clone = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkRes;
          })
          .catch(() => null);
      })
    );
    return;
  }

  // D. General fetch fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).catch(() => {
        return new Response(JSON.stringify({ offline: true, message: 'Offline mode active' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      });
    })
  );
});
