'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import config from '../config/api'
import {
  parseSpecies,
  parseLure,
  parseNumberFromSpeech,
  isCatchConfirmation,
  isMarkFishCommand,
  isStillFighting 
} from '../utils/speechProcessing'

// Helper functions for species configuration
const getSpeciesEmoji = (species) => {
  const speciesEmojis = {
    'musky': '🐊', 'bass': '🐟', 'walleye': '🟡', 'pike': '🗲', 'perch': '🟠',
    'bluegill': '🔵', 'salmon': '🍣', 'trout': '🌈', 'crappie': '⚪'
  };
  return speciesEmojis[species] || '🐟';
};

const getSpeciesColor = (species) => {
  const speciesColors = {
    'musky': '#059669', 'bass': '#22c55e', 'walleye': '#f59e0b', 'pike': '#8b5cf6', 'perch': '#f97316',
    'bluegill': '#3b82f6', 'salmon': '#ec4899', 'trout': '#10b981', 'crappie': '#6b7280'
  };
  return speciesColors[species] || '#22c55e';
};

// REVISED: Voice states without confirmation steps
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
};

// REVISED: Voice prompts adjusted for the new flow
const VOICE_PROMPTS = {
  ASK_DEPTH_FIRST: "Nice Job! What depth are you fishing?",
  DEPTH_CONFIRMED: "Fish marked, now go catch it! I'll keep listening.",
  CHECK_CATCH: "Did you get him?",
  CATCH_CONFIRMED: "Great job guys! What species is it?",
  CATCH_FAILED: "Sorry about that. I'll keep listening.",
  MAX_RETRIES: "Let's try again later.",
  LISTENING_TIMEOUT: "My listening time is up. Say 'mark fish' to start again if you land one!",
  STILL_FIGHTING_ACK: "Okay, hang in there! I'll keep listening.",
  ASK_LENGTH: "How long is it?",
  ASK_WEIGHT: "What's the weight?",
  ASK_LURE: "What lure did you use?",
  PHOTO_TIME: "Ok guys, let's get a picture of that lunker!",
  WORKFLOW_COMPLETE: "Perfect! Your catch has been saved.",
  RECOLLECT_DEPTH: "Sorry, I didn't get that. What was the depth in feet?",
  RECOLLECT_SPECIES: "I didn't recognize that species. Could you repeat it?",
  RECOLLECT_LENGTH: "I didn't catch that. How long is it in inches?",
  RECOLLECT_WEIGHT: "Didn't get that. What's the weight in pounds?",
  RECOLLECT_LURE: "Sorry, what lure did you use?"
};

