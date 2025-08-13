import { useState, useCallback, useRef } from 'react'
import VoiceService from '../services/VoiceService'
import { 
  parseSpecies, 
  parseLure, 
  parseNumberFromSpeech, 
  isCatchConfirmation, 
  isMarkFishCommand 
} from '../utils/speechProcessing'

// Voice states for the fishing workflow
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
  PHOTO_TIME: "Ok guys, let's get a picture of that lunker!"
}

export function useVoiceLogger() {
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
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
  const [error, setError] = useState(null)
  
  const timerRef = useRef(null)
  const voiceSupported = VoiceService.isSupported

  // Clear any existing timers
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Speak text and handle state
  const speak = useCallback(async (text) => {
    setIsSpeaking(true)
    try {
      await VoiceService.speak(text)
    } catch (error) {
      console.error('Speech error:', error)
    } finally {
      setIsSpeaking(false)
    }
  }, [])

  // Start listening for voice input
  const startListening = useCallback(() => {
    if (!voiceSupported) {
      setError('Voice recognition not supported in this browser')
      return false
    }

    const success = VoiceService.startListening({
      onStart: () => {
        setIsListening(true)
        setError(null)
      },
      onResult: (transcript, confidence) => {
        handleVoiceResult(transcript, confidence)
      },
      onError: (error) => {
        setIsListening(false)
        setError(`Voice error: ${error}`)
      },
      onEnd: () => {
        setIsListening(false)
      }
    })

    return success
  }, [voiceState])

  // Handle voice recognition results
  const handleVoiceResult = useCallback((transcript, confidence) => {
    console.log(`Voice result in state ${voiceState}:`, transcript)
    
    switch (voiceState) {
      case VOICE_STATES.IDLE:
        if (isMarkFishCommand(transcript)) {
          handleMarkFish()
        }
        break
        
      case VOICE_STATES.COLLECTING_DEPTH:
        handleDepthInput(transcript)
        break
        
      case VOICE_STATES.WAITING_FOR_CATCH:
        if (isCatchConfirmation(transcript)) {
          handleCatchConfirmed()
        }
        break
        
      case VOICE_STATES.COLLECTING_SPECIES:
        handleSpeciesInput(transcript)
        break
        
      case VOICE_STATES.COLLECTING_LENGTH:
        handleLengthInput(transcript)
        break
        
      case VOICE_STATES.COLLECTING_WEIGHT:
        handleWeightInput(transcript)
        break
        
      case VOICE_STATES.COLLECTING_LURE:
        handleLureInput(transcript)
        break
        
      default:
        console.log('Voice input ignored in current state')
    }
  }, [voiceState])

  // Mark fish location and start depth collection
  const handleMarkFish = useCallback(async () => {
    // Get current location (this functionality already exists)
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        })
      })
      
      setCatchData(prev => ({
        ...prev,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }))
      
      // Immediately ask for depth
      setVoiceState(VOICE_STATES.COLLECTING_DEPTH)
      await speak(VOICE_PROMPTS.ASK_DEPTH_FIRST)
      startListening()
      
    } catch (error) {
      setError('Unable to get location: ' + error.message)
    }
  }, [speak, startListening])

  // Handle depth input
  const handleDepthInput = useCallback(async (transcript) => {
    const parsed = parseNumberFromSpeech(transcript)
    if (parsed && parsed.value > 0) {
      const depthValue = `${parsed.value}${parsed.unit ? ` ${parsed.unit}` : ' feet'}`
      setCatchData(prev => ({ ...prev, depth: depthValue }))
      
      setVoiceState(VOICE_STATES.WAITING_FOR_CATCH)
      await speak(VOICE_PROMPTS.DEPTH_CONFIRMED)
      
      // Set 30-second timer
      timerRef.current = setTimeout(async () => {
        await speak(VOICE_PROMPTS.CHECK_CATCH)
        startListening()
      }, 30000)
      
    } else {
      await speak("I didn't catch that depth. Could you repeat it?")
      startListening()
    }
  }, [speak, startListening])

  // Handle catch confirmation
  const handleCatchConfirmed = useCallback(async () => {
    clearTimer()
    setVoiceState(VOICE_STATES.COLLECTING_SPECIES)
    await speak(VOICE_PROMPTS.CATCH_CONFIRMED)
    startListening()
  }, [speak, startListening, clearTimer])

  // Handle species input
  const handleSpeciesInput = useCallback(async (transcript) => {
    const species = parseSpecies(transcript)
    if (species) {
      setCatchData(prev => ({ ...prev, species }))
      setVoiceState(VOICE_STATES.COLLECTING_LENGTH)
      await speak(VOICE_PROMPTS.ASK_LENGTH)
      startListening()
    } else {
      await speak("I didn't recognize that species. Could you repeat it?")
      startListening()
    }
  }, [speak, startListening])

  // Handle length input
  const handleLengthInput = useCallback(async (transcript) => {
    const parsed = parseNumberFromSpeech(transcript)
    if (parsed && parsed.value > 0) {
      const lengthValue = `${parsed.value}${parsed.unit || ' inches'}`
      setCatchData(prev => ({ ...prev, length: lengthValue }))
      
      setVoiceState(VOICE_STATES.COLLECTING_WEIGHT)
      await speak(VOICE_PROMPTS.ASK_WEIGHT)
      startListening()
    } else {
      await speak("I didn't catch that length. Could you repeat it?")
      startListening()
    }
  }, [speak, startListening])

  // Handle weight input
  const handleWeightInput = useCallback(async (transcript) => {
    const parsed = parseNumberFromSpeech(transcript)
    if (parsed && parsed.value > 0) {
      const weightValue = `${parsed.value}${parsed.unit || ' pounds'}`
      setCatchData(prev => ({ ...prev, weight: weightValue }))
      
      setVoiceState(VOICE_STATES.COLLECTING_LURE)
      await speak(VOICE_PROMPTS.ASK_LURE)
      startListening()
    } else {
      await speak("I didn't catch that weight. Could you repeat it?")
      startListening()
    }
  }, [speak, startListening])

  // Handle lure input
  const handleLureInput = useCallback(async (transcript) => {
    const lure = parseLure(transcript)
    if (lure) {
      setCatchData(prev => ({ ...prev, lureType: lure }))
      setVoiceState(VOICE_STATES.TAKING_PHOTO)
      await speak(VOICE_PROMPTS.PHOTO_TIME)
      // Note: Photo capture will be handled by parent component
    } else {
      await speak("I didn't recognize that lure. Could you repeat it?")
      startListening()
    }
  }, [speak, startListening])

  // Reset the voice logger
  const reset = useCallback(() => {
    clearTimer()
    VoiceService.stopListening()
    VoiceService.stopSpeaking()
    setVoiceState(VOICE_STATES.IDLE)
    setIsListening(false)
    setIsSpeaking(false)
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
    setError(null)
  }, [clearTimer])

  // Stop current voice operations
  const stop = useCallback(() => {
    clearTimer()
    VoiceService.stopListening()
    VoiceService.stopSpeaking()
    setIsListening(false)
    setIsSpeaking(false)
  }, [clearTimer])

  // Manual trigger for mark fish (for testing or button)
  const triggerMarkFish = useCallback(() => {
    if (voiceState === VOICE_STATES.IDLE) {
      handleMarkFish()
    }
  }, [voiceState, handleMarkFish])

  return {
    // State
    voiceState,
    isListening,
    isSpeaking,
    catchData,
    error,
    voiceSupported,
    
    // Actions
    startListening,
    stop,
    reset,
    triggerMarkFish,
    
    // Voice state checks
    isIdle: voiceState === VOICE_STATES.IDLE,
    isWaitingForCatch: voiceState === VOICE_STATES.WAITING_FOR_CATCH,
    isCollectingData: [
      VOICE_STATES.COLLECTING_DEPTH,
      VOICE_STATES.COLLECTING_SPECIES,
      VOICE_STATES.COLLECTING_LENGTH,
      VOICE_STATES.COLLECTING_WEIGHT,
      VOICE_STATES.COLLECTING_LURE
    ].includes(voiceState),
    isReadyForPhoto: voiceState === VOICE_STATES.TAKING_PHOTO
  }
}