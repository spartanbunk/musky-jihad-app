'use client'

import { useState, useEffect, useRef } from 'react'
import LocationService from '../utils/locationService'

export default function VoiceActivation() {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [lastCommand, setLastCommand] = useState('')
  const recognitionRef = useRef(null)

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setIsSupported(true)
      
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'
      
      recognition.onstart = () => {
        console.log('🎤 Voice recognition started')
        setIsListening(true)
      }
      
      recognition.onend = () => {
        console.log('🎤 Voice recognition ended')
        setIsListening(false)
      }
      
      recognition.onresult = async (event) => {
        const command = event.results[0][0].transcript.toLowerCase()
        console.log('🎤 Voice command received:', command)
        setLastCommand(command)
        
        // Check for fish marking commands
        if (command.includes('mark fish') || 
            command.includes('log fish') || 
            command.includes('catch') ||
            command.includes('mark a fish') ||
            command.includes('log a catch')) {
          
          console.log('🎣 Voice command matched: Mark Fish')
          
          try {
            await LocationService.markFishLocation()
            console.log('🎣 Voice-activated fish marking successful')
          } catch (error) {
            console.error('🎣 Voice-activated fish marking failed:', error)
          }
        }
      }
      
      recognition.onerror = (event) => {
        console.error('🎤 Voice recognition error:', event.error)
        setIsListening(false)
      }
      
      // Auto-start listening when page loads (optional)
      // recognition.start()
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }

  // Global voice command trigger - can be called from anywhere
  useEffect(() => {
    const handleGlobalVoiceCommand = () => {
      if (isSupported && !isListening) {
        startListening()
      }
    }

    window.addEventListener('triggerVoiceCommand', handleGlobalVoiceCommand)
    
    return () => {
      window.removeEventListener('triggerVoiceCommand', handleGlobalVoiceCommand)
    }
  }, [isSupported, isListening])

  if (!isSupported) {
    return (
      <div style={{ 
        padding: '10px',
        background: '#fee2e2',
        border: '1px solid #fecaca',
        borderRadius: '6px',
        fontSize: '0.9rem',
        color: '#991b1b'
      }}>
        🎤 Voice commands not supported in this browser
      </div>
    )
  }

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <h3 style={{ color: '#1e3a8a', marginBottom: '15px' }}>🎤 Voice Commands</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={isListening ? stopListening : startListening}
          className={`btn ${isListening ? 'btn-danger' : 'btn-primary'}`}
          style={{ width: '100%' }}
        >
          {isListening ? '🔴 Stop Listening' : '🎤 Start Voice Commands'}
        </button>
      </div>
      
      <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '15px' }}>
        <div><strong>Say:</strong></div>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          <li>"Mark fish" or "Mark a fish"</li>
          <li>"Log fish" or "Log a catch"</li>
          <li>"Catch" (simple command)</li>
        </ul>
      </div>
      
      {lastCommand && (
        <div style={{ 
          padding: '10px',
          background: '#f0f9ff',
          border: '1px solid #e0f2fe',
          borderRadius: '6px',
          fontSize: '0.9rem'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Last Command:</div>
          <div style={{ color: '#0369a1' }}>"{lastCommand}"</div>
        </div>
      )}
      
      {isListening && (
        <div style={{ 
          padding: '10px',
          background: '#dcfce7',
          border: '1px solid #bbf7d0',
          borderRadius: '6px',
          textAlign: 'center',
          color: '#166534',
          fontWeight: 'bold'
        }}>
          🎤 Listening for commands...
        </div>
      )}
    </div>
  )
}

// Global function to trigger voice commands (can be called from anywhere)
if (typeof window !== 'undefined') {
  window.triggerVoiceCommand = () => {
    const event = new CustomEvent('triggerVoiceCommand')
    window.dispatchEvent(event)
  }
}