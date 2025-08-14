'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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

// Helper functions for species configuration
const getSpeciesEmoji = (species) => {
  const speciesEmojis = {
    'musky': '🐊',
    'bass': '🐟',
    'walleye': '🟡',
    'pike': '🗲',
    'perch': '🟠',
    'bluegill': '🔵',
    'salmon': '🍣',
    'trout': '🌈',
    'crappie': '⚪'
  }
  return speciesEmojis[species] || '🐟'
}

const getSpeciesColor = (species) => {
  const speciesColors = {
    'musky': '#059669',
    'bass': '#22c55e', 
    'walleye': '#f59e0b',
    'pike': '#8b5cf6',
    'perch': '#f97316',
    'bluegill': '#3b82f6',
    'salmon': '#ec4899',
    'trout': '#10b981',
    'crappie': '#6b7280'
  }
  return speciesColors[species] || '#22c55e'
}

// Voice states for the complete fishing workflow
const VOICE_STATES = {
  IDLE: 'idle',
  COLLECTING_DEPTH: 'collecting_depth',
  CONFIRMING_DEPTH: 'confirming_depth',
  WAITING_FOR_CATCH: 'waiting_for_catch',
  COLLECTING_SPECIES: 'collecting_species',
  CONFIRMING_SPECIES: 'confirming_species',
  COLLECTING_LENGTH: 'collecting_length',
  CONFIRMING_LENGTH: 'confirming_length',
  COLLECTING_WEIGHT: 'collecting_weight',
  CONFIRMING_WEIGHT: 'confirming_weight',
  COLLECTING_LURE: 'collecting_lure',
  CONFIRMING_LURE: 'confirming_lure',
  TAKING_PHOTO: 'taking_photo',
  COMPLETED: 'completed'
}

// Voice prompts for each state
const VOICE_PROMPTS = {
  ASK_DEPTH_FIRST: "Nice Job! What depth are you fishing?",
  DEPTH_CONFIRMED: "Fish marked, now go catch it!",
  CHECK_CATCH: "Did you get him?",
  CATCH_CONFIRMED: "Great job guys! What species is it?",
  CATCH_FAILED: "Sorry about that, better luck next time!",
  MAX_RETRIES: "Let's try again later.",
  ASK_LENGTH: "How long is it?",
  ASK_WEIGHT: "What's the weight?",
  ASK_LURE: "What lure did you use?",
  PHOTO_TIME: "Ok guys, let's get a picture of that lunker!",
  WORKFLOW_COMPLETE: "Perfect! Your catch has been saved.",
  
  // Confirmation prompts
  CONFIRM_DEPTH: (value) => `Did you say ${value} feet for depth?`,
  CONFIRM_SPECIES: (value) => `Did you say ${value} for the species?`,
  CONFIRM_LENGTH: (value) => `Did you say ${value} inches for length?`,
  CONFIRM_WEIGHT: (value) => `Did you say ${value} pounds for weight?`,
  CONFIRM_LURE: (value) => `Did you say ${value} for the lure type?`,
  
  // Re-collection prompts
  RECOLLECT_DEPTH: "Let's try again. What depth are you fishing?",
  RECOLLECT_SPECIES: "Let's try again. What species is it?",
  RECOLLECT_LENGTH: "Let's try again. How long is it?",
  RECOLLECT_WEIGHT: "Let's try again. What's the weight?",
  RECOLLECT_LURE: "Let's try again. What lure did you use?"
}