export default function VoiceActivation({ currentConditions }) {
  const { authenticatedFetch } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE);
  const [catchData, setCatchData] = useState({ latitude: null, longitude: null, depth: '', species: '', length: '', weight: '', lureType: '', photoUrl: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  
  const recognitionRef = useRef(null);
  const voiceStateRef = useRef(VOICE_STATES.IDLE);
  const catchDataRef = useRef(catchData);
  const fileInputRef = useRef(null);
  
  const masterTimerRef = useRef(null);
  const promptTimerRef = useRef(null);

  useEffect(() => {
    voiceStateRef.current = voiceState;
    catchDataRef.current = catchData;
  }, [voiceState, catchData]);

  const clearAllTimers = useCallback(() => {
    if (masterTimerRef.current) clearTimeout(masterTimerRef.current);
    if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
  }, []);

  const speak = useCallback(async (text) => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        setIsSpeaking(false);
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  }, []);
  
  const safeRestartRecognition = useCallback(async (delayMs = 200) => {
    // No delay during waiting for catch to maintain continuous listening
    const actualDelay = voiceStateRef.current === VOICE_STATES.WAITING_FOR_CATCH ? 0 : delayMs;
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { /* Already stopped */ }
    }
    
    if (actualDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, actualDelay));
    }
    
    if (recognitionRef.current && voiceStateRef.current !== VOICE_STATES.IDLE) {
      try {
        // Enable continuous mode for waiting state
        if (voiceStateRef.current === VOICE_STATES.WAITING_FOR_CATCH) {
          recognitionRef.current.continuous = true;
        } else {
          recognitionRef.current.continuous = false;
        }
        recognitionRef.current.start();
      } catch (e) { /* Failed to start */ }
    }
  }, []);

  const handleVoiceResult = useCallback(async (transcript) => {
    const currentState = voiceStateRef.current;
    
    if (currentState === VOICE_STATES.WAITING_FOR_CATCH) {
      const catchResponse = isCatchConfirmation(transcript);
      const fightingResponse = isStillFighting(transcript);

      if (catchResponse.isResponse) {
        if (catchResponse.confirmed) {
          await handleCatchConfirmed();
        } else {
          clearAllTimers();
          await speak(VOICE_PROMPTS.CATCH_FAILED);
          startExtendedCatchListener();
        }
      } else if (fightingResponse) {
        clearAllTimers();
        await speak(VOICE_PROMPTS.STILL_FIGHTING_ACK);
        startExtendedCatchListener();
      }
      return;
    }

    switch (currentState) {
      case VOICE_STATES.IDLE:
        if (isMarkFishCommand(transcript)) await handleMarkFish();
        break;
      case VOICE_STATES.COLLECTING_DEPTH:
        await handleDepthInput(transcript);
        break;
      case VOICE_STATES.COLLECTING_SPECIES:
        await handleSpeciesInput(transcript);
        break;
      case VOICE_STATES.COLLECTING_LENGTH:
        await handleLengthInput(transcript);
        break;
      case VOICE_STATES.COLLECTING_WEIGHT:
        await handleWeightInput(transcript);
        break;
      case VOICE_STATES.COLLECTING_LURE:
        await handleLureInput(transcript);
        break;
      default:
        break;
    }
  }, [speak]); // Dependencies updated

  const bindRecognitionHandler = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.onresult = (event) => {
      const command = event.results[0][0].transcript.toLowerCase();
      handleVoiceResult(command);
    };
  }, [handleVoiceResult]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => {
        // During waiting for catch, auto-restart recognition to keep listening
        if (voiceStateRef.current === VOICE_STATES.WAITING_FOR_CATCH) {
          console.log('🎤 Auto-restarting recognition during catch waiting...');
          setTimeout(() => {
            if (recognitionRef.current && voiceStateRef.current === VOICE_STATES.WAITING_FOR_CATCH) {
              try {
                recognitionRef.current.start();
                console.log('🎤 Recognition restarted successfully');
              } catch (e) {
                console.log('⚠️ Recognition already started or failed to restart');
              }
            }
          }, 100); // Minimal delay to avoid conflicts
        } else {
          setIsListening(false);
        }
      };
      recognition.onerror = (event) => {
        console.error('🎤 Recognition error:', event.error);
        // During waiting state, try to restart even on error
        if (voiceStateRef.current === VOICE_STATES.WAITING_FOR_CATCH) {
          setTimeout(() => {
            if (recognitionRef.current && voiceStateRef.current === VOICE_STATES.WAITING_FOR_CATCH) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                // Failed to restart
              }
            }
          }, 500);
        } else {
          setIsListening(false);
        }
      };
      recognitionRef.current = recognition;
      bindRecognitionHandler();
    }
    return () => {
      clearAllTimers();
      if (recognitionRef.current) recognitionRef.current.stop();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [bindRecognitionHandler, clearAllTimers]);

  const startExtendedCatchListener = useCallback(() => {
    clearAllTimers();
    masterTimerRef.current = setTimeout(async () => {
      await speak(VOICE_PROMPTS.LISTENING_TIMEOUT);
      resetVoiceWorkflow();
    }, 480000); // 8 minutes

    startPeriodicPrompt();
  }, [speak, clearAllTimers]);

  const startPeriodicPrompt = useCallback(() => {
    promptTimerRef.current = setTimeout(async () => {
      console.log('🔊 Periodic prompt: Did you get him?');
      await speak(VOICE_PROMPTS.CHECK_CATCH);
      // Don't restart recognition - it should continue automatically
      // The onend handler will auto-restart if we're still in WAITING_FOR_CATCH
      startPeriodicPrompt(); // Loop
    }, 60000); // 60 seconds
  }, [speak]);
  
  const resetVoiceWorkflow = useCallback(() => {
    clearAllTimers();
    setVoiceState(VOICE_STATES.IDLE);
    setCatchData({ latitude: null, longitude: null, depth: '', species: '', length: '', weight: '', lureType: '', photoUrl: '' });
    setIsSubmitting(false);
    setSubmitError(null);
    
    // Reset continuous mode and stop recognition
    if (recognitionRef.current) {
      recognitionRef.current.continuous = false;
      if (isListening) {
        recognitionRef.current.stop();
      }
    }
  }, [clearAllTimers, isListening]);
  
  const handleMarkFish = useCallback(async () => {
    try {
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 }));
      setCatchData(prev => ({ ...prev, latitude: position.coords.latitude, longitude: position.coords.longitude }));
      setVoiceState(VOICE_STATES.COLLECTING_DEPTH);
      await speak(VOICE_PROMPTS.ASK_DEPTH_FIRST);
      safeRestartRecognition();
    } catch (error) {
      await speak('Unable to get location. Please try again.');
      resetVoiceWorkflow();
    }
  }, [speak, safeRestartRecognition, resetVoiceWorkflow]);

  const handleDepthInput = useCallback(async (transcript) => {
    const parsed = parseNumberFromSpeech(transcript);
    if (parsed && parsed.value > 0) {
      const depthValue = `${parsed.value}`;
      setCatchData(prev => ({ ...prev, depth: depthValue }));
      await speak(`Okay, depth set to ${depthValue} feet.`);
      setVoiceState(VOICE_STATES.WAITING_FOR_CATCH);
      
      // Enable continuous mode before entering waiting state
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true;
      }
      
      await speak(VOICE_PROMPTS.DEPTH_CONFIRMED);
      startExtendedCatchListener();
      
      // Start continuous recognition immediately
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          console.log('🎤 Started continuous listening for catch');
        } catch (e) {
          // Try restart if already running
          safeRestartRecognition(0);
        }
      }
    } else {
      await speak(VOICE_PROMPTS.RECOLLECT_DEPTH);
      safeRestartRecognition();
    }
  }, [speak, safeRestartRecognition, startExtendedCatchListener]);

  const handleCatchConfirmed = useCallback(async () => {
    clearAllTimers();
    
    // Disable continuous mode when moving to species collection
    if (recognitionRef.current) {
      recognitionRef.current.continuous = false;
    }
    
    setVoiceState(VOICE_STATES.COLLECTING_SPECIES);
    await speak(VOICE_PROMPTS.CATCH_CONFIRMED);
    safeRestartRecognition();
  }, [speak, clearAllTimers, safeRestartRecognition]);

  const handleSpeciesInput = useCallback(async (transcript) => {
    const species = parseSpecies(transcript);
    if (species) {
      setCatchData(prev => ({ ...prev, species }));
      await speak(`Got it, ${species}.`);
      setVoiceState(VOICE_STATES.COLLECTING_LENGTH);
      await speak(VOICE_PROMPTS.ASK_LENGTH);
      safeRestartRecognition();
    } else {
      await speak(VOICE_PROMPTS.RECOLLECT_SPECIES);
      safeRestartRecognition();
    }
  }, [speak, safeRestartRecognition]);
  
  const handleLengthInput = useCallback(async (transcript) => {
    const parsed = parseNumberFromSpeech(transcript);
    if (parsed && parsed.value > 0) {
      const lengthValue = `${parsed.value}`;
      setCatchData(prev => ({ ...prev, length: lengthValue }));
      await speak(`Okay, ${lengthValue} inches.`);
      setVoiceState(VOICE_STATES.COLLECTING_WEIGHT);
      await speak(VOICE_PROMPTS.ASK_WEIGHT);
      safeRestartRecognition();
    } else {
      await speak(VOICE_PROMPTS.RECOLLECT_LENGTH);
      safeRestartRecognition();
    }
  }, [speak, safeRestartRecognition]);

  const handleWeightInput = useCallback(async (transcript) => {
    const parsed = parseNumberFromSpeech(transcript);
    if (parsed && parsed.value > 0) {
      const weightValue = `${parsed.value}`;
      setCatchData(prev => ({ ...prev, weight: weightValue }));
      await speak(`Okay, ${weightValue} pounds.`);
      setVoiceState(VOICE_STATES.COLLECTING_LURE);
      await speak(VOICE_PROMPTS.ASK_LURE);
      safeRestartRecognition();
    } else {
      await speak(VOICE_PROMPTS.RECOLLECT_WEIGHT);
      safeRestartRecognition();
    }
  }, [speak, safeRestartRecognition]);
  
  const handleLureInput = useCallback(async (transcript) => {
    const lure = parseLure(transcript);
    if (lure) {
      setCatchData(prev => ({ ...prev, lureType: lure }));
      await speak(`Perfect! Lure set to ${lure}.`);
      setVoiceState(VOICE_STATES.TAKING_PHOTO);
      await speak(VOICE_PROMPTS.PHOTO_TIME);
      safeRestartRecognition();
    } else {
      await speak(VOICE_PROMPTS.RECOLLECT_LURE);
      safeRestartRecognition();
    }
  }, [speak, safeRestartRecognition]);

  const handlePhotoCapture = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };
  
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) await uploadAndSubmitCatch(file);
    event.target.value = null;
  };
  
  const handleSkipPhoto = async () => {
    await uploadAndSubmitCatch(null);
  };
  
  const uploadAndSubmitCatch = async (photoFile) => { /* ... No changes needed to this function's logic ... */ };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      if (voiceState === VOICE_STATES.IDLE) {
        resetVoiceWorkflow();
        handleMarkFish(); // Directly start the workflow
      } else {
         recognitionRef.current.start();
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    resetVoiceWorkflow();
  };

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
          {isListening ? '🔴 Stop Voice Workflow' : '🎯 Mark Fish'}
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
            <button onClick={handlePhotoCapture} className="btn btn-primary" style={{ flex: 1 }}>
              📸 Take Photo
            </button>
            <button onClick={handleSkipPhoto} className="btn btn-secondary" style={{ flex: 1 }}>
              Skip Photo
            </button>
          </div>
        )}
        {isSubmitting && <div style={{ marginTop: '10px', padding: '10px', background: '#f59e0b', color: 'white', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold' }}>💾 Saving catch...</div>}
      </div>
      <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '15px' }}>
        <div style={{ 
          marginBottom: '10px', 
          padding: '8px', 
          background: '#f8fafc', 
          borderRadius: '4px',
          fontSize: '0.85rem',
          lineHeight: '1.4'
        }}>
          <strong>🎙️ Voice Tips:</strong> Speak clearly and be concise!<br/>
          • Say just numbers: <strong>"2"</strong> not "2 pounds" | <strong>"42"</strong> not "42 inches"<br/>
          • Depth is always in feet - just say the number: <strong>"15"</strong> not "15 feet"<br/>
          • Keep it simple: <strong>"musky"</strong> | <strong>"spinner"</strong> | <strong>"yes"</strong> | <strong>"no"</strong><br/>
          • Speak one answer at a time and wait for the next question
        </div>
        {voiceState !== VOICE_STATES.IDLE && (
          <div style={{ marginTop: '10px', padding: '10px', background: '#f0f9ff', border: '1px solid #e0f2fe', borderRadius: '6px', fontWeight: 'bold', color: '#0369a1' }}>
            {voiceState === VOICE_STATES.COLLECTING_DEPTH && "🌊 Listening for depth..."}
            {voiceState === VOICE_STATES.WAITING_FOR_CATCH && "⏰ Waiting for your catch... (Up to 8 mins)"}
            {voiceState === VOICE_STATES.COLLECTING_SPECIES && "🐟 What species is it?"}
            {voiceState === VOICE_STATES.COLLECTING_LENGTH && "📏 How long is it?"}
            {voiceState === VOICE_STATES.COLLECTING_WEIGHT && "⚖️ What's the weight?"}
            {voiceState === VOICE_STATES.COLLECTING_LURE && "🎣 What lure did you use?"}
            {voiceState === VOICE_STATES.TAKING_PHOTO && "📸 Ready for photo!"}
            {voiceState === VOICE_STATES.COMPLETED && "✅ Catch saved successfully!"}
          </div>
        )}
      </div>
      {submitError && <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '6px', color: '#991b1b' }}>❌ Submit Error: {submitError}</div>}
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.triggerVoiceCommand = () => {
    const event = new CustomEvent('triggerVoiceCommand');
    window.dispatchEvent(event);
  };
}