'use client'

import { useEffect, useRef, useState } from 'react'

export default function FishingMap({ catches, selectedSpecies }) {
  const mapRef = useRef(null)
  const [map, setMap] = useState(null)
  const [markers, setMarkers] = useState([])
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  // Lake St. Clair coordinates
  const lakeStClairCenter = { lat: 42.4583, lng: -82.7167 }

  const speciesConfig = {
    musky: { color: '#059669', icon: '🐟' },
    walleye: { color: '#d97706', icon: '🐠' },
    bass: { color: '#7c3aed', icon: '🎣' },
    pike: { color: '#dc2626', icon: '🐡' },
    perch: { color: '#eab308', icon: '🐟' },
    salmon: { color: '#ec4899', icon: '🍣' },
    trout: { color: '#06b6d4', icon: '🐟' }
  }

  useEffect(() => {
    // Load Google Maps script
    if (!window.google) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&libraries=places`
      script.onload = initializeMap
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
    if (!mapRef.current || !window.google) return

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
      // This will be used by CatchLogger component
      window.dispatchEvent(new CustomEvent('mapClick', { 
        detail: { lat, lng } 
      }))
    })

    setMap(newMap)
    setIsMapLoaded(true)
  }

  const updateMarkers = () => {
    // Clear existing markers
    markers.forEach(marker => marker.setMap(null))

    const newMarkers = catches.map(catchData => {
      const config = speciesConfig[catchData.species] || speciesConfig.musky
      
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

      // Create info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 10px; max-width: 200px;">
            <h3 style="margin: 0 0 10px 0; color: ${config.color};">
              ${config.icon} ${catchData.species.charAt(0).toUpperCase() + catchData.species.slice(1)}
            </h3>
            <p style="margin: 5px 0;"><strong>Length:</strong> ${catchData.length}"</p>
            <p style="margin: 5px 0;"><strong>Weight:</strong> ${catchData.weight} lbs</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(catchData.catchTime).toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>Conditions:</strong> ${catchData.conditions.temp}°F, ${catchData.conditions.wind}mph wind</p>
          </div>
        `
      })

      marker.addListener('click', () => {
        infoWindow.open(map, marker)
      })

      return marker
    })

    setMarkers(newMarkers)
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
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div>Loading Lake St. Clair map...</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '5px' }}>
            Click anywhere on the lake to log a catch
          </div>
        </div>
      )}

      <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#64748b' }}>
        💡 <strong>Tip:</strong> Click anywhere on the lake to quickly log a new catch at that location
      </div>
    </div>
  )
}