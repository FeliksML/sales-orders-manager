// Service Worker Killer
// This service worker immediately unregisters itself to clear any
// previously cached problematic service workers that were causing
// Mixed Content errors by caching HTTP URLs.
//
// Once the old SW is cleared and the site works correctly,
// we can re-enable the PWA with proper HTTPS configuration.

self.addEventListener('install', () => {
  console.log('[SW Killer] Installing - will unregister immediately')
  self.skipWaiting()
})

self.addEventListener('activate', async (event) => {
  console.log('[SW Killer] Activating - clearing caches and unregistering')
  
  event.waitUntil(
    (async () => {
      // Clear all caches
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log('[SW Killer] Deleting cache:', cacheName)
          return caches.delete(cacheName)
        })
      )
      
      // Unregister this service worker
      const registration = self.registration
      await registration.unregister()
      console.log('[SW Killer] Service worker unregistered successfully')
      
      // Notify all clients to reload
      const clients = await self.clients.matchAll({ type: 'window' })
      clients.forEach(client => {
        client.postMessage({ type: 'SW_UNREGISTERED' })
      })
    })()
  )
})

// Don't intercept any fetch requests - let them go directly to network
self.addEventListener('fetch', () => {
  // Do nothing - let the browser handle all requests normally
})

console.log('[SW Killer] Loaded - this SW will clear caches and unregister itself')