export default function VoiceActivation({ currentConditions }) {
  console.log('🔄 VoiceActivation component loaded with enhanced confirmation features')
  console.log('🌡️ Weather conditions received:', currentConditions)
  const { authenticatedFetch } = useAuth()
  const [isListening, setIsListening] = useState(false)
  const [weatherLoaded, setWeatherLoaded] = useState(false)
  const [pendingVoiceStart, setPendingVoiceStart] = useState(false)
  
  // Track when weather data is available
  useEffect(() => {
    if (currentConditions && Object.keys(currentConditions).length > 0) {
      console.log('✅ Weather data loaded and ready for voice workflow')
      setWeatherLoaded(true)
      
      // Auto-start voice workflow if user tried to start before weather loaded
      if (pendingVoiceStart) {
        console.log('🔄 Auto-starting voice workflow after weather data loaded')
        setPendingVoiceStart(false)
        setTimeout(() => {
          speak("Weather data loaded! Let's start the voice workflow.")
          // Small delay to let speech finish before starting recognition
          setTimeout(() => {
            if (recognitionRef.current && !isListening) {
              try {
                recognitionRef.current.start()
                console.log('🎤 Auto-started recognition after weather load')
              } catch (error) {
                console.error('❌ Failed to auto-start recognition:', error)
              }
            }
          }, 2000)
        }, 500)
      }
    } else {
      console.log('⏳ Waiting for weather data...')
      setWeatherLoaded(false)
    }
  }, [currentConditions, pendingVoiceStart, isListening])
  
  // State recovery mechanism for refresh scenarios
  useEffect(() => {
    console.log('🔄 === STATE RECOVERY CHECK ===')
    
    // Check if we're recovering from a refresh
    const savedState = sessionStorage.getItem('voiceWorkflowState')
    if (savedState) {
      console.log('📦 Found saved voice workflow state:', savedState)
      const parsed = JSON.parse(savedState)
      
      // If we were in middle of workflow, reset to safe state
      if (parsed.voiceState && parsed.voiceState !== VOICE_STATES.IDLE) {
        console.log('⚠️ Detected incomplete workflow after refresh')
        console.log('⚠️ Previous state was:', parsed.voiceState)
        console.log('🔄 Resetting to safe IDLE state')
        
        // Clear the saved state
        sessionStorage.removeItem('voiceWorkflowState')
        
        // Notify user
        setTimeout(() => {
          speak("Voice session was interrupted. Please start over by saying 'mark fish'.")
        }, 1000)
      }
    }
    
    console.log('🔄 === END STATE RECOVERY CHECK ===')
  }, [])
  
  // Save state before unload for recovery
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('💾 Saving voice workflow state before unload...')
      const stateToSave = {
        voiceState: voiceStateRef.current,
        catchData: catchDataRef.current,
        tempData: tempDataRef.current,
        timestamp: new Date().toISOString()
      }
      sessionStorage.setItem('voiceWorkflowState', JSON.stringify(stateToSave))
      console.log('💾 State saved:', stateToSave)
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])
  
  // Helper function to get field display status with enhanced debugging
  const getFieldStatus = (confirmedValue, tempValue, unit = '', fieldName = '') => {
    console.log(`=== FIELD STATUS DEBUG (${fieldName}) ===`)
    console.log('Confirmed value:', confirmedValue)
    console.log('Temp value:', tempValue)
    console.log('Unit:', unit)
    
    let result
    if (confirmedValue) {
      result = {
        icon: '✅',
        color: '#16a34a',
        textColor: '#065f46',
        text: `${confirmedValue}${unit}`
      }
      console.log('Status: CONFIRMED ✅')
    } else if (tempValue) {
      result = {
        icon: '⏳',
        color: '#f59e0b',
        textColor: '#92400e',
        text: `${tempValue}${unit} (confirming)`
      }
      console.log('Status: CONFIRMING ⏳')
    } else {
      result = {
        icon: '⭕',
        color: '#64748b',
        textColor: '#64748b',
        text: 'Pending'
      }
      console.log('Status: PENDING ⭕')
    }
    
    console.log('Final result:', result)
    console.log(`=== END FIELD STATUS DEBUG (${fieldName}) ===`)
    return result
  }
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
  const [tempData, setTempData] = useState({
    depth: '',
    species: '',
    length: '',
    weight: '',
    lureType: ''
  })
  const [retryCounters, setRetryCounters] = useState({
    depth: 0,
    species: 0,
    length: 0,
    weight: 0,
    lure: 0,
    catchConfirmation: 0
  })
  const [forceUpdate, setForceUpdate] = useState(0)
  const [lastHeardCommand, setLastHeardCommand] = useState('')
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)
  const retryTimerRef = useRef(null)
  const voiceStateRef = useRef(VOICE_STATES.IDLE)
  
  // CRITICAL: Add refs to avoid stale closures in voice handlers
  // FIX: Initialize refs empty, not with initial state values
  const catchDataRef = useRef(catchData)
  const tempDataRef = useRef(tempData)

  // CRITICAL: Keep refs in sync with state - SINGLE SOURCE OF TRUTH
  // These effects ensure refs ALWAYS match current state
  useEffect(() => {
    console.log('🔄 Syncing voiceStateRef:', voiceState)
    voiceStateRef.current = voiceState
  }, [voiceState])
  
  useEffect(() => {
    console.log('🔄 Syncing catchDataRef:', catchData)
    catchDataRef.current = catchData
  }, [catchData])
  
  useEffect(() => {
    console.log('🔄 Syncing tempDataRef:', tempData)
    tempDataRef.current = tempData
  }, [tempData])
  
  // Helper to update voice state (no need to manually sync ref)
  const updateVoiceState = (newState) => {
    console.log(`📝 Updating voice state: ${voiceState} → ${newState}`)
    setVoiceState(newState)
    // Ref will be synced by useEffect automatically
  }

  // Add comprehensive component mount/refresh debugging
  useEffect(() => {
    console.log('🚨 === COMPONENT MOUNT/REFRESH DEBUG ===')
    console.log('🚨 Component mounting/refreshing...')
    console.log('🚨 Initial voiceState:', voiceState)
    console.log('🚨 Initial catchData:', catchData)
    console.log('🚨 Initial tempData:', tempData)
    console.log('🚨 recognitionRef.current exists:', !!recognitionRef.current)
    console.log('🚨 catchDataRef.current on mount:', catchDataRef.current)
    console.log('🚨 tempDataRef.current on mount:', tempDataRef.current)
    console.log('🚨 voiceStateRef.current on mount:', voiceStateRef.current)
    console.log('🚨 === END MOUNT/REFRESH DEBUG ===')
  }, [])

  // Monitor state changes for progress debugging
  useEffect(() => {
    console.log('=== PROGRESS UPDATE MONITOR ===')
    console.log('Voice state changed to:', voiceState)
    console.log('Current catch data:', catchData)
    console.log('Current temp data:', tempData)
    console.log('Should show progress section:', voiceState !== VOICE_STATES.IDLE || 
      Object.keys(catchData).some(key => catchData[key] && key !== 'latitude' && key !== 'longitude') ||
      Object.keys(tempData).some(key => tempData[key]))
    console.log('=== END PROGRESS UPDATE MONITOR ===')
  }, [voiceState, catchData, tempData])

  // PHASE 1: Initialize recognition object once
  useEffect(() => {
    console.log('🔧 === RECOGNITION OBJECT INITIALIZATION ====')
    console.log('🔧 Window object:', typeof window)
    console.log('🔧 SpeechRecognition available:', !!(window.SpeechRecognition))
    console.log('🔧 webkitSpeechRecognition available:', !!(window.webkitSpeechRecognition))
    
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    console.log('🔧 SpeechRecognition constructor:', SpeechRecognition)
    
    if (SpeechRecognition) {
      console.log('✅ Speech recognition IS supported')
      setIsSupported(true)
      
      try {
        const recognition = new SpeechRecognition()
        recognitionRef.current = recognition
        console.log('✅ Recognition object created:', recognition)
        
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = 'en-US'
        console.log('✅ Recognition properties set')
        
        // Basic event handlers that don't depend on state
        recognition.onstart = () => {
          console.log('🟢 RECOGNITION ACTUALLY STARTED')
          setIsListening(true)
        }
        
        recognition.onend = () => {
          console.log('🔴 RECOGNITION ACTUALLY ENDED')
          setIsListening(false)
        }
        
        recognition.onerror = (event) => {
          console.error('❌ VOICE RECOGNITION ERROR:', event.error)
          console.error('❌ Error details:', event)
          setIsListening(false)
        }
        
        console.log('✅ Basic recognition event handlers set')
        
        // CRITICAL: Defer handler binding to ensure refs are ready
        // Use Promise.resolve() to push to next tick after render completes
        Promise.resolve().then(() => {
          console.log('⏳ Deferred handler binding - ensuring refs are ready...')
          if (recognitionRef.current && typeof bindRecognitionHandler === 'function') {
            bindRecognitionHandler()
            console.log('✅ Handler bound after defer')
          } else {
            console.log('⚠️ Handler binding deferred - will be bound by useEffect')
          }
        })
        
      } catch (error) {
        console.error('❌ Failed to create recognition object:', error)
        setIsSupported(false)
      }
    } else {
      console.error('❌ Speech recognition NOT supported in this browser')
      setIsSupported(false)
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

  // PHASE 2: Create STABLE handler that doesn't recreate on state changes
  // This handler will ALWAYS use refs for state access, never closure state
  const bindRecognitionHandler = useCallback(() => {
    console.log('🔄 === STABLE RECOGNITION HANDLER BINDING ====')
    console.log('🔄 Binding STABLE handler that uses refs only')
    console.log('🔄 Recognition object exists:', !!recognitionRef.current)
    
    if (!recognitionRef.current) {
      console.log('❌ No recognition object - skipping handler binding')
      return
    }
    
    // CRITICAL: This handler uses ONLY refs, no closure state
    // This ensures it works correctly after refresh
    recognitionRef.current.onresult = async (event) => {
      const command = event.results[0][0].transcript.toLowerCase()
      const confidence = event.results[0][0].confidence
      
      console.log('🎤 === VOICE RESULT (STABLE HANDLER) ===')
      console.log(`🎤 Command: "${command}"`)
      console.log(`🎤 Confidence: ${confidence}`)
      console.log(`🎤 Current state from REF: ${voiceStateRef.current}`)
      console.log(`🎤 Current catchData from REF:`, catchDataRef.current)
      console.log(`🎤 Current tempData from REF:`, tempDataRef.current)
      
      // Store last command for debugging
      if (typeof setLastCommand === 'function') {
        setLastCommand(command)
      }
      
      // Call handleVoiceResult which should also use refs
      console.log('🎤 === CALLING handleVoiceResult ===')
      await handleVoiceResult(command, confidence)
    }
    
    console.log('✅ STABLE recognition handler bound - uses refs only')
    console.log('🔄 === END STABLE HANDLER BINDING ====') 
  }, []) // NO DEPENDENCIES - stable forever!
  
  // Bind handler ONLY ONCE when recognition is ready
  // Since handler is stable, we don't need to rebind on state changes
  useEffect(() => {
    if (recognitionRef.current) {
      bindRecognitionHandler()
    }
  }, [bindRecognitionHandler]) // bindRecognitionHandler is stable, so this only runs once

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
  
  // Safe recognition restart with delay
  const safeRestartRecognition = async (delayMs = 500) => {
    console.log('🔄 Safe restart recognition requested')
    
    // Stop if running
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
        console.log('🛑 Stopped existing recognition')
      } catch (e) {
        console.log('⚠️ Recognition was not running')
      }
    }
    
    // Wait for speech synthesis to finish and add delay
    await new Promise(resolve => setTimeout(resolve, delayMs))
    
    // Start recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
        console.log('🟢 Started recognition after delay')
      } catch (e) {
        console.error('❌ Failed to start recognition:', e.message)
      }
    }
  }

  // Enhanced speak function with comprehensive debugging
  const speak = async (text) => {
    console.log('=== SPEECH SYNTHESIS DEBUG ===')
    console.log('🗣️ Attempting to speak:', text)
    
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.error('❌ Speech synthesis not supported in this browser')
        setIsSpeaking(false)
        resolve()
        return
      }
      
      console.log('✅ Speech synthesis available')
      console.log('🔊 Current volume setting:', 1.0)
      
      // Cancel any existing speech
      window.speechSynthesis.cancel()
      
      setIsSpeaking(true)
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.8  // Slower for clarity
      utterance.pitch = 1.0
      utterance.volume = 1.0  // Max volume for debugging
      
      utterance.onstart = () => {
        console.log('🗣️ Speech started successfully')
      }
      
      utterance.onend = () => {
        console.log('✅ Speech completed successfully')
        console.log('=== END SPEECH SYNTHESIS DEBUG ===')
        setIsSpeaking(false)
        resolve()
      }
      
      utterance.onerror = (error) => {
        console.error('❌ Speech synthesis error:', error)
        console.log('Error type:', error.error)
        console.log('=== END SPEECH SYNTHESIS DEBUG ===')
        setIsSpeaking(false)
        resolve()
      }
      
      utterance.onboundary = (event) => {
        console.log('🎵 Speech boundary event:', event.name, 'at', event.charIndex)
      }
      
      console.log('🚀 Starting speech synthesis...')
      window.speechSynthesis.speak(utterance)
      
      // Fallback timeout in case speech gets stuck
      setTimeout(() => {
        if (isSpeaking) {
          console.warn('⚠️ Speech timeout reached, forcing completion')
          window.speechSynthesis.cancel()
          setIsSpeaking(false)
          resolve()
        }
      }, 10000) // 10 second timeout
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

  // Start catch confirmation timer with re-prompting
  const startCatchConfirmationTimer = () => {
    clearTimeout(timerRef.current)
    
    timerRef.current = setTimeout(async () => {
      const currentRetries = retryCounters.catchConfirmation || 0
      
      if (currentRetries < 3) {
        setRetryCounters(prev => ({
          ...prev,
          catchConfirmation: currentRetries + 1
        }))
        
        await speak(VOICE_PROMPTS.CHECK_CATCH)
        if (recognitionRef.current && !isListening) {
          recognitionRef.current.start()
        }
        
        // Set another timer
        startCatchConfirmationTimer()
      } else {
        await speak(VOICE_PROMPTS.MAX_RETRIES)
        resetVoiceWorkflow()
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
        // Lure collection is handled by voice input, not automatic advancement
        // User must speak a lure type, which will be processed by handleLureInput
        console.log('⚠️ COLLECTING_LURE state reached in advancement - this should not happen!')
        console.log('Lure collection should be handled by voice input, not automatic advancement')
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
        console.log('=== IDLE STATE HANDLER ===')
        console.log('Checking if transcript is mark fish command:', transcript)
        const isMarkCommand = isMarkFishCommand(transcript)
        console.log('isMarkFishCommand result:', isMarkCommand)
        
        if (isMarkCommand) {
          console.log('✅ Mark fish command detected, calling handleMarkFish')
          await handleMarkFish()
        } else {
          console.log('❌ Not a mark fish command, waiting for "Mark Fish"')
        }
        console.log('=== END IDLE STATE HANDLER ===')
        break
        
      case VOICE_STATES.COLLECTING_DEPTH:
        await handleDepthInput(transcript)
        break
        
      case VOICE_STATES.CONFIRMING_DEPTH:
        await handleDepthConfirmation(transcript)
        break
        
      case VOICE_STATES.WAITING_FOR_CATCH:
        const catchResponse = isCatchConfirmation(transcript)
        if (catchResponse.isResponse) {
          if (catchResponse.confirmed) {
            await handleCatchConfirmed()
          } else {
            await handleCatchNotConfirmed()
          }
        }
        // If no valid response, current retry logic continues
        break
        
      case VOICE_STATES.COLLECTING_SPECIES:
        await handleSpeciesInput(transcript)
        break
        
      case VOICE_STATES.CONFIRMING_SPECIES:
        await handleSpeciesConfirmation(transcript)
        break
        
      case VOICE_STATES.COLLECTING_LENGTH:
        await handleLengthInput(transcript)
        break
        
      case VOICE_STATES.CONFIRMING_LENGTH:
        await handleLengthConfirmation(transcript)
        break
        
      case VOICE_STATES.COLLECTING_WEIGHT:
        await handleWeightInput(transcript)
        break
        
      case VOICE_STATES.CONFIRMING_WEIGHT:
        await handleWeightConfirmation(transcript)
        break
        
      case VOICE_STATES.COLLECTING_LURE:
        console.log('🎯 VOICE STATE MATCH: COLLECTING_LURE - calling handleLureInput')
        await handleLureInput(transcript)
        break
        
      case VOICE_STATES.CONFIRMING_LURE:
        await handleLureConfirmation(transcript)
        break
        
      default:
        console.log('Voice input ignored in current state')
    }
  }

  // Mark fish location and start depth collection - CORRECTED to open modal immediately
  const handleMarkFish = async () => {
    console.log('=== MARK FISH HANDLER DEBUG ===')
    console.log('🎣 Mark Fish triggered! Opening modal immediately...')
    console.log('Current voice state before:', voiceState)
    console.log('Voice state ref before:', voiceStateRef.current)
    
    // PHASE 1: Immediately dispatch event to open modal (even without GPS yet)
    console.log('📱 Dispatching immediate modal open event...')
    window.dispatchEvent(new CustomEvent('voiceWorkflowComplete', {
      detail: {
        workflowStage: 'mark_fish_started',
        latitude: null,
        longitude: null,
        depth: '',
        species: '',
        length: '',
        weight: '',
        lureType: '',
        photoUrl: ''
      }
    }))
    console.log('✅ Modal open event dispatched')
    
    try {
      console.log('📍 Requesting geolocation...')
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        })
      })
      
      console.log('✅ Location captured:', position.coords.latitude, position.coords.longitude)
      
      setCatchData(prev => ({
        ...prev,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }))
      
      console.log('📊 Updated catch data with location')
      
      // PHASE 1: Update modal with GPS location
      console.log('📱 Dispatching GPS location update event...')
      window.dispatchEvent(new CustomEvent('voiceWorkflowComplete', {
        detail: {
          workflowStage: 'location_captured',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          depth: '',
          species: '',
          length: '',
          weight: '',
          lureType: '',
          photoUrl: ''
        }
      }))
      console.log('✅ GPS location update event dispatched')
      
      // Immediately ask for depth
      console.log('🔄 Setting state to COLLECTING_DEPTH')
      console.log('Available states:', VOICE_STATES)
      console.log('Target state:', VOICE_STATES.COLLECTING_DEPTH)
      
      setVoiceState(VOICE_STATES.COLLECTING_DEPTH)
      voiceStateRef.current = VOICE_STATES.COLLECTING_DEPTH  // Immediately update ref
      
      console.log('🔄 State updated to:', VOICE_STATES.COLLECTING_DEPTH)
      console.log('Voice state ref updated to:', voiceStateRef.current)
      
      console.log('🗣️ Speaking depth prompt:', VOICE_PROMPTS.ASK_DEPTH_FIRST)
      await speak(VOICE_PROMPTS.ASK_DEPTH_FIRST)
      console.log('✅ Depth prompt completed')
      
      console.log('🎤 Restarting recognition for depth collection...')
      // Always restart recognition after speaking
      if (recognitionRef.current) {
        try {
          console.log('Stopping current recognition...')
          recognitionRef.current.stop()
        } catch (e) {
          console.log('Recognition already stopped:', e.message)
        }
        
        setTimeout(() => {
          if (recognitionRef.current) {
            try {
              console.log('Starting recognition for depth collection...')
              recognitionRef.current.start()
              console.log('✅ Recognition restarted successfully')
            } catch (e) {
              console.error('❌ Failed to restart recognition:', e)
            }
          }
        }, 500)  // Small delay after speaking
      }
      
      // Start retry timer for depth
      console.log('⏰ Starting retry timer for depth collection')
      startRetryTimer('depth', VOICE_PROMPTS.ASK_DEPTH_FIRST)
      
      console.log('=== MARK FISH HANDLER COMPLETE ===')
      
    } catch (error) {
      console.error('❌ Unable to get location:', error)
      await speak('Unable to get location. Please try again.')
      console.log('=== MARK FISH HANDLER FAILED ===')
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
      
      // Store in temporary data for confirmation
      setTempData(prev => ({ ...prev, depth: depthValue }))
      
      console.log('Depth temporarily captured:', depthValue)
      
      // Reset retry counter for this field
      setRetryCounters(prev => ({ ...prev, depth: 0 }))
      
      // Move to confirmation state
      setVoiceState(VOICE_STATES.CONFIRMING_DEPTH)
      voiceStateRef.current = VOICE_STATES.CONFIRMING_DEPTH
      
      // Ask for confirmation
      await speak(VOICE_PROMPTS.CONFIRM_DEPTH(depthValue))
      
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
      
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

  // Handle depth confirmation with enhanced debugging
  const handleDepthConfirmation = async (transcript) => {
    console.log('=== DEPTH CONFIRMATION HANDLER DEBUG ===')
    console.log('Input transcript:', transcript)
    console.log('Current voice state:', voiceState)
    console.log('Voice state ref:', voiceStateRef.current)
    console.log('Temp depth value from ref:', tempDataRef.current.depth)
    console.log('Temp depth value from state:', tempData.depth)
    console.log('Current catch data from ref:', catchDataRef.current)
    
    setLastHeardCommand(transcript)
    
    const confirmation = isCatchConfirmation(transcript)
    console.log('Confirmation processing result:', confirmation)
    
    if (confirmation.isResponse) {
      if (confirmation.confirmed) {
        console.log('✅ DEPTH CONFIRMED - Accepting value')
        
        // Accept the depth value - USE REF for current value!
        const depthValue = tempDataRef.current.depth || tempData.depth
        console.log('Moving depth from temp to confirmed:', depthValue)
        
        if (!depthValue) {
          console.error('❌ CRITICAL: No depth value found in temp data!')
          return
        }
        
        console.log('🚨 BEFORE setCatchData - current catchData:', catchData)
        console.log('🚨 Setting depth to:', depthValue)
        
        // Update state for UI
        setCatchData(prev => {
          const newData = { ...prev, depth: depthValue }
          console.log('🔄 setCatchData called - NEW catchData will be:', newData)
          return newData
        })
        
        setTempData(prev => {
          const newData = { ...prev, depth: '' }
          console.log('🔄 setTempData called - clearing temp depth')
          return newData
        })
        
        // CRITICAL: Dispatch event OUTSIDE of setState to not break recognition flow
        // Use refs for current values to avoid stale state
        console.log('📱 Dispatching depth confirmation update to modal...')
        console.log('📱 Sending depth value:', depthValue)
        console.log('📱 Current catchDataRef:', catchDataRef.current)
        
        window.dispatchEvent(new CustomEvent('voiceWorkflowComplete', {
          detail: {
            workflowStage: 'depth_confirmed',
            latitude: catchDataRef.current.latitude || catchData.latitude,
            longitude: catchDataRef.current.longitude || catchData.longitude,
            depth: depthValue,
            species: '',
            length: '',
            weight: '',
            lureType: '',
            photoUrl: ''
          }
        }))
        console.log('✅ Depth confirmation update dispatched to modal with depth:', depthValue)
        
        // PHASE 3: Force UI update for progress display
        setForceUpdate(prev => prev + 1)
        console.log('🔄 Force update triggered for progress display')
        
        console.log('Depth confirmed and saved:', depthValue)
        
        // Audio confirmation
        console.log('Speaking confirmation message...')
        await speak(`Perfect! Depth set to ${depthValue} feet.`)
        
        console.log('Transitioning to COLLECTING_SPECIES state')
        setVoiceState(VOICE_STATES.COLLECTING_SPECIES)
        voiceStateRef.current = VOICE_STATES.COLLECTING_SPECIES
        
        // Immediately ask for species after depth is confirmed
        await speak("Great! Now, what species did you catch?")
        
        // CRITICAL: Restart recognition OUTSIDE of any state updates
        setTimeout(() => {
          console.log('🎤 Starting recognition restart sequence...')
          if (recognitionRef.current) {
            try {
              console.log('🎤 Stopping current recognition...')
              recognitionRef.current.stop()
            } catch (e) {
              console.log('Recognition already stopped:', e.message)
            }
            
            // Give time for stop to complete, then start
            setTimeout(() => {
              if (recognitionRef.current && voiceStateRef.current === VOICE_STATES.COLLECTING_SPECIES) {
                try {
                  console.log('🎤 Starting recognition for species collection...')
                  recognitionRef.current.start()
                  console.log('✅ Recognition restarted successfully')
                } catch (e) {
                  console.error('❌ Failed to restart recognition:', e)
                }
              }
            }, 800) // Longer delay for more reliable restart
          }
        }, 100) // Small delay to let state settle
        
        // Start retry timer for species
        startRetryTimer('species', "What species is it?")
        
      } else {
        console.log('❌ DEPTH REJECTED - Re-collecting')
        
        // Reject and re-collect
        setTempData(prev => ({ ...prev, depth: '' }))
        console.log('Cleared temp depth data')
        
        console.log('Transitioning back to COLLECTING_DEPTH state')
        setVoiceState(VOICE_STATES.COLLECTING_DEPTH)
        voiceStateRef.current = VOICE_STATES.COLLECTING_DEPTH
        
        console.log('Speaking re-collection prompt')
        await speak(VOICE_PROMPTS.RECOLLECT_DEPTH)
        
        console.log('Restarting voice recognition for depth collection')
        if (recognitionRef.current && !isListening) {
          try {
            recognitionRef.current.start()
            console.log('✅ Recognition restarted successfully')
          } catch (e) {
            console.error('❌ Failed to restart recognition:', e)
          }
        }
      }
    } else {
      console.log('⚠️ NO VALID YES/NO RESPONSE - Waiting for proper confirmation')
      console.log('User should say yes/no to confirm depth:', tempData.depth)
    }
    console.log('=== END DEPTH CONFIRMATION HANDLER DEBUG ===')
  }

  // Handle catch confirmation
  const handleCatchConfirmed = async () => {
    clearTimer()
    // Reset catch confirmation retry counter
    setRetryCounters(prev => ({ ...prev, catchConfirmation: 0 }))
    
    setVoiceState(VOICE_STATES.COLLECTING_SPECIES)
    voiceStateRef.current = VOICE_STATES.COLLECTING_SPECIES  // Immediately update ref
    await speak(VOICE_PROMPTS.CATCH_CONFIRMED)
    
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start()
    }
    
    // Start retry timer for species
    startRetryTimer('species', VOICE_PROMPTS.CATCH_CONFIRMED)
  }

  // Handle catch not confirmed (user said no)
  const handleCatchNotConfirmed = async () => {
    clearTimer()
    await speak(VOICE_PROMPTS.CATCH_FAILED)
    resetVoiceWorkflow()
  }

  // Handle species input
  const handleSpeciesInput = async (transcript) => {
    setLastHeardCommand(transcript)
    clearTimeout(retryTimerRef.current)
    
    const species = parseSpecies(transcript)
    if (species) {
      // Store in temporary data for confirmation
      setTempData(prev => ({ ...prev, species }))
      
      console.log('Species temporarily captured:', species)
      
      // Reset retry counter for this field
      setRetryCounters(prev => ({ ...prev, species: 0 }))
      
      // Move to confirmation state
      setVoiceState(VOICE_STATES.CONFIRMING_SPECIES)
      voiceStateRef.current = VOICE_STATES.CONFIRMING_SPECIES
      
      // Ask for confirmation
      await speak(VOICE_PROMPTS.CONFIRM_SPECIES(species))
      
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
    } else {
      await speak("I didn't recognize that species. Could you repeat it?")
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
      // Start retry timer
      startRetryTimer('species', VOICE_PROMPTS.CATCH_CONFIRMED)
    }
  }

  // Handle species confirmation
  const handleSpeciesConfirmation = async (transcript) => {
    console.log('=== SPECIES CONFIRMATION HANDLER DEBUG ===')
    console.log('Species confirmation transcript:', transcript)
    console.log('Temp species from ref:', tempDataRef.current.species)
    
    setLastHeardCommand(transcript)
    
    const confirmation = isCatchConfirmation(transcript)
    console.log('Species confirmation result:', confirmation)
    
    if (confirmation.isResponse) {
      if (confirmation.confirmed) {
        // Accept the species value - USE REF for current value!
        const speciesValue = tempDataRef.current.species || tempData.species
        console.log('Moving species from temp to confirmed:', speciesValue)
        
        if (!speciesValue) {
          console.error('❌ CRITICAL: No species value found in temp data!')
          return
        }
        
        // Update state for UI
        setCatchData(prev => {
          const newData = { ...prev, species: speciesValue }
          console.log('🔄 setCatchData called - NEW catchData will be:', newData)
          return newData
        })
        
        setTempData(prev => {
          const newData = { ...prev, species: '' }
          console.log('🔄 setTempData called - clearing temp species')
          return newData
        })
        
        // CRITICAL: Dispatch event OUTSIDE of setState to not break recognition flow
        console.log('📱 Dispatching species confirmation update to modal...')
        console.log('📱 Sending species value:', speciesValue)
        console.log('📱 Current catchDataRef:', catchDataRef.current)
        
        window.dispatchEvent(new CustomEvent('voiceWorkflowComplete', {
          detail: {
            workflowStage: 'species_confirmed',
            latitude: catchDataRef.current.latitude || catchData.latitude,
            longitude: catchDataRef.current.longitude || catchData.longitude,
            depth: catchDataRef.current.depth || catchData.depth,
            species: speciesValue,
            length: '',
            weight: '',
            lureType: '',
            photoUrl: ''
          }
        }))
        console.log('✅ Species confirmation update dispatched to modal with species:', speciesValue)
        
        // PHASE 3: Force UI update for progress display
        setForceUpdate(prev => prev + 1)
        console.log('🔄 Force update triggered for progress display')
        
        // Audio confirmation
        console.log('Speaking confirmation message...')
        await speak(`Perfect! Species set to ${speciesValue}.`)
        
        console.log('Transitioning to COLLECTING_LENGTH state')
        setVoiceState(VOICE_STATES.COLLECTING_LENGTH)
        voiceStateRef.current = VOICE_STATES.COLLECTING_LENGTH
        
        // Immediately ask for length after species is confirmed
        await speak("Great! How long is it?")
        
        // CRITICAL: Restart recognition OUTSIDE of any state updates
        setTimeout(() => {
          console.log('🎤 Starting recognition restart sequence for length...')
          if (recognitionRef.current) {
            try {
              console.log('🎤 Stopping current recognition...')
              recognitionRef.current.stop()
            } catch (e) {
              console.log('Recognition already stopped:', e.message)
            }
            
            // Give time for stop to complete, then start
            setTimeout(() => {
              if (recognitionRef.current && voiceStateRef.current === VOICE_STATES.COLLECTING_LENGTH) {
                try {
                  console.log('🎤 Starting recognition for length collection...')
                  recognitionRef.current.start()
                  console.log('✅ Recognition restarted successfully for length')
                } catch (e) {
                  console.error('❌ Failed to restart recognition:', e)
                }
              }
            }, 800)
          }
        }, 100)
        
        // Start retry timer for length
        startRetryTimer('length', "How long is it?")
        
      } else {
        // Reject and re-collect
        setTempData(prev => ({ ...prev, species: '' }))
        setVoiceState(VOICE_STATES.COLLECTING_SPECIES)
        voiceStateRef.current = VOICE_STATES.COLLECTING_SPECIES
        await speak(VOICE_PROMPTS.RECOLLECT_SPECIES)
        
        if (recognitionRef.current && !isListening) {
          recognitionRef.current.start()
        }
      }
    }
    // If no valid yes/no response, wait for proper confirmation
  }

  // Handle length input
  const handleLengthInput = async (transcript) => {
    setLastHeardCommand(transcript)
    clearTimeout(retryTimerRef.current)
    
    const parsed = parseNumberFromSpeech(transcript)
    if (parsed && parsed.value > 0) {
      const lengthValue = `${parsed.value}`
      
      // Store in temporary data for confirmation
      setTempData(prev => ({ ...prev, length: lengthValue }))
      
      console.log('Length temporarily captured:', lengthValue)
      
      // Reset retry counter for this field
      setRetryCounters(prev => ({ ...prev, length: 0 }))
      
      // Move to confirmation state
      setVoiceState(VOICE_STATES.CONFIRMING_LENGTH)
      voiceStateRef.current = VOICE_STATES.CONFIRMING_LENGTH
      
      // Ask for confirmation
      await speak(VOICE_PROMPTS.CONFIRM_LENGTH(lengthValue))
      
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
    } else {
      await speak("I didn't catch that length. Could you repeat it?")
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
      // Start retry timer
      startRetryTimer('length', VOICE_PROMPTS.ASK_LENGTH)
    }
  }

  // Handle length confirmation
  const handleLengthConfirmation = async (transcript) => {
    console.log('=== LENGTH CONFIRMATION HANDLER DEBUG ===')
    console.log('Length confirmation transcript:', transcript)
    console.log('Temp length from ref:', tempDataRef.current.length)
    
    setLastHeardCommand(transcript)
    
    const confirmation = isCatchConfirmation(transcript)
    console.log('Length confirmation result:', confirmation)
    
    if (confirmation.isResponse) {
      if (confirmation.confirmed) {
        // Accept the length value - USE REF for current value!
        const lengthValue = tempDataRef.current.length || tempData.length
        console.log('Moving length from temp to confirmed:', lengthValue)
        
        if (!lengthValue) {
          console.error('❌ CRITICAL: No length value found in temp data!')
          return
        }
        
        // Update state for UI
        setCatchData(prev => {
          const newData = { ...prev, length: lengthValue }
          console.log('🔄 setCatchData called - NEW catchData will be:', newData)
          return newData
        })
        
        setTempData(prev => {
          const newData = { ...prev, length: '' }
          console.log('🔄 setTempData called - clearing temp length')
          return newData
        })
        
        // CRITICAL: Dispatch event OUTSIDE of setState to not break recognition flow
        console.log('📱 Dispatching length confirmation update to modal...')
        console.log('📱 Sending length value:', lengthValue)
        console.log('📱 Current catchDataRef:', catchDataRef.current)
        
        window.dispatchEvent(new CustomEvent('voiceWorkflowComplete', {
          detail: {
            workflowStage: 'length_confirmed',
            latitude: catchDataRef.current.latitude || catchData.latitude,
            longitude: catchDataRef.current.longitude || catchData.longitude,
            depth: catchDataRef.current.depth || catchData.depth,
            species: catchDataRef.current.species || catchData.species,
            length: lengthValue,
            weight: '',
            lureType: '',
            photoUrl: ''
          }
        }))
        console.log('✅ Length confirmation update dispatched to modal with length:', lengthValue)
        
        // PHASE 3: Force UI update for progress display
        setForceUpdate(prev => prev + 1)
        console.log('🔄 Force update triggered for progress display')
        
        // Audio confirmation
        console.log('Speaking confirmation message...')
        await speak(`Perfect! Length set to ${lengthValue} inches.`)
        
        console.log('Transitioning to COLLECTING_WEIGHT state')
        setVoiceState(VOICE_STATES.COLLECTING_WEIGHT)
        voiceStateRef.current = VOICE_STATES.COLLECTING_WEIGHT
        
        // Immediately ask for weight after length is confirmed
        await speak("Great! What's the weight?")
        
        // CRITICAL: Restart recognition OUTSIDE of any state updates
        setTimeout(() => {
          console.log('🎤 Starting recognition restart sequence for weight...')
          if (recognitionRef.current) {
            try {
              console.log('🎤 Stopping current recognition...')
              recognitionRef.current.stop()
            } catch (e) {
              console.log('Recognition already stopped:', e.message)
            }
            
            // Give time for stop to complete, then start
            setTimeout(() => {
              if (recognitionRef.current && voiceStateRef.current === VOICE_STATES.COLLECTING_WEIGHT) {
                try {
                  console.log('🎤 Starting recognition for weight collection...')
                  recognitionRef.current.start()
                  console.log('✅ Recognition restarted successfully for weight')
                } catch (e) {
                  console.error('❌ Failed to restart recognition:', e)
                }
              }
            }, 800)
          }
        }, 100)
        
        // Start retry timer for weight
        startRetryTimer('weight', "What's the weight?")
        console.log('📱 Dispatching length confirmation update to modal...')
        window.dispatchEvent(new CustomEvent('voiceWorkflowComplete', {
          detail: {
            workflowStage: 'length_confirmed',
            latitude: catchData.latitude,
            longitude: catchData.longitude,
            depth: catchData.depth,
            species: catchData.species,
            length: lengthValue,
            weight: '',
            lureType: '',
            photoUrl: ''
          }
        }))
        console.log('✅ Length confirmation update dispatched to modal')
        
        setVoiceState(VOICE_STATES.COLLECTING_WEIGHT)
        voiceStateRef.current = VOICE_STATES.COLLECTING_WEIGHT
        await speak(VOICE_PROMPTS.ASK_WEIGHT)
        
        if (recognitionRef.current && !isListening) {
          recognitionRef.current.start()
        }
        // Start retry timer for next field
        startRetryTimer('weight', VOICE_PROMPTS.ASK_WEIGHT)
        
      } else {
        // Reject and re-collect
        setTempData(prev => ({ ...prev, length: '' }))
        setVoiceState(VOICE_STATES.COLLECTING_LENGTH)
        voiceStateRef.current = VOICE_STATES.COLLECTING_LENGTH
        await speak(VOICE_PROMPTS.RECOLLECT_LENGTH)
        
        if (recognitionRef.current && !isListening) {
          recognitionRef.current.start()
        }
      }
    }
    // If no valid yes/no response, wait for proper confirmation
  }

  // Handle weight input
  const handleWeightInput = async (transcript) => {
    setLastHeardCommand(transcript)
    clearTimeout(retryTimerRef.current)
    
    const parsed = parseNumberFromSpeech(transcript)
    if (parsed && parsed.value > 0) {
      const weightValue = `${parsed.value}`
      
      // Store in temporary data for confirmation
      setTempData(prev => ({ ...prev, weight: weightValue }))
      
      console.log('Weight temporarily captured:', weightValue)
      
      // Reset retry counter for this field
      setRetryCounters(prev => ({ ...prev, weight: 0 }))
      
      // Move to confirmation state
      setVoiceState(VOICE_STATES.CONFIRMING_WEIGHT)
      voiceStateRef.current = VOICE_STATES.CONFIRMING_WEIGHT
      
      // Ask for confirmation
      await speak(VOICE_PROMPTS.CONFIRM_WEIGHT(weightValue))
      
      // Use safe restart with delay
      await safeRestartRecognition(800)
    } else {
      await speak("I didn't catch that weight. Could you repeat it?")
      
      // Use safe restart with delay
      await safeRestartRecognition(800)
      // Start retry timer
      startRetryTimer('weight', VOICE_PROMPTS.ASK_WEIGHT)
    }
  }

  // Handle weight confirmation
  const handleWeightConfirmation = async (transcript) => {
    setLastHeardCommand(transcript)
    
    const confirmation = isCatchConfirmation(transcript)
    if (confirmation.isResponse) {
      if (confirmation.confirmed) {
        // Accept the weight value - USE REF for current value!
        const weightValue = tempDataRef.current.weight || tempData.weight
        console.log('Moving weight from temp to confirmed:', weightValue)
        
        if (!weightValue) {
          console.error('❌ CRITICAL: No weight value found in temp data!')
          return
        }
        
        // Update state for UI
        setCatchData(prev => {
          const newData = { ...prev, weight: weightValue }
          console.log('🔄 setCatchData called - NEW catchData will be:', newData)
          return newData
        })
        
        setTempData(prev => {
          const newData = { ...prev, weight: '' }
          console.log('🔄 setTempData called - clearing temp weight')
          return newData
        })
        
        // CRITICAL: Dispatch event OUTSIDE of setState to not break recognition flow
        console.log('📱 Dispatching weight confirmation update to modal...')
        console.log('📱 Sending weight value:', weightValue)
        console.log('📱 Current catchDataRef:', catchDataRef.current)
        
        window.dispatchEvent(new CustomEvent('voiceWorkflowComplete', {
          detail: {
            workflowStage: 'weight_confirmed',
            latitude: catchData.latitude,
            longitude: catchData.longitude,
            depth: catchData.depth,
            species: catchData.species,
            length: catchData.length,
            weight: weightValue,
            lureType: '',
            photoUrl: ''
          }
        }))
        console.log('✅ Weight confirmation update dispatched to modal')
        
        setVoiceState(VOICE_STATES.COLLECTING_LURE)
        voiceStateRef.current = VOICE_STATES.COLLECTING_LURE
        await speak(VOICE_PROMPTS.ASK_LURE)
        
        // Use safe restart with delay
        await safeRestartRecognition(800)
        
        // Start retry timer for next field
        startRetryTimer('lure', VOICE_PROMPTS.ASK_LURE)
        
      } else {
        // Reject and re-collect
        setTempData(prev => ({ ...prev, weight: '' }))
        setVoiceState(VOICE_STATES.COLLECTING_WEIGHT)
        voiceStateRef.current = VOICE_STATES.COLLECTING_WEIGHT
        await speak(VOICE_PROMPTS.RECOLLECT_WEIGHT)
        
        // Use safe restart with delay
        await safeRestartRecognition(800)
      }
    }
    // If no valid yes/no response, wait for proper confirmation
  }

  // Handle lure input and trigger photo capture
  const handleLureInput = async (transcript) => {
    console.log('🎣 === HANDLE LURE INPUT DEBUG ===')
    console.log('🎣 Raw transcript:', transcript)
    console.log('🎣 Current voice state:', voiceState)
    console.log('🎣 Current voiceStateRef:', voiceStateRef.current)
    
    setLastHeardCommand(transcript)
    clearTimeout(retryTimerRef.current)
    
    console.log('🎣 Calling parseLure with transcript:', transcript)
    const lure = parseLure(transcript)
    console.log('🎣 parseLure returned:', lure)
    
    if (lure) {
      // Store in temporary data for confirmation
      setTempData(prev => ({ ...prev, lureType: lure }))
      
      console.log('Lure temporarily captured:', lure)
      
      // Reset retry counter for this field
      setRetryCounters(prev => ({ ...prev, lure: 0 }))
      
      // Move to confirmation state
      setVoiceState(VOICE_STATES.CONFIRMING_LURE)
      voiceStateRef.current = VOICE_STATES.CONFIRMING_LURE
      
      // Ask for confirmation
      await speak(VOICE_PROMPTS.CONFIRM_LURE(lure))
      
      // Use safe restart with delay
      await safeRestartRecognition(800)
    } else {
      console.log('❌ parseLure returned null - lure not recognized')
      console.log('❌ Failed to recognize lure from transcript:', transcript)
      await speak("I didn't recognize that lure. Could you repeat it?")
      
      // Use safe restart with delay
      await safeRestartRecognition(800)
      
      // Start retry timer
      startRetryTimer('lure', VOICE_PROMPTS.ASK_LURE)
    }
  }

  // Handle lure confirmation
  const handleLureConfirmation = async (transcript) => {
    console.log('=== LURE CONFIRMATION HANDLER DEBUG ===')
    console.log('Lure confirmation transcript:', transcript)
    console.log('Temp lure from ref:', tempDataRef.current.lureType)
    
    setLastHeardCommand(transcript)
    
    const confirmation = isCatchConfirmation(transcript)
    console.log('Lure confirmation result:', confirmation)
    
    if (confirmation.isResponse) {
      if (confirmation.confirmed) {
        // Accept the lure value - USE REF for current value!
        const lureValue = tempDataRef.current.lureType || tempData.lureType
        console.log('Moving lure from temp to confirmed:', lureValue)
        
        if (!lureValue) {
          console.error('❌ CRITICAL: No lure value found in temp data!')
          return
        }
        
        // Update state for UI
        setCatchData(prev => {
          const newData = { ...prev, lureType: lureValue }
          console.log('🔄 setCatchData called - NEW catchData will be:', newData)
          return newData
        })
        
        setTempData(prev => {
          const newData = { ...prev, lureType: '' }
          console.log('🔄 setTempData called - clearing temp lure')
          return newData
        })
        
        // CRITICAL: Dispatch event OUTSIDE of setState to not break recognition flow
        console.log('📱 Dispatching lure confirmation update to modal...')
        console.log('📱 Sending lure value:', lureValue)
        console.log('📱 Current catchDataRef:', catchDataRef.current)
        
        window.dispatchEvent(new CustomEvent('voiceWorkflowComplete', {
          detail: {
            workflowStage: 'all_fields_confirmed',
            latitude: catchDataRef.current.latitude || catchData.latitude,
            longitude: catchDataRef.current.longitude || catchData.longitude,
            depth: catchDataRef.current.depth || catchData.depth,
            species: catchDataRef.current.species || catchData.species,
            length: catchDataRef.current.length || catchData.length,
            weight: catchDataRef.current.weight || catchData.weight,
            lureType: lureValue,
            photoUrl: ''
          }
        }))
        console.log('✅ Lure confirmation update dispatched to modal with lure:', lureValue)
        
        // PHASE 3: Force UI update for progress display
        setForceUpdate(prev => prev + 1)
        console.log('🔄 Force update triggered for progress display')
        
        // Audio confirmation
        console.log('Speaking confirmation message...')
        await speak(`Perfect! Lure set to ${lureValue}.`)
        
        console.log('Transitioning to TAKING_PHOTO state')
        setVoiceState(VOICE_STATES.TAKING_PHOTO)
        voiceStateRef.current = VOICE_STATES.TAKING_PHOTO
        
        console.log('✅ Complete voice data dispatched to modal - ready for photo!')
        await speak(VOICE_PROMPTS.PHOTO_TIME)
        // Photo capture will be handled by the UI buttons
        
      } else {
        // Reject and re-collect
        setTempData(prev => ({ ...prev, lureType: '' }))
        setVoiceState(VOICE_STATES.COLLECTING_LURE)
        voiceStateRef.current = VOICE_STATES.COLLECTING_LURE
        await speak(VOICE_PROMPTS.RECOLLECT_LURE)
        
        // Use safe restart with delay
        await safeRestartRecognition(800)
      }
    }
    console.log('=== END LURE CONFIRMATION HANDLER DEBUG ===')
    // If no valid yes/no response, wait for proper confirmation
  }

  // Handle photo capture with enhanced debugging
  const handlePhotoCapture = () => {
    console.log('=== PHOTO CAPTURE DEBUG ===')
    console.log('Creating file input for photo capture...')
    console.log('Current voice state:', voiceState)
    console.log('Current catch data:', catchData)
    
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'camera'
    
    console.log('File input created:', input)
    console.log('Input properties:', {
      type: input.type,
      accept: input.accept,
      capture: input.capture
    })
    
    input.onchange = async (e) => {
      console.log('File input changed event triggered')
      console.log('Event target:', e.target)
      console.log('Files selected:', e.target.files)
      
      const file = e.target.files[0]
      if (file) {
        console.log('✅ File selected:', {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        })
        await uploadAndSubmitCatch(file)
      } else {
        console.log('❌ No file selected')
      }
    }
    
    input.onerror = (e) => {
      console.error('❌ File input error:', e)
    }
    
    console.log('Triggering file input click...')
    input.click()
    console.log('File input click triggered')
    console.log('=== END PHOTO CAPTURE DEBUG ===')
  }

  // Upload photo and submit catch with enhanced debugging
  const uploadAndSubmitCatch = async (photoFile) => {
    console.log('=== UPLOAD AND SUBMIT DEBUG ===')
    console.log('Starting upload and submit process')
    console.log('Photo file:', photoFile ? {
      name: photoFile.name,
      size: photoFile.size,
      type: photoFile.type
    } : 'null (no photo)')
    console.log('Current catch data:', catchData)
    
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
      
      // Submit catch data WITH WEATHER CONDITIONS
      const catchPayload = {
        latitude: catchData.latitude,
        longitude: catchData.longitude,
        species: catchData.species,
        length: parseFloat(catchData.length) || null,
        weight: parseFloat(catchData.weight) || null,
        depth: parseFloat(catchData.depth) || null,
        lureType: catchData.lureType,
        photoUrl: photoUrl,
        catchTime: new Date().toISOString(),
        // Add environmental conditions from props
        conditions: currentConditions ? {
          airTemperature: currentConditions.temperature,
          waterTemp: currentConditions.waterTemp,
          windSpeed: currentConditions.windSpeed,
          windDirection: currentConditions.windDirection,
          barometricPressure: currentConditions.pressure,
          cloudCover: currentConditions.cloudCover,
          humidity: currentConditions.humidity,
          moonPhase: currentConditions.moonPhase?.name || 'Unknown',
          visibility: currentConditions.visibility
        } : {}
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
        
        // Also dispatch event to update recent catches list with full catch data
        const fullCatchData = {
          id: newCatch.id,
          latitude: catchData.latitude,
          longitude: catchData.longitude,
          species: catchData.species,
          length: parseFloat(catchData.length) || null,
          weight: parseFloat(catchData.weight) || null,
          depth: parseFloat(catchData.depth) || null,
          lureType: catchData.lureType,
          photoUrl: photoUrl,
          catchTime: newCatch.catchTime || new Date().toISOString(),
          userId: newCatch.userId,
          speciesConfig: {
            emoji: getSpeciesEmoji(catchData.species),
            color: getSpeciesColor(catchData.species)
          }
        }
        
        window.dispatchEvent(new CustomEvent('catchSavedViaVoice', {
          detail: fullCatchData
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
    voiceStateRef.current = VOICE_STATES.IDLE  // Reset ref too
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
    setTempData({
      depth: '',
      species: '',
      length: '',
      weight: '',
      lureType: ''
    })
    setRetryCounters({
      depth: 0,
      species: 0,
      length: 0,
      weight: 0,
      lure: 0,
      catchConfirmation: 0
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
    console.log('🎤 === START LISTENING CALLED ===')
    console.log('🎤 recognitionRef.current exists:', !!recognitionRef.current)
    console.log('🎤 isListening currently:', isListening)
    console.log('🎤 voiceState:', voiceState)
    console.log('🎤 weatherLoaded:', weatherLoaded)
    
    // Check if weather data is loaded before allowing voice workflow
    if (!weatherLoaded) {
      console.log('⚠️ Cannot start voice workflow - weather data not loaded')
      setPendingVoiceStart(true)
      speak("Please wait while I load the current weather conditions...")
      return
    }
    
    if (recognitionRef.current && !isListening) {
      // Reset workflow if starting fresh
      if (voiceState === VOICE_STATES.IDLE) {
        console.log('🎤 Resetting workflow before starting')
        resetVoiceWorkflow()
      }
      
      try {
        console.log('🎤 Attempting to start recognition...')
        recognitionRef.current.start()
        console.log('🎤 Recognition.start() called successfully')
      } catch (error) {
        console.error('❌ Failed to start recognition:', error)
      }
    } else {
      console.log('❌ Cannot start recognition:')
      console.log('  - recognitionRef exists:', !!recognitionRef.current)
      console.log('  - isListening:', isListening)
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

  // Render logic
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
            {voiceState === VOICE_STATES.CONFIRMING_DEPTH && "🤔 Confirming depth - say yes or no"}
            {voiceState === VOICE_STATES.WAITING_FOR_CATCH && "⏰ Waiting for your catch..."}
            {voiceState === VOICE_STATES.COLLECTING_SPECIES && "🐟 What species is it?"}
            {voiceState === VOICE_STATES.CONFIRMING_SPECIES && "🤔 Confirming species - say yes or no"}
            {voiceState === VOICE_STATES.COLLECTING_LENGTH && "📏 How long is it?"}
            {voiceState === VOICE_STATES.CONFIRMING_LENGTH && "🤔 Confirming length - say yes or no"}
            {voiceState === VOICE_STATES.COLLECTING_WEIGHT && "⚖️ What's the weight?"}
            {voiceState === VOICE_STATES.CONFIRMING_WEIGHT && "🤔 Confirming weight - say yes or no"}
            {voiceState === VOICE_STATES.COLLECTING_LURE && "🎣 What lure did you use?"}
            {voiceState === VOICE_STATES.CONFIRMING_LURE && "🤔 Confirming lure - say yes or no"}
            {voiceState === VOICE_STATES.TAKING_PHOTO && "📸 Ready for photo!"}
            {voiceState === VOICE_STATES.COMPLETED && "✅ Catch saved successfully!"}
          </div>
        )}
        {/* Voice Data Collection Progress - Force re-render with key */}
        {(() => {
          const shouldShow = voiceState !== VOICE_STATES.IDLE || 
            Object.keys(catchData).some(key => catchData[key] && key !== 'latitude' && key !== 'longitude') ||
            Object.keys(tempData).some(key => tempData[key])
          
          console.log('=== PROGRESS DISPLAY CHECK ===')
          console.log('Should show progress?', shouldShow)
          console.log('Voice state:', voiceState)
          console.log('Catch data keys with values:', Object.keys(catchData).filter(key => catchData[key] && key !== 'latitude' && key !== 'longitude'))
          console.log('Temp data keys with values:', Object.keys(tempData).filter(key => tempData[key]))
          console.log('Force update counter:', forceUpdate)
          console.log('=== END PROGRESS DISPLAY CHECK ===')
          
          return shouldShow
        })() && (
          <div 
            key={`progress-${voiceState}-${JSON.stringify(tempData)}-${JSON.stringify(catchData)}`}
            style={{
              marginTop: '10px',
              padding: '15px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              fontSize: '0.9rem'
            }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#065f46' }}>
              Voice Data Collection Progress (State: {voiceState}):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Location (no confirmation needed) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: catchData.latitude && catchData.longitude ? '#16a34a' : '#64748b' }}>
                  {catchData.latitude && catchData.longitude ? '✅' : '⭕'}
                </span>
                <span style={{ color: catchData.latitude && catchData.longitude ? '#065f46' : '#64748b' }}>
                  Location: {catchData.latitude && catchData.longitude ? 'Captured' : 'Pending'}
                </span>
              </div>
              
              {/* Enhanced field displays with confirmation states */}
              {(() => {
                console.log('🔍 PROGRESS DISPLAY STATE CHECK:')
                console.log('catchData:', catchData)
                console.log('tempData:', tempData)
                console.log('catchData.depth specifically:', catchData.depth)
                console.log('tempData.depth specifically:', tempData.depth)
                
                const depthStatus = getFieldStatus(catchData.depth, tempData.depth, ' ft', 'depth')
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: depthStatus.color }}>{depthStatus.icon}</span>
                    <span style={{ color: depthStatus.textColor }}>Depth: {depthStatus.text}</span>
                  </div>
                )
              })()}
              
              {(() => {
                const speciesStatus = getFieldStatus(catchData.species, tempData.species, '', 'species')
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: speciesStatus.color }}>{speciesStatus.icon}</span>
                    <span style={{ color: speciesStatus.textColor }}>Species: {speciesStatus.text}</span>
                  </div>
                )
              })()}
              
              {(() => {
                const lengthStatus = getFieldStatus(catchData.length, tempData.length, '"', 'length')
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: lengthStatus.color }}>{lengthStatus.icon}</span>
                    <span style={{ color: lengthStatus.textColor }}>Length: {lengthStatus.text}</span>
                  </div>
                )
              })()}
              
              {(() => {
                const weightStatus = getFieldStatus(catchData.weight, tempData.weight, ' lbs', 'weight')
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: weightStatus.color }}>{weightStatus.icon}</span>
                    <span style={{ color: weightStatus.textColor }}>Weight: {weightStatus.text}</span>
                  </div>
                )
              })()}
              
              {(() => {
                const lureStatus = getFieldStatus(catchData.lureType, tempData.lureType, '', 'lure')
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: lureStatus.color }}>{lureStatus.icon}</span>
                    <span style={{ color: lureStatus.textColor }}>Lure: {lureStatus.text}</span>
                  </div>
                )
              })()}
            </div>
          </div>
        )}
        
        {/* Pending Confirmation Display */}
        {Object.keys(tempData).some(key => tempData[key]) && (
          <div style={{
            marginTop: '10px',
            padding: '15px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '8px',
            fontSize: '0.9rem'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#1d4ed8' }}>🤔 Awaiting Confirmation:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tempData.depth && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#3b82f6' }}>⏳</span>
                  <span style={{ color: '#1e40af' }}>
                    Depth: {tempData.depth} ft (please confirm)
                  </span>
                </div>
              )}
              {tempData.species && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#3b82f6' }}>⏳</span>
                  <span style={{ color: '#1e40af' }}>
                    Species: {tempData.species} (please confirm)
                  </span>
                </div>
              )}
              {tempData.length && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#3b82f6' }}>⏳</span>
                  <span style={{ color: '#1e40af' }}>
                    Length: {tempData.length}" (please confirm)
                  </span>
                </div>
              )}
              {tempData.weight && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#3b82f6' }}>⏳</span>
                  <span style={{ color: '#1e40af' }}>
                    Weight: {tempData.weight} lbs (please confirm)
                  </span>
                </div>
              )}
              {tempData.lureType && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#3b82f6' }}>⏳</span>
                  <span style={{ color: '#1e40af' }}>
                    Lure: {tempData.lureType} (please confirm)
                  </span>
                </div>
              )}
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
          {retryCounters.catchConfirmation > 0 && <div>Catch Confirmation: {retryCounters.catchConfirmation}/3 attempts</div>}
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