// Service Worker for Lake St. Clair Musky PWA
const CACHE_NAME = 'musky-jihad-v1'
const urlsToCache = [
  '/',
  '/manifest.json'
  // Note: Next.js handles most caching automatically
  // Removed favicon.ico to prevent cache errors
]

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching app resources')
        return cache.addAll(urlsToCache)
      })
  )
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  // Claim all clients immediately
  self.clients.claim()
})

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip caching for API calls to preserve real-time data
  if (event.request.url.includes('/api/')) {
    return
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('📦 Serving from cache:', event.request.url)
          return response
        }

        // Fetch from network and cache the response
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }

          // Clone the response
          const responseToCache = response.clone()

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache)
            })

          return response
        }).catch((error) => {
          console.error('🚫 Fetch failed:', error)
          
          // Return offline page or fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/') // Return cached home page
          }
          
          throw error
        })
      })
  )
})

// Handle background sync (for offline catch logging)
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag)
  
  if (event.tag === 'catch-sync') {
    event.waitUntil(syncOfflineCatches())
  }
})

// Handle push notifications (future feature)
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received:', event)
  
  const options = {
    body: 'Check the latest fishing conditions!',
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  }
  
  event.waitUntil(
    self.registration.showNotification('Musky Jihad Update', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Notification clicked')
  
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow('/')
  )
})

// Sync offline catches when network is available
async function syncOfflineCatches() {
  try {
    // Get offline catches from IndexedDB (would implement this)
    console.log('🎣 Syncing offline catches...')
    
    // For now, just log - would implement actual sync logic
    return Promise.resolve()
  } catch (error) {
    console.error('❌ Sync failed:', error)
    throw error
  }
}

// Handle voice command shortcuts
self.addEventListener('message', (event) => {
  console.log('📨 Message received in SW:', event.data)
  
  if (event.data && event.data.type === 'VOICE_COMMAND') {
    console.log('🎤 Voice command in service worker:', event.data.command)
    
    // Could trigger location capture or other background tasks
    if (event.data.command.includes('mark fish')) {
      // Notify main thread to trigger location capture
      event.ports[0].postMessage({
        type: 'TRIGGER_MARK_FISH'
      })
    }
  }
})