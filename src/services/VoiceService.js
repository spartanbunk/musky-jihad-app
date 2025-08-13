// Voice Service for Web Speech API
class VoiceService {
  constructor() {
    this.recognition = null
    this.synthesis = window.speechSynthesis
    this.isListening = false
    this.isSupported = this.checkSupport()
    this.callbacks = {}
    
    if (this.isSupported) {
      this.initSpeechRecognition()
    }
  }

  checkSupport() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    this.recognition = new SpeechRecognition()
    
    this.recognition.continuous = false
    this.recognition.interimResults = false
    this.recognition.lang = 'en-US'
    this.recognition.maxAlternatives = 3

    this.recognition.onstart = () => {
      this.isListening = true
      if (this.callbacks.onStart) this.callbacks.onStart()
    }

    this.recognition.onresult = (event) => {
      const results = Array.from(event.results)
      const transcript = results.map(result => result[0].transcript).join('')
      const confidence = results[0][0].confidence

      console.log('Voice recognition result:', transcript, 'Confidence:', confidence)
      
      if (this.callbacks.onResult) {
        this.callbacks.onResult(transcript.trim(), confidence)
      }
    }

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      this.isListening = false
      if (this.callbacks.onError) this.callbacks.onError(event.error)
    }

    this.recognition.onend = () => {
      this.isListening = false
      if (this.callbacks.onEnd) this.callbacks.onEnd()
    }
  }

  startListening(callbacks = {}) {
    if (!this.isSupported) {
      console.warn('Speech recognition not supported')
      if (callbacks.onError) callbacks.onError('not_supported')
      return false
    }

    if (this.isListening) {
      this.stopListening()
    }

    this.callbacks = callbacks
    
    try {
      this.recognition.start()
      return true
    } catch (error) {
      console.error('Failed to start speech recognition:', error)
      if (callbacks.onError) callbacks.onError(error.message)
      return false
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
    }
    this.isListening = false
  }

  speak(text, options = {}) {
    if (!this.synthesis) {
      console.warn('Speech synthesis not supported')
      return Promise.reject('Speech synthesis not supported')
    }

    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.synthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      
      // Set voice options
      utterance.rate = options.rate || 0.9
      utterance.pitch = options.pitch || 1
      utterance.volume = options.volume || 1
      
      // Use a clear English voice if available
      const voices = this.synthesis.getVoices()
      const englishVoice = voices.find(voice => 
        voice.lang.includes('en') && voice.localService
      ) || voices[0]
      
      if (englishVoice) {
        utterance.voice = englishVoice
      }

      utterance.onend = () => {
        console.log('Speech synthesis finished')
        resolve()
      }

      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error)
        reject(error)
      }

      this.synthesis.speak(utterance)
    })
  }

  // Stop any ongoing speech
  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel()
    }
  }

  // Check if currently speaking
  isSpeaking() {
    return this.synthesis && this.synthesis.speaking
  }
}

// Export singleton instance
export default new VoiceService()