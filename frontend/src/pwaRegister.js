/**
 * Globetrotter Gateway • PWA Service Worker & Network Sentinel
 * 
 * Manages service worker lifecycle, offline status detection,
 * and offline network state dispatching.
 */

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;

  // In local Vite dev mode, unregister any active Service Worker to prevent HMR module cache collisions & infinite reload loops
  if (import.meta.env.DEV) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
          console.debug('[Globetrotter PWA] Unregistered dev Service Worker to enable clean Vite HMR.');
        }
      });
      if (typeof caches !== 'undefined') {
        caches.keys().then((keys) => {
          for (let key of keys) {
            caches.delete(key);
          }
        });
      }
    }
    return;
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Check for worker updates in the background and activate immediately
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Direct the new service worker to skip waiting so obsolete assets are purged at once
                  installingWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.dispatchEvent(new CustomEvent('globetrotter-update-available'));
                }
              };
            }
          };
        })
        .catch((error) => {
          console.warn('[Globetrotter PWA] Service Worker registration failed:', error);
        });
    });
  }

  // Network sentinel listeners
  window.addEventListener('online', () => {
    dispatchNetworkState(true);
  });

  window.addEventListener('offline', () => {
    dispatchNetworkState(false);
  });
}

function dispatchNetworkState(isOnline) {
  const event = new CustomEvent('globetrotter-network-status', {
    detail: { online: isOnline, timestamp: Date.now() }
  });
  window.dispatchEvent(event);
}

export function isDeviceOnline() {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}
