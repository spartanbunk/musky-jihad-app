// Enhanced Location Service for PWA
class LocationService {
  static async getCurrentLocation(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // 1 minute cache
    };

    const finalOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const result = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            heading: position.coords.heading,
            speed: position.coords.speed,
            altitude: position.coords.altitude
          };
          
          console.log('📍 Location captured:', result);
          console.log('📍 Location details:');
          console.log('  - Coordinates:', `${result.latitude}, ${result.longitude}`);
          console.log('  - Accuracy:', `±${result.accuracy}m`);
          console.log('  - Age:', `${(Date.now() - result.timestamp) / 1000}s ago`);
          console.log('  - Google Maps:', `https://www.google.com/maps?q=${result.latitude},${result.longitude}`);
          
          // Check if accuracy is poor
          if (result.accuracy > 100) {
            console.warn('⚠️ Poor GPS accuracy detected!', `±${result.accuracy}m`);
            console.warn('   Possible causes: Indoor location, weak GPS signal, or network-based location');
          }
          
          resolve(result);
        },
        (error) => {
          console.error('❌ Location error:', error);
          
          // Provide helpful error messages
          let userMessage = '';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              userMessage = 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              userMessage = 'Location information unavailable. Try again in a moment.';
              break;
            case error.TIMEOUT:
              userMessage = 'Location request timed out. Check your GPS signal.';
              break;
            default:
              userMessage = 'Unknown location error occurred.';
              break;
          }
          
          reject({
            code: error.code,
            message: userMessage,
            originalError: error
          });
        },
        finalOptions
      );
    });
  }

  static async getCurrentLocationForFishing() {
    console.log('🎣 Starting fishing-specific location capture...');
    console.log('📱 User agent:', navigator.userAgent);
    console.log('🔒 Protocol:', window.location.protocol);
    console.log('🌐 Host:', window.location.host);
    
    // Check if HTTPS is required (mobile browsers)
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const isHTTPS = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isMobile && !isHTTPS && !isLocalhost) {
      console.error('🚨 Mobile device detected but not HTTPS - location will likely fail');
      throw new Error('HTTPS required for location access on mobile devices. Please use ngrok or deploy to HTTPS.');
    }
    
    console.log('🎣 Attempting high-accuracy GPS (this may take 10-15 seconds)...');
    
    try {
      // First attempt: Maximum accuracy for fishing
      const location = await this.getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 30000, // Longer timeout for mobile GPS fix
        maximumAge: 0 // Force completely fresh location
      });
      
      console.log('🎣 High-accuracy GPS successful!');
      
      // Validate coordinates are reasonable for Lake St. Clair area
      const lakeStClairBounds = {
        north: 43.0,
        south: 42.2, 
        east: -82.3,
        west: -83.3
      };
      
      const { latitude, longitude } = location;
      
      if (latitude >= lakeStClairBounds.south && latitude <= lakeStClairBounds.north &&
          longitude >= lakeStClairBounds.west && longitude <= lakeStClairBounds.east) {
        console.log('✅ Location is within Lake St. Clair region');
      } else {
        console.warn('⚠️ Location seems outside Lake St. Clair region');
        console.warn(`   Expected: lat ${lakeStClairBounds.south}-${lakeStClairBounds.north}, lng ${lakeStClairBounds.west}-${lakeStClairBounds.east}`);
        console.warn(`   Got: lat ${latitude}, lng ${longitude}`);
      }
      
      return location;
    } catch (error) {
      console.warn('🎣 High-accuracy location failed, trying standard GPS:', error.message);
      
      try {
        // Second attempt: Standard accuracy with network fallback
        return await this.getCurrentLocation({
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000 // Allow 1 minute cache as fallback
        });
      } catch (fallbackError) {
        console.error('🎣 All location attempts failed:', fallbackError.message);
        throw fallbackError;
      }
    }
  }

  static watchPosition(callback, errorCallback, options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    };

    if (!navigator.geolocation) {
      errorCallback(new Error('Geolocation not supported'));
      return null;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const result = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        callback(result);
      },
      errorCallback,
      { ...defaultOptions, ...options }
    );

    return watchId;
  }

  static clearWatch(watchId) {
    if (watchId && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  static async requestPermission() {
    if (!navigator.permissions) {
      // Fallback: try to get location (which will trigger permission)
      try {
        await this.getCurrentLocation();
        return 'granted';
      } catch (error) {
        return 'denied';
      }
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state; // 'granted', 'denied', or 'prompt'
    } catch (error) {
      console.warn('Permission query failed:', error);
      return 'unknown';
    }
  }

  static formatCoordinates(latitude, longitude, precision = 6) {
    return {
      latitude: parseFloat(latitude.toFixed(precision)),
      longitude: parseFloat(longitude.toFixed(precision)),
      formatted: `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`
    };
  }

  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    
    return {
      kilometers: distance,
      miles: distance * 0.621371,
      meters: distance * 1000
    };
  }

  // Voice-activated location capture
  static async markFishLocation() {
    console.log('🎣 Voice command: Mark Fish - Opening catch form and requesting location...');
    
    // Always open the form first, regardless of location success
    const markFishEvent = new CustomEvent('markFish', {
      detail: {
        latitude: 0,
        longitude: 0,
        accuracy: null,
        timestamp: new Date().toISOString(),
        source: 'voice-command-opening',
        requestLocation: true
      }
    });
    
    console.log('🎣 Step 1: Opening catch form immediately');
    window.dispatchEvent(markFishEvent);
    
    // Try to get location in the background
    try {
      console.log('🎣 Step 2: Requesting location permission and GPS...');
      const location = await this.getCurrentLocationForFishing();
      console.log('🎣 Step 3: Location captured successfully:', location);
      
      // Update the form with location
      const locationUpdateEvent = new CustomEvent('markFishLocationUpdate', {
        detail: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: new Date().toISOString(),
          source: 'voice-command-location-success'
        }
      });
      
      console.log('🎣 Step 4: Updating form with location:', locationUpdateEvent.detail);
      window.dispatchEvent(locationUpdateEvent);
      
      return location;
    } catch (error) {
      console.log('🎣 Location failed, but form is already open for manual entry:', error.message);
      
      // Dispatch error event for user feedback
      const errorEvent = new CustomEvent('markFishError', {
        detail: { 
          error: error.message,
          showUserMessage: true,
          suggestion: 'You can enter coordinates manually or use the GPS button in the form.'
        }
      });
      
      window.dispatchEvent(errorEvent);
      
      // Don't throw error since form is already open
      return null;
    }
  }
}

// Export for use in components
if (typeof window !== 'undefined') {
  window.LocationService = LocationService;
}

export default LocationService;