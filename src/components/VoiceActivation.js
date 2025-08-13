'use client'

import { useState, useEffect, useRef } from 'react'
import LocationService from '../utils/locationService'
import { useAuth } from '../contexts/AuthContext'
import config from '../config/api'
import { 
  parseSpecies, 
  parseLure, 
  parseNumberFromSpeech, 
  isCatchConfirmation, 
  isMarkFishCommand 
} from '../utils/speechProcessing'

// Voice states for the complete fishing workflow
const VOICE_STATES = {
  IDLE: 'idle',
  COLLECTING_DEPTH: 'collecting_depth',
  WAITING_FOR_CATCH: 'waiting_for_catch',
  COLLECTING_SPECIES: 'collecting_species',
  COLLECTING_LENGTH: 'collecting_length',
  COLLECTING_WEIGHT: 'collecting_weight',
  COLLECTING_LURE: 'collecting_lure',
  TAKING_PHOTO: 'taking_photo',
  COMPLETED: 'completed'
}

// Voice prompts for each state
const VOICE_PROMPTS = {
  ASK_DEPTH_FIRST: "Nice Job! What depth are you fishing?",
  DEPTH_CONFIRMED: "Fish marked, now go catch it!",
  CHECK_CATCH: "Did you get him?",
  CATCH_CONFIRMED: "Great job guys! What species is it?",
  ASK_LENGTH: "How long is it?",
  ASK_WEIGHT: "What's the weight?",
  ASK_LURE: "What lure did you use?",
  PHOTO_TIME: "Ok guys, let's get a picture of that lunker!",
  WORKFLOW_COMPLETE: "Perfect! Your catch has been saved."
}

