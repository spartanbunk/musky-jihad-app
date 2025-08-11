'use client'

import { useEffect, useRef, useState } from 'react'

export default function FishingMap({ catches, selectedSpecies, onMapReady }) {
  const mapRef = useRef(null)
  const [map, setMap] = useState(null)
  const [markers, setMarkers] = useState([])
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [tempMarker, setTempMarker] = useState(null)
  const markersRef = useRef([])

  // Lake St. Clair coordinates
  const lakeStClairCenter = { lat: 42.4583, lng: -82.7167 }

  const speciesConfig = {
    musky: { color: '#22c55e', icon: '🐟', name: 'Musky' },
    walleye: { color: '#f97316', icon: '🐠', name: 'Walleye' },
    bass: { color: '#f97316', icon: '🎣', name: 'Bass' },
    pike: { color: '#dc2626', icon: '🐡', name: 'Pike' },
    perch: { color: '#eab308', icon: '🐟', name: 'Perch' },
    bluegill: { color: '#3b82f6', icon: '🐟', name: 'Bluegill' },
    salmon: { color: '#ec4899', icon: '🍣', name: 'Salmon' },
    trout: { color: '#06b6d4', icon: '🐟', name: 'Trout' }
  }

  useEffect(() => {
    // Check if Google Maps API key is configured
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      console.error('Google Maps API key not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env file')
      setIsMapLoaded(false)
      return
    }

    // Load Google Maps script
    if (!window.google) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.onload = initializeMap
      script.onerror = (error) => {
        console.error('Failed to load Google Maps script:', error)
        console.error('API Key being used:', apiKey)
        console.error('Script src:', script.src)
        setIsMapLoaded(false)
      }
      document.head.appendChild(script)
    } else {
      initializeMap()
    }
  }, [])

  useEffect(() => {
    // Update markers when catches or selected species change
    if (map && isMapLoaded) {
      updateMarkers()
    }
  }, [catches, selectedSpecies, map, isMapLoaded])

  const initializeMap = () => {
    if (!mapRef.current || !window.google) {
      console.error('Map ref or Google not available:', { mapRef: !!mapRef.current, google: !!window.google })
      return
    }

    console.log('Initializing Google Maps...')
    const newMap = new window.google.maps.Map(mapRef.current, {
        center: lakeStClairCenter,
        zoom: 11,
        mapTypeId: 'hybrid',
        styles: [
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#006994' }]
          }
        ]
      })

      // Add click listener for new catch locations
      newMap.addListener('click', (event) => {
        const lat = event.latLng.lat()
        const lng = event.latLng.lng()
        console.log('Map clicked at:', { lat, lng })
      
      // Remove any existing temporary marker
      if (tempMarker) {
        tempMarker.setMap(null)
      }
      
      // Create a temporary marker to show where user clicked
      const newTempMarker = new window.google.maps.Marker({
        position: { lat, lng },
        map: newMap,
        title: 'Click here to log a catch',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ff4444',
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2
        },
        animation: window.google.maps.Animation.DROP
      })
      
      // Create info window for temp marker
      const tempInfoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; text-align: center;">
            <div style="color: #ff4444; font-weight: bold; margin-bottom: 5px;">📍 New Catch Location</div>
            <div style="font-size: 0.9em; color: #666;">
              ${lat.toFixed(6)}, ${lng.toFixed(6)}
            </div>
            <div style="font-size: 0.8em; color: #888; margin-top: 5px;">
              Fill out the catch form to log your fish here
            </div>
          </div>
        `
      })
      
      // Show info window immediately
      tempInfoWindow.open(newMap, newTempMarker)
      
      // Close info window after 3 seconds
      setTimeout(() => {
        if (tempInfoWindow) {
          tempInfoWindow.close()
        }
      }, 3000)
      
      setTempMarker(newTempMarker)
      
      // This will be used by CatchLogger component
      window.dispatchEvent(new CustomEvent('mapClick', { 
        detail: { lat, lng } 
      }))
    })

    setMap(newMap)
    setIsMapLoaded(true)
    
    // Notify parent component that map is ready and pass navigation functions
    if (onMapReady) {
      onMapReady({
        centerOnLocation: (lat, lng, zoom = 15) => {
          if (newMap) {
            newMap.setCenter({ lat, lng })
            newMap.setZoom(zoom)
            
              // Use a slight delay to ensure markers are rendered
              setTimeout(() => {
                // Get current markers from ref
                const currentMarkers = markersRef.current
                const targetMarker = currentMarkers.find(marker => {
                  if (!marker || !marker.getPosition) return false
                  const position = marker.getPosition()
                  return Math.abs(position.lat() - lat) < 0.0001 && 
                         Math.abs(position.lng() - lng) < 0.0001
                })
              
              if (targetMarker) {
                // Animate the marker
                targetMarker.setAnimation(window.google.maps.Animation.BOUNCE)
                setTimeout(() => {
                  if (targetMarker.setAnimation) {
                    targetMarker.setAnimation(null)
                  }
                }, 2000)
                
                // Also open the info window for better UX
                const infoWindow = targetMarker.infoWindow
                if (infoWindow) {
                  infoWindow.open(newMap, targetMarker)
                }
              }
            }, 500)
          }
        },
        clearTempMarker: () => {
          if (tempMarker) {
            tempMarker.setMap(null)
            setTempMarker(null)
          }
        },
        map: newMap
      })
    }
  }

  const updateMarkers = () => {
    console.log('🗺️ updateMarkers called with catches:', catches)
    
    // Clear existing markers
    markers.forEach(marker => marker.setMap(null))
    
    // Clear temporary marker when updating with new catches
    if (tempMarker) {
      tempMarker.setMap(null)
      setTempMarker(null)
    }

    const newMarkers = catches.map(catchData => {
      // Use the speciesConfig from the catch data if available, otherwise fall back to local config
      const config = catchData.speciesConfig || speciesConfig[catchData.species] || speciesConfig.musky
      console.log('🎯 Creating marker for catch:', catchData.species, 'with config:', config)
      
      // Create custom marker
      const marker = new window.google.maps.Marker({
        position: { lat: catchData.latitude, lng: catchData.longitude },
        map: map,
        title: `${catchData.species.charAt(0).toUpperCase() + catchData.species.slice(1)} - ${catchData.length}" ${catchData.weight}lbs`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: config.color,
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      })

      // Create info window with proper environmental data
      const getConditionsText = (conditions) => {
        if (!conditions || Object.keys(conditions).length === 0) {
          return 'No conditions recorded'
        }
        
        const temp = conditions.airTemperature || conditions.temperature || 'N/A'
        const windSpeed = conditions.windSpeed || 'N/A'
        const windDirection = conditions.windDirection || ''
        const waterTemp = conditions.waterTemp || 'N/A'
        
        return `${temp}°F air, ${waterTemp}°F water, ${windSpeed}mph ${windDirection} wind`
      }

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 10px; max-width: 220px;">
            <h3 style="margin: 0 0 10px 0; color: ${config.color};">
              ${config.icon} ${catchData.species.charAt(0).toUpperCase() + catchData.species.slice(1)}
            </h3>
            <p style="margin: 5px 0;"><strong>Length:</strong> ${catchData.length}"</p>
            <p style="margin: 5px 0;"><strong>Weight:</strong> ${catchData.weight} lbs</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(catchData.catchTime).toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date(catchData.catchTime).toLocaleTimeString()}</p>
            ${catchData.depth ? `<p style="margin: 5px 0;"><strong>Depth:</strong> ${catchData.depth} ft</p>` : ''}
            ${catchData.lureType ? `<p style="margin: 5px 0;"><strong>Lure:</strong> ${catchData.lureType}</p>` : ''}
            <p style="margin: 5px 0; font-size: 0.9em; color: #666;"><strong>Conditions:</strong> ${getConditionsText(catchData.conditions)}</p>
          </div>
        `
      })

      marker.addListener('click', () => {
        infoWindow.open(map, marker)
      })

      // Store reference to info window for later use
      marker.infoWindow = infoWindow

      return marker
    })

    setMarkers(newMarkers)
    markersRef.current = newMarkers
  }

  const focusOnSpecies = () => {
    if (!map || catches.length === 0) return

    const bounds = new window.google.maps.LatLngBounds()
    catches.forEach(catchData => {
      bounds.extend({ lat: catchData.latitude, lng: catchData.longitude })
    })
    map.fitBounds(bounds)
  }

  return (
    <div>
      <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
          Showing {catches.length} {selectedSpecies} catch{catches.length !== 1 ? 'es' : ''}
        </div>
        {catches.length > 0 && (
          <button 
            onClick={focusOnSpecies}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            Focus on {selectedSpecies}
          </button>
        )}
      </div>

      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '400px', 
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}
      />

      {!isMapLoaded && (
        <div style={{ 
          padding: '40px',
          textAlign: 'center',
          background: '#f8fafc',
          border: '2px dashed #e2e8f0',
          borderRadius: '8px'
        }}>
          <div style={{ color: '#dc2626', fontWeight: 'bold', marginBottom: '10px', fontSize: '1.1rem' }}>
            🗺️ Map Temporarily Unavailable
          </div>
          <div style={{ fontSize: '0.9rem', marginBottom: '15px', color: '#64748b' }}>
            Google Maps API key needs to be updated
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4', marginBottom: '20px' }}>
            Get a valid API key at <a href="https://developers.google.com/maps/documentation/javascript/get-api-key" 
               target="_blank" style={{ color: '#0284c7', textDecoration: 'underline' }}>
              developers.google.com/maps</a><br/>
            Then update NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env
          </div>
          
          {/* Show catches as a simple list when map is unavailable */}
          {catches.length > 0 && (
            <div style={{ 
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginTop: '20px',
              textAlign: 'left'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '15px', textAlign: 'center' }}>
                📍 {selectedSpecies} Catch Locations
              </div>
              {catches.map((catchData, index) => (
                <div key={catchData.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: index < catches.length - 1 ? '1px solid #f1f5f9' : 'none'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#1e40af' }}>
                      {catchData.species} - {catchData.length}" {catchData.weight}lbs
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {new Date(catchData.catchTime).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {catchData.latitude?.toFixed(4)}, {catchData.longitude?.toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Species Legend */}
      <div style={{
        marginTop: '12px',
        padding: '12px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px'
      }}>
        <div style={{ 
          fontSize: '0.85rem', 
          fontWeight: 'bold', 
          color: '#374151',
          marginBottom: '8px' 
        }}>
          Species Colors
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.8rem'
        }}>
          {['musky', 'walleye', 'bass', 'perch', 'bluegill'].map(species => {
            const config = speciesConfig[species]
            return (
              <div key={species} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px'
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: config.color,
                  border: '1px solid #fff',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.2)'
                }} />
                <span style={{ color: '#374151' }}>
                  {config.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#64748b' }}>
        💡 <strong>Tip:</strong> Use the GPS button in the catch logger to set your location while the map is being updated
      </div>
    </div>
  )
}