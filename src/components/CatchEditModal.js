'use client'

import { useState, useEffect } from 'react'

export default function CatchEditModal({ catchData, onSave, onClose, onDelete }) {
  const [formData, setFormData] = useState({
    species: '',
    length: '',
    weight: '',
    depth: '',
    lureType: '',
    photo: null,
    photoPreview: null,
    locationNotes: ''
  })

  const species = [
    'musky', 'walleye', 'bass', 'pike', 'perch', 'salmon', 'trout'
  ]

  const lureTypes = [
    'Bucktail', 'Crankbait', 'Jerkbait', 'Topwater', 'Soft Plastic', 
    'Spinnerbait', 'Jig', 'Live Bait', 'Trolling Spoon', 'Other'
  ]

  useEffect(() => {
    if (catchData) {
      setFormData({
        species: catchData.species || '',
        length: catchData.length?.toString() || '',
        weight: catchData.weight?.toString() || '',
        depth: catchData.depth?.toString() || '',
        lureType: catchData.lureType || '',
        photo: null,
        photoPreview: catchData.photoUrl || null,
        locationNotes: catchData.locationNotes || ''
      })
    }
  }, [catchData])

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target
    
    if (type === 'file' && files[0]) {
      const file = files[0]
      setFormData(prev => ({
        ...prev,
        photo: file,
        photoPreview: URL.createObjectURL(file)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.length || !formData.weight) {
      alert('Length and weight are required')
      return
    }

    // Upload new photo if one was selected
    let photoUrl = catchData.photoUrl
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
      }
    }

    const updatedCatch = {
      ...catchData,
      species: formData.species,
      length: parseFloat(formData.length),
      weight: parseFloat(formData.weight),
      depth: formData.depth ? parseFloat(formData.depth) : null,
      lureType: formData.lureType,
      locationNotes: formData.locationNotes,
      photoUrl: photoUrl
    }

    onSave(updatedCatch)
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete this ${catchData.species} catch?`)) {
      onDelete(catchData.id)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  if (!catchData) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '25px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '15px'
        }}>
          <h2 style={{ color: '#1e3a8a', margin: 0, fontSize: '1.5rem' }}>
            🎣 Edit Catch Details
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Info Section */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#374151', marginBottom: '15px', fontSize: '1.1rem' }}>
              📊 Basic Information
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
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
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
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
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
                  Caught On
                </label>
                <div style={{
                  padding: '10px',
                  backgroundColor: '#f8fafc',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  color: '#64748b'
                }}>
                  {formatDate(catchData.catchTime)}
                </div>
              </div>
            </div>

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
                  step="0.1"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
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
                  step="0.1"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                  required
                />
              </div>
            </div>
          </div>

          {/* Fishing Details Section */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#374151', marginBottom: '15px', fontSize: '1.1rem' }}>
              🎯 Fishing Details
            </h3>
            
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
                  min="0"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
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
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
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

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
                Location Notes
              </label>
              <textarea
                name="locationNotes"
                value={formData.locationNotes}
                onChange={handleInputChange}
                placeholder="Add notes about the location, structure, conditions..."
                rows="3"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* Photo Section */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#374151', marginBottom: '15px', fontSize: '1.1rem' }}>
              📷 Photo
            </h3>
            
            {formData.photoPreview && (
              <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                <img 
                  src={formData.photoPreview} 
                  alt="Catch preview" 
                  style={{
                    maxWidth: '300px',
                    maxHeight: '200px',
                    borderRadius: '8px',
                    border: '2px solid #e2e8f0'
                  }}
                />
              </div>
            )}
            
            <input
              type="file"
              name="photo"
              onChange={handleInputChange}
              accept="image/*"
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Location Info */}
          {catchData.latitude && catchData.longitude && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#374151', marginBottom: '15px', fontSize: '1.1rem' }}>
                📍 Location
              </h3>
              <div style={{
                padding: '15px',
                backgroundColor: '#f8fafc',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                color: '#64748b',
                fontSize: '0.9rem'
              }}>
                <div><strong>Coordinates:</strong> {catchData.latitude.toFixed(6)}, {catchData.longitude.toFixed(6)}</div>
              </div>
            </div>
          )}

          {/* Environmental Conditions */}
          {catchData.conditions && Object.keys(catchData.conditions).length > 0 && (
            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ color: '#374151', marginBottom: '15px', fontSize: '1.1rem' }}>
                🌊 Environmental Conditions
              </h3>
              <div style={{
                padding: '15px',
                backgroundColor: '#f0f9ff',
                border: '2px solid #e0f2fe',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#0c4a6e'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {catchData.conditions.airTemperature && (
                    <div>🌡️ Air: {catchData.conditions.airTemperature}°F</div>
                  )}
                  {catchData.conditions.waterTemp && (
                    <div>🌊 Water: {catchData.conditions.waterTemp}°F</div>
                  )}
                  {catchData.conditions.windSpeed && (
                    <div>💨 Wind: {catchData.conditions.windSpeed}mph {catchData.conditions.windDirection}</div>
                  )}
                  {catchData.conditions.barometricPressure && (
                    <div>📊 Pressure: {catchData.conditions.barometricPressure}"</div>
                  )}
                  {catchData.conditions.cloudCover !== undefined && (
                    <div>☁️ Clouds: {catchData.conditions.cloudCover}%</div>
                  )}
                  {catchData.conditions.moonPhase && (
                    <div>🌙 Moon: {catchData.conditions.moonPhase}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '20px',
            borderTop: '2px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={handleDelete}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🗑️ Delete Catch
            </button>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                💾 Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}