export default function VoiceActivation() {
  const { authenticatedFetch } = useAuth()
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [lastCommand, setLastCommand] = useState('')
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [catchData, setCatchData] = useState({
    latitude: null,
    longitude: null,
    depth: '',
    species: '',
    length: '',
    weight: '',
    lureType: '',
    photoUrl: ''
  })
  const [retryCounters, setRetryCounters] = useState({
    depth: 0,
    species: 0,
    length: 0,
    weight: 0,
    lure: 0
  })
  const [lastHeardCommand, setLastHeardCommand] = useState('')
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)
  const retryTimerRef = useRef(null)
  const voiceStateRef = useRef(VOICE_STATES.IDLE)

  // Keep ref in sync with state
  useEffect(() => {
    voiceStateRef.current = voiceState
  }, [voiceState])

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
        const confidence = event.results[0][0].confidence
        console.log(`🎤 Voice command received (${voiceStateRef.current}):`, command, `confidence: ${confidence}`)
        setLastCommand(command)
        
        await handleVoiceResult(command, confidence)
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
      clearTimer()
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // Clear any existing timers
  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }

  // Speak text using speech synthesis
  const speak = async (text) => {
    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        setIsSpeaking(true)
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.9
        utterance.pitch = 1.0
        utterance.volume = 0.8
        
        utterance.onend = () => {
          setIsSpeaking(false)
          resolve()
        }
        
        utterance.onerror = () => {
          setIsSpeaking(false)
          resolve()
        }
        
        window.speechSynthesis.speak(utterance)
      } else {
        setIsSpeaking(false)
        resolve()
      }
    })
  }

  // Start retry timer for field re-prompting
  const startRetryTimer = (fieldType, prompt, maxRetries = 3) => {
    clearTimeout(retryTimerRef.current)
    
    retryTimerRef.current = setTimeout(async () => {
      const currentRetries = retryCounters[fieldType] || 0
      
      if (currentRetries < maxRetries) {
        setRetryCounters(prev => ({
          ...prev,
          [fieldType]: currentRetries + 1
        }))
        
        await speak(`I didn't hear that clearly. ${prompt}`)
        startListening()
        
        // Set another retry timer
        startRetryTimer(fieldType, prompt, maxRetries)
      } else {
        await speak(`I'm having trouble hearing the ${fieldType}. Let's continue and you can enter it manually later.`)
        // Move to next field or complete workflow
        moveToNextField()
      }
    }, 20000) // 20 seconds
  }

  // Move to next field when max retries reached
  const moveToNextField = () => {
    switch (voiceState) {
      case VOICE_STATES.COLLECTING_DEPTH:
        setVoiceState(VOICE_STATES.WAITING_FOR_CATCH)
        speak(VOICE_PROMPTS.DEPTH_CONFIRMED)
        break
      case VOICE_STATES.COLLECTING_SPECIES:
        setVoiceState(VOICE_STATES.COLLECTING_LENGTH)
        speak(VOICE_PROMPTS.ASK_LENGTH)
        startListening()
        break
      case VOICE_STATES.COLLECTING_LENGTH:
        setVoiceState(VOICE_STATES.COLLECTING_WEIGHT)
        speak(VOICE_PROMPTS.ASK_WEIGHT)
        startListening()
        break
      case VOICE_STATES.COLLECTING_WEIGHT:
        setVoiceState(VOICE_STATES.COLLECTING_LURE)
        speak(VOICE_PROMPTS.ASK_LURE)
        startListening()
        break
      case VOICE_STATES.COLLECTING_LURE:
        setVoiceState(VOICE_STATES.TAKING_PHOTO)
        speak(VOICE_PROMPTS.PHOTO_TIME)
        break
    }
  }

  // Handle voice recognition results based on current state
  const handleVoiceResult = async (transcript, confidence) => {
    const currentState = voiceStateRef.current
    console.log(`Voice result in state ${currentState}:`, transcript)
    console.log('Current voice state:', currentState, 'All states:', VOICE_STATES)
    
    switch (currentState) {
      case VOICE_STATES.IDLE:
        if (isMarkFishCommand(transcript)) {
          await handleMarkFish()
        } else {
          console.log('Not a mark fish command, waiting for "Mark Fish"')
        }
        break
        
      case VOICE_STATES.COLLECTING_DEPTH:
        await handleDepthInput(transcript)
        break
        
      case VOICE_STATES.WAITING_FOR_CATCH:
        if (isCatchConfirmation(transcript)) {
          await handleCatchConfirmed()
        }
        break
        
      case VOICE_STATES.COLLECTING_SPECIES:
        await handleSpeciesInput(transcript)
        break
        
      case VOICE_STATES.COLLECTING_LENGTH:
        await handleLengthInput(transcript)
        break
        
      case VOICE_STATES.COLLECTING_WEIGHT:
        await handleWeightInput(transcript)
        break
        
      case VOICE_STATES.COLLECTING_LURE:
        await handleLureInput(transcript)
        break
        
      default:
        console.log('Voice input ignored in current state')
    }
  }

  // Mark fish location and start depth collection
  const handleMarkFish = async () => {
    console.log('🎣 Mark Fish triggered! Starting workflow...')
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        })
      })
      
      console.log('📍 Location captured:', position.coords.latitude, position.coords.longitude)
      
      setCatchData(prev => ({
        ...prev,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }))
      
      // Immediately ask for depth
      console.log('🔄 Setting state to COLLECTING_DEPTH')
      setVoiceState(VOICE_STATES.COLLECTING_DEPTH)
      
      console.log('🗣️ Speaking depth prompt...')
      await speak(VOICE_PROMPTS.ASK_DEPTH_FIRST)
      
      console.log('🎤 Restarting recognition for depth collection...')
      // Always restart recognition after speaking
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          // Ignore if already stopped
        }
        setTimeout(() => {
          recognitionRef.current.start()
        }, 500)  // Small delay after speaking
      }
      
      // Start retry timer for depth
      startRetryTimer('depth', VOICE_PROMPTS.ASK_DEPTH_FIRST)
      
    } catch (error) {
      console.error('Unable to get location:', error)
      await speak('Unable to get location. Please try again.')
    }
  }

  // Handle depth input
  const handleDepthInput = async (transcript) => {
    setLastHeardCommand(transcript)
    clearTimeout(retryTimerRef.current)
    
    const parsed = parseNumberFromSpeech(transcript)
    console.log('Depth parsing result:', { transcript, parsed })
    
    if (parsed && parsed.value > 0) {
      const depthValue = `${parsed.value}`
      setCatchData(prev => ({ ...prev, depth: depthValue }))
      
      console.log('Depth captured:', depthValue)
      
      // Audio confirmation
      await speak(`I heard ${depthValue} feet for depth.`)
      
      // Reset retry counter for this field
      setRetryCounters(prev => ({ ...prev, depth: 0 }))
      
      // Dispatch partial data to CatchLogger to show immediate feedback
      window.dispatchEvent(new CustomEvent('voiceWorkflowComplete', {
        detail: {
          latitude: catchData.latitude,
          longitude: catchData.longitude,
          depth: depthValue
        }
      }))
      
      setVoiceState(VOICE_STATES.WAITING_FOR_CATCH)
      await speak(VOICE_PROMPTS.DEPTH_CONFIRMED)
      
      // Set 30-second timer
      timerRef.current = setTimeout(async () => {
        await speak(VOICE_PROMPTS.CHECK_CATCH)
        if (recognitionRef.current && !isListening) {
          recognitionRef.current.start()
        }
      }, 30000)
      
    } else {
      console.log('Depth parsing failed:', { transcript, parsed })
      await speak("I didn't catch that depth. Could you repeat it?")
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
      // Start retry timer
      startRetryTimer('depth', VOICE_PROMPTS.ASK_DEPTH_FIRST)
    }
  }

  // Handle catch confirmation
  const handleCatchConfirmed = async () => {
    clearTimer()
    setVoiceState(VOICE_STATES.COLLECTING_SPECIES)
    await speak(VOICE_PROMPTS.CATCH_CONFIRMED)
    
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start()
    }
    
    // Start retry timer for species
    startRetryTimer('species', VOICE_PROMPTS.CATCH_CONFIRMED)
  }

  // Handle species input
  const handleSpeciesInput = async (transcript) => {
    setLastHeardCommand(transcript)
    clearTimeout(retryTimerRef.current)
    
    const species = parseSpecies(transcript)
    if (species) {
      setCatchData(prev => ({ ...prev, species }))
      
      // Audio confirmation
      await speak(`I heard ${species} for the species.`)
      
      // Reset retry counter for this field
      setRetryCounters(prev => ({ ...prev, species: 0 }))
      
      setVoiceState(VOICE_STATES.COLLECTING_LENGTH)
      await speak(VOICE_PROMPTS.ASK_LENGTH)
      
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
      // Start retry timer for next field
      startRetryTimer('length', VOICE_PROMPTS.ASK_LENGTH)
    } else {
      await speak("I didn't recognize that species. Could you repeat it?")
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
      // Start retry timer
      startRetryTimer('species', VOICE_PROMPTS.CATCH_CONFIRMED)
    }
  }

  // Handle length input
  const handleLengthInput = async (transcript) => {
    setLastHeardCommand(transcript)
    clearTimeout(retryTimerRef.current)
    
    const parsed = parseNumberFromSpeech(transcript)
    if (parsed && parsed.value > 0) {
      const lengthValue = `${parsed.value}`
      setCatchData(prev => ({ ...prev, length: lengthValue }))
      
      // Audio confirmation
      await speak(`I heard ${lengthValue} inches for the length.`)
      
      // Reset retry counter for this field
      setRetryCounters(prev => ({ ...prev, length: 0 }))
      
      setVoiceState(VOICE_STATES.COLLECTING_WEIGHT)
      await speak(VOICE_PROMPTS.ASK_WEIGHT)
      
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
      // Start retry timer for next field
      startRetryTimer('weight', VOICE_PROMPTS.ASK_WEIGHT)
    } else {
      await speak("I didn't catch that length. Could you repeat it?")
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
      // Start retry timer
      startRetryTimer('length', VOICE_PROMPTS.ASK_LENGTH)
    }
  }

  // Handle weight input
  const handleWeightInput = async (transcript) => {
    setLastHeardCommand(transcript)
    clearTimeout(retryTimerRef.current)
    
    const parsed = parseNumberFromSpeech(transcript)
    if (parsed && parsed.value > 0) {
      const weightValue = `${parsed.value}`
      setCatchData(prev => ({ ...prev, weight: weightValue }))
      
      // Audio confirmation
      await speak(`I heard ${weightValue} pounds for the weight.`)
      
      // Reset retry counter for this field
      setRetryCounters(prev => ({ ...prev, weight: 0 }))
      
      setVoiceState(VOICE_STATES.COLLECTING_LURE)
      await speak(VOICE_PROMPTS.ASK_LURE)
      
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
      // Start retry timer for next field
      startRetryTimer('lure', VOICE_PROMPTS.ASK_LURE)
    } else {
      await speak("I didn't catch that weight. Could you repeat it?")
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
      // Start retry timer
      startRetryTimer('weight', VOICE_PROMPTS.ASK_WEIGHT)
    }
  }

  // Handle lure input and trigger photo capture
  const handleLureInput = async (transcript) => {
    setLastHeardCommand(transcript)
    clearTimeout(retryTimerRef.current)
    
    const lure = parseLure(transcript)
    if (lure) {
      setCatchData(prev => ({ ...prev, lureType: lure }))
      
      // Audio confirmation
      await speak(`I heard ${lure} for the lure type.`)
      
      // Reset retry counter for this field
      setRetryCounters(prev => ({ ...prev, lure: 0 }))
      
      setVoiceState(VOICE_STATES.TAKING_PHOTO)
      await speak(VOICE_PROMPTS.PHOTO_TIME)
      // Photo capture will be handled by the UI buttons
    } else {
      await speak("I didn't recognize that lure. Could you repeat it?")
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
      // Start retry timer
      startRetryTimer('lure', VOICE_PROMPTS.ASK_LURE)
    }
  }

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
        setVoiceState(VOICE_STATES.COMPLETED)
        await speak(VOICE_PROMPTS.WORKFLOW_COMPLETE)
        
        // Dispatch event to open CatchLogger modal with voice data
        const finalCatchData = {
          latitude: catchData.latitude,
          longitude: catchData.longitude,
          species: catchData.species,
          length: catchData.length,
          weight: catchData.weight,
          depth: catchData.depth,
          lureType: catchData.lureType,
          photoUrl: photoUrl
        }
        
        window.dispatchEvent(new CustomEvent('voiceWorkflowComplete', {
          detail: finalCatchData
        }))
        
        // Reset after short delay
        setTimeout(() => {
          resetVoiceWorkflow()
        }, 3000)
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

  // Reset the voice workflow
  const resetVoiceWorkflow = () => {
    clearTimer()
    setVoiceState(VOICE_STATES.IDLE)
    setCatchData({
      latitude: null,
      longitude: null,
      depth: '',
      species: '',
      length: '',
      weight: '',
      lureType: '',
      photoUrl: ''
    })
    setRetryCounters({
      depth: 0,
      species: 0,
      length: 0,
      weight: 0,
      lure: 0
    })
    setLastCommand('')
    setLastHeardCommand('')
    setSubmitError(null)
    setIsSubmitting(false)
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      // Reset workflow if starting fresh
      if (voiceState === VOICE_STATES.IDLE) {
        resetVoiceWorkflow()
      }
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
    // Also stop speech synthesis
    if (window.speechSynthesis && isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
    clearTimer()  // Clear timers but don't reset workflow
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
          disabled={isSpeaking}
        >
          {isListening ? '🔴 Stop Voice Workflow' : '🎤 Start Voice Commands'}
        </button>
        {voiceState !== VOICE_STATES.IDLE && voiceState !== VOICE_STATES.TAKING_PHOTO && (
          <button 
            onClick={resetVoiceWorkflow}
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '10px' }}
            disabled={isSpeaking}
          >
            🔄 Reset Workflow
          </button>
        )}
        
        {/* Photo Capture Buttons */}
        {voiceState === VOICE_STATES.TAKING_PHOTO && !isSubmitting && (
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
            <button
              onClick={handlePhotoCapture}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              📸 Take Photo
            </button>
            <button
              onClick={handleSkipPhoto}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              Skip Photo
            </button>
          </div>
        )}
        
        {/* Submission Status */}
        {isSubmitting && (
          <div style={{
            marginTop: '10px',
            padding: '10px',
            background: '#f59e0b',
            color: 'white',
            borderRadius: '6px',
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            💾 Saving catch...
          </div>
        )}
      </div>
      
      <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '15px' }}>
        <div><strong>Say:</strong> "Mark fish" to start full voice workflow</div>
        {voiceState !== VOICE_STATES.IDLE && (
          <div style={{ 
            marginTop: '10px',
            padding: '10px',
            background: '#f0f9ff',
            border: '1px solid #e0f2fe',
            borderRadius: '6px',
            fontWeight: 'bold',
            color: '#0369a1'
          }}>
            {voiceState === VOICE_STATES.COLLECTING_DEPTH && "🌊 Listening for depth..."}
            {voiceState === VOICE_STATES.WAITING_FOR_CATCH && "⏰ Waiting for your catch..."}
            {voiceState === VOICE_STATES.COLLECTING_SPECIES && "🐟 What species is it?"}
            {voiceState === VOICE_STATES.COLLECTING_LENGTH && "📏 How long is it?"}
            {voiceState === VOICE_STATES.COLLECTING_WEIGHT && "⚖️ What's the weight?"}
            {voiceState === VOICE_STATES.COLLECTING_LURE && "🎣 What lure did you use?"}
            {voiceState === VOICE_STATES.TAKING_PHOTO && "📸 Ready for photo!"}
            {voiceState === VOICE_STATES.COMPLETED && "✅ Catch saved successfully!"}
          </div>
        )}
        {/* Voice Data Collection Progress */}
        {(voiceState !== VOICE_STATES.IDLE || Object.keys(catchData).some(key => catchData[key] && key !== 'latitude' && key !== 'longitude')) && (
          <div style={{
            marginTop: '10px',
            padding: '15px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            fontSize: '0.9rem'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#065f46' }}>Voice Data Collection Progress:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: catchData.latitude && catchData.longitude ? '#16a34a' : '#64748b' }}>
                  {catchData.latitude && catchData.longitude ? '✅' : '⭕'}
                </span>
                <span style={{ color: catchData.latitude && catchData.longitude ? '#065f46' : '#64748b' }}>
                  Location: {catchData.latitude && catchData.longitude ? 'Captured' : 'Pending'}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: catchData.depth ? '#16a34a' : '#64748b' }}>
                  {catchData.depth ? '✅' : '⭕'}
                </span>
                <span style={{ color: catchData.depth ? '#065f46' : '#64748b' }}>
                  Depth: {catchData.depth ? `${catchData.depth} ft` : 'Pending'}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: catchData.species ? '#16a34a' : '#64748b' }}>
                  {catchData.species ? '✅' : '⭕'}
                </span>
                <span style={{ color: catchData.species ? '#065f46' : '#64748b' }}>
                  Species: {catchData.species || 'Pending'}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: catchData.length ? '#16a34a' : '#64748b' }}>
                  {catchData.length ? '✅' : '⭕'}
                </span>
                <span style={{ color: catchData.length ? '#065f46' : '#64748b' }}>
                  Length: {catchData.length ? `${catchData.length}"` : 'Pending'}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: catchData.weight ? '#16a34a' : '#64748b' }}>
                  {catchData.weight ? '✅' : '⭕'}
                </span>
                <span style={{ color: catchData.weight ? '#065f46' : '#64748b' }}>
                  Weight: {catchData.weight ? `${catchData.weight} lbs` : 'Pending'}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: catchData.lureType ? '#16a34a' : '#64748b' }}>
                  {catchData.lureType ? '✅' : '⭕'}
                </span>
                <span style={{ color: catchData.lureType ? '#065f46' : '#64748b' }}>
                  Lure: {catchData.lureType || 'Pending'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {(lastCommand || lastHeardCommand) && (
        <div style={{ 
          padding: '10px',
          background: '#f0f9ff',
          border: '1px solid #e0f2fe',
          borderRadius: '6px',
          fontSize: '0.9rem'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Voice Recognition:</div>
          {lastCommand && <div style={{ color: '#0369a1', marginBottom: '5px' }}>Last Command: "{lastCommand}"</div>}
          {lastHeardCommand && <div style={{ color: '#059669' }}>Last Heard: "{lastHeardCommand}"</div>}
        </div>
      )}
      
      {/* Retry Status Display */}
      {Object.values(retryCounters).some(count => count > 0) && (
        <div style={{
          marginTop: '10px',
          padding: '10px',
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '6px',
          fontSize: '0.9rem'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#92400e' }}>Retry Status:</div>
          {retryCounters.depth > 0 && <div>Depth: {retryCounters.depth}/3 attempts</div>}
          {retryCounters.species > 0 && <div>Species: {retryCounters.species}/3 attempts</div>}
          {retryCounters.length > 0 && <div>Length: {retryCounters.length}/3 attempts</div>}
          {retryCounters.weight > 0 && <div>Weight: {retryCounters.weight}/3 attempts</div>}
          {retryCounters.lure > 0 && <div>Lure: {retryCounters.lure}/3 attempts</div>}
        </div>
      )}
      
      {/* Submit Error Display */}
      {submitError && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid #ef4444',
          borderRadius: '6px',
          color: '#991b1b'
        }}>
          ❌ Submit Error: {submitError}
        </div>
      )}
      
      {(isListening || isSpeaking) && (
        <div style={{ 
          padding: '10px',
          background: isSpeaking ? '#fef3c7' : '#dcfce7',
          border: `1px solid ${isSpeaking ? '#f59e0b' : '#bbf7d0'}`,
          borderRadius: '6px',
          textAlign: 'center',
          color: isSpeaking ? '#92400e' : '#166534',
          fontWeight: 'bold'
        }}>
          {isSpeaking ? '🗣️ Speaking...' : '🎤 Listening for commands...'}
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