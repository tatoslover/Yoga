/**
 * Mat & Mind Yoga - Service Worker
 * Provides offline functionality and caching
 */

const CACHE_NAME = 'mat-and-mind-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/css/styles.css',
  '/css/themes.css',
  '/css/attribution.css',
  '/css/video-player.css',
  '/js/main.js',
  '/js/theme-switcher.js',
  '/js/user-preferences.js',
  '/js/video-player.js',
  '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(STATIC_ASSETS);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }

        // Clone the request - request is a stream and can only be consumed once
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response - response is a stream and can only be consumed once
            const responseToCache = response.clone();

            // Don't cache video content (too large)
            if (!event.request.url.includes('youtube.com') &&
                !event.request.url.includes('youtu.be') &&
                !event.request.url.includes('.mp4') &&
                !event.request.url.includes('.webm') &&
                !event.request.url.includes('.avi')) {

              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }

            return response;
          })
          .catch(error => {
            // If fetch fails (e.g., offline), try to return the offline page for HTML requests
            if (event.request.headers.get('Accept').includes('text/html')) {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Handle messages from clients (main thread)
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
