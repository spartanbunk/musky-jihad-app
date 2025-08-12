'use client'

import { useState, useEffect } from 'react'
import LocationService from '../utils/locationService'

export default function CatchLogger({ onCatchLogged, currentConditions }) {
  const [isLogging, setIsLogging] = useState(false)
  const [formData, setFormData] = useState({
    species: 'musky',
    length: '',
    weight: '',
    latitude: '',
    longitude: '',
    depth: '',
    lureType: '',
    photo: null
  })

  const species = [
    'musky', 'walleye', 'bass', 'pike', 'perch', 'bluegill', 'salmon', 'trout'
  ]

  const lureTypes = [
    'Bucktail', 'Crankbait', 'Jerkbait', 'Topwater', 'Soft Plastic', 
    'Spinnerbait', 'Jig', 'Live Bait', 'Trolling Spoon', 'Other'
  ]

  useEffect(() => {
    // Listen for map clicks to auto-fill location and conditions
    const handleMapClick = (event) => {
      setFormData(prev => ({
        ...prev,
        latitude: event.detail.lat.toFixed(6),
        longitude: event.detail.lng.toFixed(6)
      }))
      if (!isLogging) {
        setIsLogging(true)
      }
    }

    // Listen for voice-activated mark fish command
    const handleMarkFish = (event) => {
      const { latitude, longitude, accuracy, source, error, requestLocation } = event.detail
      console.log('🎣 CatchLogger: Voice command received - opening form:', { latitude, longitude, accuracy, source, error })
      
      // Always open the logging form when voice command is received
      if (!isLogging) {
        console.log('🎣 CatchLogger: Opening catch logging form from voice command')
        setIsLogging(true)
      }
      
      // If we have location coordinates, set them
      if (latitude && longitude && latitude !== 0 && longitude !== 0) {
        console.log('🎣 CatchLogger: Setting initial location coordinates')
        setFormData(prev => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6)
        }))
      }
    }

    // Listen for location updates from voice commands
    const handleMarkFishLocationUpdate = (event) => {
      const { latitude, longitude, accuracy, source } = event.detail
      console.log('🎣 CatchLogger: Location update received:', { latitude, longitude, accuracy, source })
      
      if (latitude && longitude) {
        console.log('🎣 CatchLogger: Updating form with GPS location')
        setFormData(prev => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6)
        }))
        
        // Show accuracy feedback
        if (accuracy) {
          const accuracyMessage = accuracy < 10 ? 
            `📍 High accuracy location captured (±${accuracy.toFixed(1)}m)` :
            `📍 Location captured (±${accuracy.toFixed(0)}m accuracy)`
          
          console.log(accuracyMessage)
          // Could show a toast notification here
        }
      }
    }

    // Listen for location errors from voice commands
    const handleMarkFishError = (event) => {
      const { error, showUserMessage, suggestion } = event.detail
      console.error('🎣 Voice location error:', error)
      
      if (showUserMessage) {
        alert(`Location access needed: ${error}\n\n${suggestion}`)
      }
    }

    window.addEventListener('mapClick', handleMapClick)
    window.addEventListener('markFish', handleMarkFish)
    window.addEventListener('markFishLocationUpdate', handleMarkFishLocationUpdate)
    window.addEventListener('markFishError', handleMarkFishError)
    
    return () => {
      window.removeEventListener('mapClick', handleMapClick)
      window.removeEventListener('markFish', handleMarkFish)
      window.removeEventListener('markFishLocationUpdate', handleMarkFishLocationUpdate)
      window.removeEventListener('markFishError', handleMarkFishError)
    }
  }, [isLogging])

  const getCurrentLocation = async () => {
    try {
      console.log('🎣 CatchLogger: GPS button clicked - requesting location...')
      const location = await LocationService.getCurrentLocationForFishing()
      
      console.log('🎣 CatchLogger: Location received:', location)
      console.log('🎣 CatchLogger: Setting form data...')
      
      const newLat = location.latitude.toFixed(6)
      const newLng = location.longitude.toFixed(6)
      
      setFormData(prev => {
        const updated = {
          ...prev,
          latitude: newLat,
          longitude: newLng
        }
        console.log('🎣 CatchLogger: Form data updated:', updated)
        return updated
      })
      
      // Show accuracy feedback
      const accuracyMessage = location.accuracy < 10 ? 
        `📍 High accuracy location captured (±${location.accuracy.toFixed(1)}m)` :
        `📍 Location captured (±${location.accuracy.toFixed(0)}m accuracy)`
      
      console.log(accuracyMessage)
      alert(`${accuracyMessage}\nLat: ${newLat}, Lng: ${newLng}`)
      
    } catch (error) {
      console.error('🎣 CatchLogger: Location error:', error)
      alert(`Location Error: ${error.message || 'Unable to get current location. Please enter coordinates manually or click on the map.'}`)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'file' ? files[0] : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.length || !formData.weight) {
      alert('Please fill in length and weight')
      return
    }
    
    if (!formData.latitude || !formData.longitude) {
      alert('Please click on the map to set the catch location, or use the GPS button')
      return
    }
    
    // Automatically capture the exact time when user submits the catch
    const catchTimestamp = new Date().toISOString()
    console.log('🎣 Logging catch at:', catchTimestamp)

    // Extract comprehensive environmental conditions
    const environmentalConditions = currentConditions ? {
      // Weather conditions
      windSpeed: currentConditions.windSpeed,
      windDirection: currentConditions.windDirection,
      airTemperature: currentConditions.temperature,
      barometricPressure: currentConditions.pressure,
      
      // Water conditions
      waterTemp: currentConditions.waterTemperature ? 
        currentConditions.waterTemperature.average : 
        currentConditions.waterTemp,
      waterTempRange: currentConditions.waterTemperature?.temperatureRange,
      warmestWaterTemp: currentConditions.waterTemperature?.warmest?.temperature,
      coldestWaterTemp: currentConditions.waterTemperature?.coldest?.temperature,
      waveHeight: currentConditions.waveHeight,
      
      // Sky conditions
      cloudCover: currentConditions.cloudCover,
      humidity: currentConditions.humidity,
      
      // Astronomical conditions
      moonPhase: currentConditions.moonPhase?.name || currentConditions.moonPhase,
      moonIllumination: currentConditions.moonPhase?.illumination,
      moonOptimal: currentConditions.moonPhase?.optimal,
      
      // Sunrise/sunset times
      sunrise: currentConditions.astronomy?.sunrise,
      sunset: currentConditions.astronomy?.sunset,
      moonrise: currentConditions.astronomy?.moonrise,
      moonset: currentConditions.astronomy?.moonset,
      
      // Data quality and source information
      dataSource: currentConditions.source,
      dataQuality: currentConditions.dataQuality,
      capturedAt: catchTimestamp
    } : {}

    const catchData = {
      id: Date.now(), // Temporary ID - will be replaced by database
      species: formData.species,
      length: parseFloat(formData.length),
      weight: parseFloat(formData.weight),
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      depth: formData.depth ? parseFloat(formData.depth) : null,
      lureType: formData.lureType,
      catchTime: catchTimestamp,
      conditions: environmentalConditions,
      photo: formData.photo ? URL.createObjectURL(formData.photo) : null,
      photoUrl: formData.photo ? URL.createObjectURL(formData.photo) : null
    }

    try {
      // First upload the photo if one was selected
      let photoUrl = null
      if (formData.photo) {
        const photoFormData = new FormData()
        photoFormData.append('photo', formData.photo)
        
        try {
          const uploadResponse = await fetch('http://localhost:3011/api/uploads/catch-photo', {
            method: 'POST',
            body: photoFormData
          })
          
          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json()
            photoUrl = `http://localhost:3011${uploadResult.url}`
          }
        } catch (uploadError) {
          console.error('Photo upload failed:', uploadError)
          // Continue without photo
        }
      }
      
      // Send to backend API to store in database
      const response = await fetch('http://localhost:3011/api/catches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          species: formData.species,
          length: parseFloat(formData.length),
          weight: parseFloat(formData.weight),
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          depth: formData.depth ? parseFloat(formData.depth) : null,
          lureType: formData.lureType,
          catchTime: catchTimestamp,
          conditions: environmentalConditions,
          locationNotes: `Caught at ${formData.latitude}, ${formData.longitude}`,
          speciesSpecificAttributes: {},
          photoUrl: photoUrl
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Catch saved to database:', result)
        
        // Update the catchData with the real database ID and photo URL
        catchData.id = result.id
        // Keep the original catchTime we set (don't overwrite with database time)
        catchData.photoUrl = photoUrl
        
        // Add species configuration for map markers
        const speciesColors = {
          musky: '#22c55e',
          walleye: '#f97316',
          bass: '#f97316',
          pike: '#dc2626',
          perch: '#eab308',
          bluegill: '#3b82f6',
          salmon: '#ec4899',
          trout: '#06b6d4'
        }
        
        const speciesEmojis = {
          musky: '🐟',
          walleye: '🐠',
          bass: '🎣',
          pike: '🐡',
          perch: '🐟',
          bluegill: '🐟',
          salmon: '🍣',
          trout: '🐟'
        }
        
        catchData.speciesConfig = {
          emoji: speciesEmojis[formData.species] || '🐟',
          color: speciesColors[formData.species] || '#22c55e'
        }
        
        console.log('🎣 Calling onCatchLogged with catchData:', catchData)
        onCatchLogged(catchData)
      } else {
        console.error('Failed to save catch to database')
        
        // Add species configuration for map markers even for failed saves
        const speciesColors = {
          musky: '#22c55e',
          walleye: '#f97316',
          bass: '#f97316',
          pike: '#dc2626',
          perch: '#eab308',
          bluegill: '#3b82f6',
          salmon: '#ec4899',
          trout: '#06b6d4'
        }
        
        const speciesEmojis = {
          musky: '🐟',
          walleye: '🐠',
          bass: '🎣',
          pike: '🐡',
          perch: '🐟',
          bluegill: '🐟',
          salmon: '🍣',
          trout: '🐟'
        }
        
        catchData.speciesConfig = {
          emoji: speciesEmojis[formData.species] || '🐟',
          color: speciesColors[formData.species] || '#22c55e'
        }
        
        // Still call onCatchLogged for local display, but with temp ID
        onCatchLogged(catchData)
        alert('Catch logged locally, but could not save to database. Please check your connection.')
        return
      }
      
      // Reset form
      setFormData({
        species: 'musky',
        length: '',
        weight: '',
        latitude: '',
        longitude: '',
        depth: '',
        lureType: '',
        photo: null
      })
      setIsLogging(false)
      
      alert('Catch logged successfully! 🎣')
    } catch (error) {
      console.error('Error logging catch:', error)
      alert('Error logging catch. Please try again.')
    }
  }

  if (!isLogging) {
    return (
      <div className="card" data-catch-logger>
        <h3 style={{ color: '#1e3a8a', marginBottom: '15px' }}>🎣 Log a Catch</h3>
        <div style={{ textAlign: 'center', padding: '30px' }}>
          <p style={{ marginBottom: '20px', color: '#64748b' }}>
            Ready to log your next catch?
          </p>
          <button 
            onClick={() => setIsLogging(true)}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            Start Logging
          </button>
          <div style={{ marginTop: '15px', fontSize: '0.8rem', color: '#64748b' }}>
            Or click anywhere on the map to log at that location
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ color: '#1e3a8a' }}>🎣 Log Your Catch</h3>
        <button 
          onClick={() => setIsLogging(false)}
          style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Species Selection */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
            Species *
          </label>
          <select
            name="species"
            value={formData.species}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '16px'
            }}
            required
          >
            {species.map(s => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Length and Weight */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
              Length (inches) *
            </label>
            <input
              type="number"
              name="length"
              value={formData.length}
              onChange={handleInputChange}
              placeholder="42"
              step="0.1"
              min="0"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px'
              }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
              Weight (lbs) *
            </label>
            <input
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleInputChange}
              placeholder="18.5"
              step="0.1"
              min="0"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px'
              }}
              required
            />
          </div>
        </div>

        {/* Location */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
            Location * 
            <span style={{ 
              fontSize: '0.8rem', 
              color: formData.latitude && formData.longitude ? '#059669' : '#dc2626',
              fontWeight: 'normal',
              marginLeft: '8px'
            }}>
              {formData.latitude && formData.longitude ? '✓ Location Set' : '⚠ Use GPS (map temporarily disabled)'}
            </span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
            <input
              type="number"
              name="latitude"
              value={formData.latitude}
              onChange={handleInputChange}
              placeholder="42.4583"
              step="any"
              style={{
                padding: '10px',
                border: `2px solid ${formData.latitude ? '#059669' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '16px',
                backgroundColor: formData.latitude ? '#f0fdf4' : 'white'
              }}
              required
            />
            <input
              type="number"
              name="longitude"
              value={formData.longitude}
              onChange={handleInputChange}
              placeholder="-82.7167"
              step="any"
              style={{
                padding: '10px',
                border: `2px solid ${formData.longitude ? '#059669' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '16px',
                backgroundColor: formData.longitude ? '#f0fdf4' : 'white'
              }}
              required
            />
            <button
              type="button"
              onClick={getCurrentLocation}
              className="btn btn-secondary"
              style={{ padding: '10px 12px', fontSize: '0.8rem' }}
            >
              📍 GPS
            </button>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '5px' }}>
            Latitude, Longitude (or click map/use GPS)
          </div>
        </div>

        {/* Optional Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
              Depth (feet)
            </label>
            <input
              type="number"
              name="depth"
              value={formData.depth}
              onChange={handleInputChange}
              placeholder="12"
              min="0"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
              Lure Type
            </label>
            <select
              name="lureType"
              value={formData.lureType}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px'
              }}
            >
              <option value="">Select lure...</option>
              {lureTypes.map(lure => (
                <option key={lure} value={lure}>{lure}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Photo Upload */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
            Photo
          </label>
          <input
            type="file"
            name="photo"
            onChange={handleInputChange}
            accept="image/*"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '16px'
            }}
          />
        </div>

        {/* Catch Time Notice */}
        <div style={{ 
          marginBottom: '15px', 
          padding: '10px', 
          background: '#f0f9ff', 
          borderRadius: '6px',
          border: '1px solid #e0f2fe',
          fontSize: '0.9rem',
          color: '#0369a1'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>📅 Catch Time</div>
          <div>Will be automatically set to: {new Date().toLocaleString()}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
            Time will be captured exactly when you click "Log Catch"
          </div>
        </div>

        {/* Submit Button */}
        <button 
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%' }}
        >
          Log Catch 🎣
        </button>
      </form>

      {/* Current Conditions Display */}
      {currentConditions && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          background: '#f8fafc', 
          borderRadius: '8px',
          fontSize: '0.9rem'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Current Conditions:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
            <div>Wind: {currentConditions.windSpeed}mph {currentConditions.windDirection}</div>
            <div>Air: {currentConditions.temperature}°F</div>
            <div>Water: {currentConditions.waterTemp}°F</div>
            <div>Pressure: {currentConditions.pressure}"</div>
          </div>
        </div>
      )}
    </div>
  )
}