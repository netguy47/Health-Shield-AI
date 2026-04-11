import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope;

// Pre-cache static assets
precacheAndRoute(self.__WB_MANIFEST || []);

// Strategy: Cache-First for images/assets
registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'font',
  new CacheFirst({
    cacheName: 'assets-cache',
  })
);

// Strategy: Network-First for HTML/App-shell
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages-cache',
  })
);

// Strategy: Stale-While-Revalidate for analytics/local data
registerRoute(
  ({ url }) => url.pathname.includes('/api/'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
  })
);
