// Self-destructing service worker - clears all caches and unregisters
// This replaces any old service workers and cleans up cached content

self.addEventListener('install', () => {
  console.log('🧹 Kill-switch service worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', async (event) => {
  console.log('🧹 Kill-switch service worker activating...');
  
  event.waitUntil((async () => {
    try {
      // Clear all caches
      const cacheNames = await caches.keys();
      console.log('🗑️ Clearing caches:', cacheNames);
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      // Unregister this service worker
      console.log('🔄 Unregistering service worker...');
      await self.registration.unregister();
      
      // Refresh all clients to get fresh content
      const clients = await self.clients.matchAll({ type: 'window' });
      console.log('🔄 Refreshing', clients.length, 'clients...');
      clients.forEach(client => {
        client.navigate(client.url);
      });
      
      console.log('✅ Cleanup complete!');
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  })());
});

// Don't cache anything - pass all requests through
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

