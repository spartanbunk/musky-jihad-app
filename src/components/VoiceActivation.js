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
  DEPTH_CONFIRMED: "Fish marked, now go catch it! Say 'I got one' when you do.",
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
  const { authenticatedFetch } = useAuth()
  const [isListening, setIsListening] = useState(false)
  const [weatherLoaded, setWeatherLoaded] = useState(false)
  const [pendingVoiceStart, setPendingVoiceStart] = useState(false)

  // Track when weather data is available
  useEffect(() => {
    if (currentConditions && Object.keys(currentConditions).length > 0) {
      setWeatherLoaded(true)

      // Auto-start voice workflow if user tried to start before weather loaded
      if (pendingVoiceStart) {
        setPendingVoiceStart(false)
        setTimeout(() => {
          speak("Weather data loaded! Let's start the voice workflow.")
          // Small delay to let speech finish before starting recognition
          setTimeout(() => {
            if (recognitionRef.current && !isListening) {
              try {
                recognitionRef.current.start()
              } catch (error) {
                // Handle potential error silently or with UI feedback
              }
            }
          }, 2000)
        }, 500)
      }
    } else {
      setWeatherLoaded(false)
    }
  }, [currentConditions, pendingVoiceStart, isListening])

  // State recovery mechanism for refresh scenarios
  useEffect(() => {
    // Check if we're recovering from a refresh
    const savedState = sessionStorage.getItem('voiceWorkflowState')
    if (savedState) {
      const parsed = JSON.parse(savedState)

      // If we were in middle of workflow, reset to safe state
      if (parsed.voiceState && parsed.voiceState !== VOICE_STATES.IDLE) {
        // Clear the saved state
        sessionStorage.removeItem('voiceWorkflowState')

        // Notify user
        setTimeout(() => {
          speak("Voice session was interrupted. Please start over by saying 'mark fish'.")
        }, 1000)
      }
    }
  }, [])

  // Save state before unload for recovery
  useEffect(() => {
    const handleBeforeUnload = () => {
      const stateToSave = {
        voiceState: voiceStateRef.current,
        catchData: catchDataRef.current,
        tempData: tempDataRef.current,
        timestamp: new Date().toISOString()
      }
      sessionStorage.setItem('voiceWorkflowState', JSON.stringify(stateToSave))
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Helper function to get field display status
  const getFieldStatus = (confirmedValue, tempValue, unit = '', fieldName = '') => {
    let result
    if (confirmedValue) {
      result = {
        icon: '✅',
        color: '#16a34a',
        textColor: '#065f46',
        text: `${confirmedValue}${unit}`
      }
    } else if (tempValue) {
      result = {
        icon: '⏳',
        color: '#f59e0b',
        textColor: '#92400e',
        text: `${tempValue}${unit} (confirming)`
      }
    } else {
      result = {
        icon: '⭕',
        color: '#64748b',
        textColor: '#64748b',
        text: 'Pending'
      }
    }
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
  const [lastHeardCommand, setLastHeardCommand] = useState('')
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)
  const retryTimerRef = useRef(null)
  const voiceStateRef = useRef(VOICE_STATES.IDLE)
  const fileInputRef = useRef(null);

  const catchDataRef = useRef(catchData)
  const tempDataRef = useRef(tempData)

  // Sync refs with state for voice handlers (refs don't trigger re-renders)
  useEffect(() => {
    voiceStateRef.current = voiceState
    catchDataRef.current = catchData
    tempDataRef.current = tempData
  }, [voiceState, catchData, tempData])

  const updateVoiceState = (newState) => {
    setVoiceState(newState)
  }


  // PHASE 1: Initialize recognition object once
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognition) {
      setIsSupported(true)

      try {
        const recognition = new SpeechRecognition()
        recognitionRef.current = recognition

        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = 'en-US'

        recognition.onstart = () => {
          setIsListening(true)
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognition.onerror = (event) => {
          setIsListening(false)
        }

        Promise.resolve().then(() => {
          if (recognitionRef.current && typeof bindRecognitionHandler === 'function') {
            bindRecognitionHandler()
          }
        })

      } catch (error) {
        setIsSupported(false)
      }
    } else {
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
  const bindRecognitionHandler = useCallback(() => {
    if (!recognitionRef.current) {
      return
    }

    recognitionRef.current.onresult = async (event) => {
      const command = event.results[0][0].transcript.toLowerCase()
      const confidence = event.results[0][0].confidence

      if (typeof setLastCommand === 'function') {
        setLastCommand(command)
      }
      await handleVoiceResult(command, confidence)
    }
  }, [])

  useEffect(() => {
    if (recognitionRef.current) {
      bindRecognitionHandler()
    }
  }, [bindRecognitionHandler])

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

  const safeRestartRecognition = async (delayMs = 500) => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // Recognition was not running
      }
    }

    await new Promise(resolve => setTimeout(resolve, delayMs))

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
      } catch (e) {
        // Failed to start recognition
      }
    }
  }

  const speak = async (text) => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        setIsSpeaking(false)
        resolve()
        return
      }

      window.speechSynthesis.cancel()

      setIsSpeaking(true)
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.8
      utterance.pitch = 1.0
      utterance.volume = 1.0

      utterance.onstart = () => {
        // Speech started
      }

      utterance.onend = () => {
        setIsSpeaking(false)
        resolve()
      }

      utterance.onerror = (error) => {
        setIsSpeaking(false)
        resolve()
      }

      utterance.onboundary = (event) => {
        // Speech boundary event
      }

      window.speechSynthesis.speak(utterance)

      setTimeout(() => {
        if (isSpeaking) {
          window.speechSynthesis.cancel()
          setIsSpeaking(false)
          resolve()
        }
      }, 10000) // 10 second timeout
    })
  }

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

        startRetryTimer(fieldType, prompt, maxRetries)
      } else {
        await speak(`I'm having trouble hearing the ${fieldType}. Let's continue and you can enter it manually later.`)
        moveToNextField()
      }
    }, 20000) // 20 seconds
  }

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

        startCatchConfirmationTimer()
      } else {
        await speak(VOICE_PROMPTS.MAX_RETRIES)
        resetVoiceWorkflow()
      }
    }, 20000) // 20 seconds
  }

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
        return
      case VOICE_STATES.COLLECTING_WEIGHT:
        return
      case VOICE_STATES.COLLECTING_LURE:
        break
    }
  }

  const handleVoiceResult = async (transcript, confidence) => {
    const currentState = voiceStateRef.current
    
    switch (currentState) {
      case VOICE_STATES.IDLE:
        const isMarkCommand = isMarkFishCommand(transcript)
        if (isMarkCommand) {
          await handleMarkFish()
        }
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
        await handleLureInput(transcript)
        break
      case VOICE_STATES.CONFIRMING_LURE:
        await handleLureConfirmation(transcript)
        break
      default:
        // Voice input ignored in current state
    }
  }

  const handleMarkFish = async () => {
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

      setVoiceState(VOICE_STATES.COLLECTING_DEPTH)
      voiceStateRef.current = VOICE_STATES.COLLECTING_DEPTH

      await speak(VOICE_PROMPTS.ASK_DEPTH_FIRST)

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          // Recognition already stopped
        }

        setTimeout(() => {
          if (recognitionRef.current) {
            try {
              recognitionRef.current.start()
            } catch (e) {
              // Failed to restart recognition
            }
          }
        }, 500)
      }
      startRetryTimer('depth', VOICE_PROMPTS.ASK_DEPTH_FIRST)
    } catch (error) {
      await speak('Unable to get location. Please try again.')
    }
  }

  const handleDepthInput = async (transcript) => {
    setLastHeardCommand(transcript)
    clearTimeout(retryTimerRef.current)

    const parsed = parseNumberFromSpeech(transcript)

    if (parsed && parsed.value > 0) {
      const depthValue = `${parsed.value}`
      setTempData(prev => ({ ...prev, depth: depthValue }))
      setRetryCounters(prev => ({ ...prev, depth: 0 }))
      setVoiceState(VOICE_STATES.CONFIRMING_DEPTH)
      voiceStateRef.current = VOICE_STATES.CONFIRMING_DEPTH

      await speak(VOICE_PROMPTS.CONFIRM_DEPTH(depthValue))

      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
    } else {
      await speak("I didn't catch that depth. Could you repeat it?")
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
      startRetryTimer('depth', VOICE_PROMPTS.ASK_DEPTH_FIRST)
    }
  }

  const handleDepthConfirmation = async (transcript) => {
    setLastHeardCommand(transcript);
    const confirmation = isCatchConfirmation(transcript);

    if (confirmation.isResponse) {
        if (confirmation.confirmed) {
            const depthValue = tempDataRef.current.depth;
            if (!depthValue) {
                return;
            }

            setCatchData(prev => ({ ...prev, depth: depthValue }));
            setTempData(prev => ({ ...prev, depth: '' }));

            window.dispatchEvent(new CustomEvent('voiceWorkflowComplete', {
                detail: {
                    workflowStage: 'depth_confirmed',
                    latitude: catchDataRef.current.latitude,
                    longitude: catchDataRef.current.longitude,
                    depth: depthValue,
                    species: '',
                    length: '',
                    weight: '',
                    lureType: '',
                    photoUrl: ''
                }
            }));

            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    // Recognition already stopped
                }
            }
            
            await speak(`Depth set to ${depthValue} feet.`);
            await new Promise(resolve => setTimeout(resolve, 500));

            setVoiceState(VOICE_STATES.WAITING_FOR_CATCH);
            voiceStateRef.current = VOICE_STATES.WAITING_FOR_CATCH;

            await speak(VOICE_PROMPTS.DEPTH_CONFIRMED);
            
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                } catch (e) {
                    // Failed to start
                }
            }
            startCatchConfirmationTimer();
        } else {
            setTempData(prev => ({ ...prev, depth: '' }));
            setVoiceState(VOICE_STATES.COLLECTING_DEPTH);
            voiceStateRef.current = VOICE_STATES.COLLECTING_DEPTH;
            await speak(VOICE_PROMPTS.RECOLLECT_DEPTH);

            await new Promise(resolve => setTimeout(resolve, 1000));
            if (recognitionRef.current && !isListening) {
                try {
                    recognitionRef.current.start();
                } catch (e) {
                    // Failed to start
                }
            }
        }
    }
};

  const handleCatchConfirmed = async () => {
    clearTimer()
    setRetryCounters(prev => ({ ...prev, catchConfirmation: 0 }))
    setVoiceState(VOICE_STATES.COLLECTING_SPECIES)
    voiceStateRef.current = VOICE_STATES.COLLECTING_SPECIES
    await speak(VOICE_PROMPTS.CATCH_CONFIRMED)

    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start()
    }

    startRetryTimer('species', VOICE_PROMPTS.CATCH_CONFIRMED)
  }

  const handleCatchNotConfirmed = async () => {
    clearTimer()
    await speak(VOICE_PROMPTS.CATCH_FAILED)
    resetVoiceWorkflow()
  }

  const handleSpeciesInput = async (transcript) => {
    setLastHeardCommand(transcript)
    clearTimeout(retryTimerRef.current)

    const species = parseSpecies(transcript)
    if (species) {
      setTempData(prev => ({ ...prev, species }))
      setRetryCounters(prev => ({ ...prev, species: 0 }))
      setVoiceState(VOICE_STATES.CONFIRMING_SPECIES)
      voiceStateRef.current = VOICE_STATES.CONFIRMING_SPECIES

      await speak(VOICE_PROMPTS.CONFIRM_SPECIES(species))

      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
    } else {
      await speak("I didn't recognize that species. Could you repeat it?")
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
      startRetryTimer('species', "What species is it?")
    }
  }

  const handleSpeciesConfirmation = async (transcript) => {
    setLastHeardCommand(transcript)
    const confirmation = isCatchConfirmation(transcript)

    if (confirmation.isResponse) {
      if (confirmation.confirmed) {
        const speciesValue = tempDataRef.current.species
        if (!speciesValue) {
          return
        }
        
        setCatchData(prev => ({ ...prev, species: speciesValue }))
        setTempData(prev => ({ ...prev, species: '' }))
        
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
        
        // Stop recognition before speaking
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop()
          } catch (e) {
            // Recognition already stopped
          }
        }
        
        await speak(`Perfect! Species set to ${speciesValue}.`)
        
        // Wait a moment before next speech
        await new Promise(resolve => setTimeout(resolve, 500))
        
        setVoiceState(VOICE_STATES.COLLECTING_LENGTH)
        voiceStateRef.current = VOICE_STATES.COLLECTING_LENGTH
        
        await speak("Great! How long is it?")
        
        // Wait for speech to fully complete before starting recognition
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        if (recognitionRef.current && voiceStateRef.current === VOICE_STATES.COLLECTING_LENGTH) {
          try {
            recognitionRef.current.start()
          } catch (e) {
            // Failed to restart recognition
          }
        }
        
        startRetryTimer('length', "How long is it?")
      } else {
        setTempData(prev => ({ ...prev, species: '' }))
        setVoiceState(VOICE_STATES.COLLECTING_SPECIES)
        voiceStateRef.current = VOICE_STATES.COLLECTING_SPECIES
        await speak(VOICE_PROMPTS.RECOLLECT_SPECIES)

        // Wait before restarting recognition
        await new Promise(resolve => setTimeout(resolve, 1000))

        if (recognitionRef.current && !isListening) {
          try {
            recognitionRef.current.start()
          } catch (e) {
            // Failed to restart recognition
          }
        }
      }
    }
  }

  const handleLengthInput = async (transcript) => {
    setLastHeardCommand(transcript)
    clearTimeout(retryTimerRef.current)

    const parsed = parseNumberFromSpeech(transcript)
    if (parsed && parsed.value > 0) {
      const lengthValue = `${parsed.value}`
      setTempData(prev => ({ ...prev, length: lengthValue }))
      setRetryCounters(prev => ({ ...prev, length: 0 }))
      setVoiceState(VOICE_STATES.CONFIRMING_LENGTH)
      voiceStateRef.current = VOICE_STATES.CONFIRMING_LENGTH

      await speak(VOICE_PROMPTS.CONFIRM_LENGTH(lengthValue))

      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
    } else {
      await speak("I didn't catch that length. Could you repeat it?")
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
      startRetryTimer('length', VOICE_PROMPTS.ASK_LENGTH)
    }
  }

  const handleLengthConfirmation = async (transcript) => {
    setLastHeardCommand(transcript)
    const confirmation = isCatchConfirmation(transcript)

    if (confirmation.isResponse) {
      if (confirmation.confirmed) {
        const lengthValue = tempDataRef.current.length
        if (!lengthValue) {
          return
        }
        
        setCatchData(prev => ({ ...prev, length: lengthValue }))
        setTempData(prev => ({ ...prev, length: '' }))
        
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
        
        // Stop recognition before speaking
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop()
          } catch (e) {
            // Recognition already stopped
          }
        }
        
        await speak(`Perfect! Length set to ${lengthValue} inches.`)
        
        // Wait a moment before next speech
        await new Promise(resolve => setTimeout(resolve, 500))
        
        setVoiceState(VOICE_STATES.COLLECTING_WEIGHT)
        voiceStateRef.current = VOICE_STATES.COLLECTING_WEIGHT
        
        await speak(VOICE_PROMPTS.ASK_WEIGHT)
        
        // Wait for speech to fully complete before starting recognition
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        if (recognitionRef.current && voiceStateRef.current === VOICE_STATES.COLLECTING_WEIGHT) {
          try {
            recognitionRef.current.start()
          } catch (e) {
            // Failed to restart recognition
          }
        }
        
        startRetryTimer('weight', "What's the weight?")
      } else {
        setTempData(prev => ({ ...prev, length: '' }))
        setVoiceState(VOICE_STATES.COLLECTING_LENGTH)
        voiceStateRef.current = VOICE_STATES.COLLECTING_LENGTH
        await speak(VOICE_PROMPTS.RECOLLECT_LENGTH)

        // Wait before restarting recognition
        await new Promise(resolve => setTimeout(resolve, 1000))

        if (recognitionRef.current && !isListening) {
          try {
            recognitionRef.current.start()
          } catch (e) {
            // Failed to restart recognition
          }
        }
      }
    }
  }

  const handleWeightInput = async (transcript) => {
    setLastHeardCommand(transcript)
    clearTimeout(retryTimerRef.current)

    const parsed = parseNumberFromSpeech(transcript)
    if (parsed && parsed.value > 0) {
      const weightValue = `${parsed.value}`
      setTempData(prev => ({ ...prev, weight: weightValue }))
      setRetryCounters(prev => ({ ...prev, weight: 0 }))
      setVoiceState(VOICE_STATES.CONFIRMING_WEIGHT)
      voiceStateRef.current = VOICE_STATES.CONFIRMING_WEIGHT
      await speak(VOICE_PROMPTS.CONFIRM_WEIGHT(weightValue))
      await safeRestartRecognition(800)
    } else {
      await speak("I didn't catch that weight. Could you repeat it?")
      await safeRestartRecognition(800)
      startRetryTimer('weight', VOICE_PROMPTS.ASK_WEIGHT)
    }
  }

  const handleWeightConfirmation = async (transcript) => {
    setLastHeardCommand(transcript)
    const confirmation = isCatchConfirmation(transcript)
    if (confirmation.isResponse) {
      if (confirmation.confirmed) {
        const weightValue = tempDataRef.current.weight
        if (!weightValue) {
          return
        }
        
        setCatchData(prev => ({ ...prev, weight: weightValue }))
        setTempData(prev => ({ ...prev, weight: '' }))
        
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
        
        setVoiceState(VOICE_STATES.COLLECTING_LURE)
        voiceStateRef.current = VOICE_STATES.COLLECTING_LURE
        await speak(VOICE_PROMPTS.ASK_LURE)
        
        await safeRestartRecognition(800)
        startRetryTimer('lure', VOICE_PROMPTS.ASK_LURE)
      } else {
        setTempData(prev => ({ ...prev, weight: '' }))
        setVoiceState(VOICE_STATES.COLLECTING_WEIGHT)
        voiceStateRef.current = VOICE_STATES.COLLECTING_WEIGHT
        await speak(VOICE_PROMPTS.RECOLLECT_WEIGHT)
        await safeRestartRecognition(800)
      }
    }
  }

  const handleLureInput = async (transcript) => {
    setLastHeardCommand(transcript)
    clearTimeout(retryTimerRef.current)

    const lure = parseLure(transcript)

    if (lure) {
      setTempData(prev => ({ ...prev, lureType: lure }))
      setRetryCounters(prev => ({ ...prev, lure: 0 }))
      setVoiceState(VOICE_STATES.CONFIRMING_LURE)
      voiceStateRef.current = VOICE_STATES.CONFIRMING_LURE
      await speak(VOICE_PROMPTS.CONFIRM_LURE(lure))
      await safeRestartRecognition(800)
    } else {
      await speak("I didn't recognize that lure. Could you repeat it?")
      await safeRestartRecognition(800)
      startRetryTimer('lure', VOICE_PROMPTS.ASK_LURE)
    }
  }

  const handleLureConfirmation = async (transcript) => {
    setLastHeardCommand(transcript)
    const confirmation = isCatchConfirmation(transcript)

    if (confirmation.isResponse) {
      if (confirmation.confirmed) {
        const lureValue = tempDataRef.current.lureType
        if (!lureValue) {
          // Handle potential error
        }
        if (!lureValue) {
          return
        }
        
        setCatchData(prev => ({ ...prev, lureType: lureValue }))
        setTempData(prev => ({ ...prev, lureType: '' }))
        
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
        
        await speak(`Perfect! Lure set to ${lureValue}.`)
        
        setVoiceState(VOICE_STATES.TAKING_PHOTO)
        voiceStateRef.current = VOICE_STATES.TAKING_PHOTO
        await speak(VOICE_PROMPTS.PHOTO_TIME)
      } else {
        setTempData(prev => ({ ...prev, lureType: '' }))
        setVoiceState(VOICE_STATES.COLLECTING_LURE)
        voiceStateRef.current = VOICE_STATES.COLLECTING_LURE
        await speak(VOICE_PROMPTS.RECOLLECT_LURE)
        await safeRestartRecognition(800)
      }
    }
  }

  const handlePhotoCapture = () => {
    if (fileInputRef.current) {
        fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
        await uploadAndSubmitCatch(file);
    }
    // Reset the input value to allow selecting the same file again
    event.target.value = null;
  };


  const uploadAndSubmitCatch = async (photoFile) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      let photoUrl = null

      if (photoFile) {
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

        setTimeout(() => {
          resetVoiceWorkflow()
        }, 3000)
      } else {
        throw new Error('Failed to save catch')
      }
    } catch (error) {
      setSubmitError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkipPhoto = async () => {
    await uploadAndSubmitCatch(null)
  }

  const resetVoiceWorkflow = () => {
    clearTimer()
    setVoiceState(VOICE_STATES.IDLE)
    voiceStateRef.current = VOICE_STATES.IDLE
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
    if (!weatherLoaded) {
      setPendingVoiceStart(true)
      speak("Please wait while I load the current weather conditions...")
      return
    }

    if (recognitionRef.current && !isListening) {
      if (voiceState === VOICE_STATES.IDLE) {
        resetVoiceWorkflow()
      }
      try {
        recognitionRef.current.start()
      } catch (error) {
        // Handle failed recognition start
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
    if (window.speechSynthesis && isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
    clearTimer()
  }

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
        
        {voiceState === VOICE_STATES.TAKING_PHOTO && !isSubmitting && (
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
            <input
                type="file"
                accept="image/*"
                capture="camera"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
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
        {(() => {
          const shouldShow = voiceState !== VOICE_STATES.IDLE ||
            Object.keys(catchData).some(key => catchData[key] && key !== 'latitude' && key !== 'longitude') ||
            Object.keys(tempData).some(key => tempData[key])
            
          return shouldShow
        })() && (
          <div
            key="voice-progress-display"
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: catchData.latitude && catchData.longitude ? '#16a34a' : '#64748b' }}>
                  {catchData.latitude && catchData.longitude ? '✅' : '⭕'}
                </span>
                <span style={{ color: catchData.latitude && catchData.longitude ? '#065f46' : '#64748b' }}>
                  Location: {catchData.latitude && catchData.longitude ? 'Captured' : 'Pending'}
                </span>
              </div>
              
              {(() => {
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

if (typeof window !== 'undefined') {
  window.triggerVoiceCommand = () => {
    const event = new CustomEvent('triggerVoiceCommand')
    window.dispatchEvent(event)
  }
}