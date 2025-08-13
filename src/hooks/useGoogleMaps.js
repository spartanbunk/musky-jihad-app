import { useState, useEffect, useCallback } from 'react'

// Global state for Google Maps
let isGoogleMapsLoaded = false
let isGoogleMapsLoading = false
let googleMapsCallbacks = []

const useGoogleMaps = () => {
  const [isLoaded, setIsLoaded] = useState(isGoogleMapsLoaded)
  const [isLoading, setIsLoading] = useState(isGoogleMapsLoading)
  const [error, setError] = useState(null)

  const loadGoogleMaps = useCallback(() => {
    // Check if already loaded
    if (window.google && window.google.maps) {
      console.log('✅ Google Maps already loaded')
      isGoogleMapsLoaded = true
      setIsLoaded(true)
      setIsLoading(false)
      return Promise.resolve()
    }

    // Check if already loading
    if (isGoogleMapsLoading) {
      console.log('⏳ Google Maps already loading...')
      return new Promise((resolve, reject) => {
        googleMapsCallbacks.push({ resolve, reject })
      })
    }

    // Check for existing script
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      console.log('📜 Google Maps script already exists, waiting for load...')
      isGoogleMapsLoading = true
      setIsLoading(true)
      
      return new Promise((resolve, reject) => {
        googleMapsCallbacks.push({ resolve, reject })
        
        const checkLoaded = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkLoaded)
            isGoogleMapsLoaded = true
            isGoogleMapsLoading = false
            setIsLoaded(true)
            setIsLoading(false)
            
            // Resolve all waiting callbacks
            googleMapsCallbacks.forEach(({ resolve }) => resolve())
            googleMapsCallbacks = []
          }
        }, 100)
        
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkLoaded)
          if (!window.google || !window.google.maps) {
            isGoogleMapsLoading = false
            setIsLoading(false)
            const errorMsg = 'Google Maps failed to load within timeout'
            setError(errorMsg)
            googleMapsCallbacks.forEach(({ reject }) => reject(new Error(errorMsg)))
            googleMapsCallbacks = []
          }
        }, 10000)
      })
    }

    // Load new script
    console.log('🔄 Loading Google Maps API...')
    isGoogleMapsLoading = true
    setIsLoading(true)

    return new Promise((resolve, reject) => {
      googleMapsCallbacks.push({ resolve, reject })

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
        const errorMsg = 'Google Maps API key not configured'
        console.error(errorMsg)
        setError(errorMsg)
        isGoogleMapsLoading = false
        setIsLoading(false)
        googleMapsCallbacks.forEach(({ reject }) => reject(new Error(errorMsg)))
        googleMapsCallbacks = []
        return
      }

      const script = document.createElement('script')
      script.id = 'google-maps-api'
      script.async = true
      script.defer = true
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&v=beta&loading=async`
      
      script.onload = () => {
        console.log('✅ Google Maps API loaded successfully')
        isGoogleMapsLoaded = true
        isGoogleMapsLoading = false
        setIsLoaded(true)
        setIsLoading(false)
        setError(null)
        
        // Resolve all waiting callbacks
        googleMapsCallbacks.forEach(({ resolve }) => resolve())
        googleMapsCallbacks = []
      }
      
      script.onerror = (error) => {
        console.error('❌ Failed to load Google Maps API:', error)
        isGoogleMapsLoading = false
        setIsLoading(false)
        const errorMsg = 'Failed to load Google Maps API'
        setError(errorMsg)
        
        // Reject all waiting callbacks
        googleMapsCallbacks.forEach(({ reject }) => reject(new Error(errorMsg)))
        googleMapsCallbacks = []
        
        // Remove failed script
        document.head.removeChild(script)
      }
      
      document.head.appendChild(script)
    })
  }, [])

  useEffect(() => {
    // Auto-load on mount if not already loaded/loading
    if (!isGoogleMapsLoaded && !isGoogleMapsLoading) {
      loadGoogleMaps()
    }
  }, [loadGoogleMaps])

  const checkAdvancedMarkersAvailable = useCallback(() => {
    return !!(window.google && window.google.maps && window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement)
  }, [isLoaded])

  return {
    isLoaded,
    isLoading,
    error,
    loadGoogleMaps,
    checkAdvancedMarkersAvailable
  }
}

export default useGoogleMaps