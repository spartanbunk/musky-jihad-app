'use client'

import { useState, useEffect } from 'react'

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
    'musky', 'walleye', 'bass', 'pike', 'perch', 'salmon', 'trout'
  ]

  const lureTypes = [
    'Bucktail', 'Crankbait', 'Jerkbait', 'Topwater', 'Soft Plastic', 
    'Spinnerbait', 'Jig', 'Live Bait', 'Trolling Spoon', 'Other'
  ]

  useEffect(() => {
    // Listen for map clicks to auto-fill location
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

    window.addEventListener('mapClick', handleMapClick)
    return () => window.removeEventListener('mapClick', handleMapClick)
  }, [isLogging])

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          }))
        },
        (error) => {
          console.error('Error getting location:', error)
          alert('Unable to get current location. Please enter coordinates manually or click on the map.')
        }
      )
    } else {
      alert('Geolocation is not supported by this browser.')
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
    
    if (!formData.length || !formData.weight || !formData.latitude || !formData.longitude) {
      alert('Please fill in all required fields')
      return
    }

    const catchData = {
      id: Date.now(), // Temporary ID - will be replaced by database
      species: formData.species,
      length: parseFloat(formData.length),
      weight: parseFloat(formData.weight),
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      depth: formData.depth ? parseFloat(formData.depth) : null,
      lureType: formData.lureType,
      catchTime: new Date().toISOString(),
      conditions: currentConditions || {},
      photo: formData.photo ? URL.createObjectURL(formData.photo) : null
    }

    try {
      // Here you would normally send to your API
      // await fetch('/api/catches', { method: 'POST', body: catchData })
      
      onCatchLogged(catchData)
      
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
      <div className="card">
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
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px'
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
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px'
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