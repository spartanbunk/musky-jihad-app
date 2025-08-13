'use client'

import { useState } from 'react'
import { useVoiceLogger } from '../hooks/useVoiceLogger'
import { useAuth } from '../contexts/AuthContext'
import config from '../config/api'

export default function VoiceLogger({ onCatchLogged, onClose }) {
  const { authenticatedFetch } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  
  const {
    voiceState,
    isListening,
    isSpeaking,
    catchData,
    error,
    voiceSupported,
    startListening,
    stop,
    reset,
    triggerMarkFish,
    isIdle,
    isWaitingForCatch,
    isCollectingData,
    isReadyForPhoto
  } = useVoiceLogger()

  // Handle photo capture
  const handlePhotoCapture = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'camera'
    
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (file) {
        await uploadAndSubmitCatch(file)
      }
    }
    
    input.click()
  }

  // Upload photo and submit catch
  const uploadAndSubmitCatch = async (photoFile) => {
    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      let photoUrl = null
      
      if (photoFile) {
        // Upload photo
        const formData = new FormData()
        formData.append('photo', photoFile)
        
        const uploadResponse = await fetch(config.api.endpoints.uploads.catchPhoto, {
          method: 'POST',
          body: formData
        })
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          photoUrl = `${config.api.baseUrl}${uploadResult.url}`
        }
      }
      
      // Submit catch data
      const catchPayload = {
        latitude: catchData.latitude,
        longitude: catchData.longitude,
        species: catchData.species,
        length: parseFloat(catchData.length) || null,
        weight: parseFloat(catchData.weight) || null,
        depth: parseFloat(catchData.depth) || null,
        lureType: catchData.lureType,
        photoUrl: photoUrl,
        catchTime: new Date().toISOString()
      }
      
      const response = await authenticatedFetch(config.api.endpoints.catches.base, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(catchPayload)
      })
      
      if (response.ok) {
        const newCatch = await response.json()
        if (onCatchLogged) {
          onCatchLogged(newCatch)
        }
        reset()
        if (onClose) {
          onClose()
        }
      } else {
        throw new Error('Failed to save catch')
      }
      
    } catch (error) {
      console.error('Error submitting catch:', error)
      setSubmitError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Skip photo and submit without it
  const handleSkipPhoto = async () => {
    await uploadAndSubmitCatch(null)
  }

  // Get current state description
  const getStateDescription = () => {
    switch (voiceState) {
      case 'idle':
        return 'Say "Mark Fish" to start'
      case 'collecting_depth':
        return 'Listening for depth...'
      case 'waiting_for_catch':
        return 'Waiting for your catch...'
      case 'collecting_species':
        return 'What species is it?'
      case 'collecting_length':
        return 'How long is it?'
      case 'collecting_weight':
        return 'What\'s the weight?'
      case 'collecting_lure':
        return 'What lure did you use?'
      case 'taking_photo':
        return 'Ready for photo!'
      default:
        return 'Voice logger ready'
    }
  }

  if (!voiceSupported) {
    return (
      <div className="voice-logger" style={{ padding: '20px', textAlign: 'center' }}>
        <h3>Voice Logger Not Supported</h3>
        <p>Your browser doesn't support voice recognition. Try using Chrome on Android or Safari on iOS.</p>
        <button onClick={onClose} className="btn btn-secondary">
          Use Manual Entry
        </button>
      </div>
    )
  }

  return (
    <div className="voice-logger" style={{
      padding: '20px',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      color: 'white',
      borderRadius: '12px',
      margin: '20px 0'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Voice Fishing Logger</h3>
        <p style={{ margin: '0', opacity: 0.9 }}>{getStateDescription()}</p>
      </div>

      {/* Voice Status Indicators */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '20px' }}>
        <div style={{
          padding: '10px',
          background: isListening ? '#10b981' : '#6b7280',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isListening ? '#ffffff' : '#9ca3af',
            animation: isListening ? 'pulse 1s infinite' : 'none'
          }}></div>
          {isListening ? 'Listening...' : 'Not Listening'}
        </div>
        
        <div style={{
          padding: '10px',
          background: isSpeaking ? '#f59e0b' : '#6b7280',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isSpeaking ? '#ffffff' : '#9ca3af'
          }}></div>
          {isSpeaking ? 'Speaking...' : 'Silent'}
        </div>
      </div>

      {/* Catch Data Display */}
      {(catchData.latitude || catchData.depth || catchData.species) && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Catch Data:</h4>
          <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
            {catchData.latitude && (
              <div>Location: {catchData.latitude.toFixed(6)}, {catchData.longitude.toFixed(6)}</div>
            )}
            {catchData.depth && <div>Depth: {catchData.depth}</div>}
            {catchData.species && <div>Species: {catchData.species}</div>}
            {catchData.length && <div>Length: {catchData.length}</div>}
            {catchData.weight && <div>Weight: {catchData.weight}</div>}
            {catchData.lureType && <div>Lure: {catchData.lureType}</div>}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {isIdle && (
          <button
            onClick={triggerMarkFish}
            disabled={isSpeaking}
            style={{
              padding: '12px 24px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: isSpeaking ? 0.6 : 1
            }}
          >
            Mark Fish
          </button>
        )}

        {isListening && (
          <button
            onClick={stop}
            style={{
              padding: '12px 24px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Stop Listening
          </button>
        )}

        {isReadyForPhoto && !isSubmitting && (
          <>
            <button
              onClick={handlePhotoCapture}
              style={{
                padding: '12px 24px',
                background: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Take Photo
            </button>
            <button
              onClick={handleSkipPhoto}
              style={{
                padding: '12px 24px',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Skip Photo
            </button>
          </>
        )}

        {isSubmitting && (
          <div style={{
            padding: '12px 24px',
            background: '#f59e0b',
            borderRadius: '8px',
            fontSize: '16px'
          }}>
            Saving catch...
          </div>
        )}

        <button
          onClick={reset}
          disabled={isSubmitting}
          style={{
            padding: '12px 24px',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer',
            opacity: isSubmitting ? 0.6 : 1
          }}
        >
          Reset
        </button>

        {onClose && (
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '12px 24px',
              background: '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              opacity: isSubmitting ? 0.6 : 1
            }}
          >
            Close
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          color: '#fecaca'
        }}>
          Warning: {error}
        </div>
      )}

      {submitError && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          color: '#fecaca'
        }}>
          Submit Error: {submitError}
        </div>
      )}

      {/* CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}