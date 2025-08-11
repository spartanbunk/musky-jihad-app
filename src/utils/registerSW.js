// Service Worker Registration for PWA
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        console.log('🔧 Registering service worker...')
        const registration = await navigator.serviceWorker.register('/sw.js')
        
        console.log('✅ Service Worker registered successfully:', registration)
        
        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          console.log('🔄 Service Worker update found')
          const newWorker = registration.installing
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🆕 New service worker installed, refresh recommended')
                
                // Could show update notification to user
                if (confirm('App update available! Reload to get the latest features?')) {
                  window.location.reload()
                }
              }
            })
          }
        })
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('📨 Message from service worker:', event.data)
          
          if (event.data.type === 'TRIGGER_MARK_FISH') {
            console.log('🎣 Service worker requesting mark fish action')
            // Trigger the mark fish functionality
            if (window.LocationService) {
              window.LocationService.markFishLocation()
            }
          }
        })
        
        return registration
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error)
      }
    })
  } else {
    console.log('🚫 Service Worker not supported')
  }
}

// Install prompt for PWA
export function setupInstallPrompt() {
  let deferredPrompt = null
  
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('📱 Install prompt available')
    e.preventDefault()
    deferredPrompt = e
    
    // Show custom install button (could add to UI)
    showInstallButton(deferredPrompt)
  })
  
  window.addEventListener('appinstalled', () => {
    console.log('📱 PWA installed successfully')
    deferredPrompt = null
  })
}

function showInstallButton(deferredPrompt) {
  // Create install button if it doesn't exist
  let installButton = document.getElementById('pwa-install-button')
  
  if (!installButton) {
    installButton = document.createElement('button')
    installButton.id = 'pwa-install-button'
    installButton.textContent = '📱 Install App'
    installButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: #1e3a8a;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      font-weight: bold;
      z-index: 1000;
    `
    
    installButton.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        
        console.log('📱 Install prompt result:', outcome)
        
        if (outcome === 'accepted') {
          console.log('✅ User accepted install')
        } else {
          console.log('❌ User declined install')
        }
        
        deferredPrompt = null
        installButton.remove()
      }
    })
    
    document.body.appendChild(installButton)
  }
  
  installButton.style.display = 'block'
}