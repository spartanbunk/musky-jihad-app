// Speech processing utilities for voice commands

// Common fishing species with variations
const SPECIES_MAPPINGS = {
  'musky': ['musky', 'muskie', 'muskellunge', 'ski'],
  'bass': ['bass', 'largemouth', 'large mouth', 'smallmouth', 'small mouth'],
  'walleye': ['walleye', 'wall eye', 'yellow perch', 'pickerel'],
  'pike': ['pike', 'northern pike', 'northern', 'jack'],
  'perch': ['perch', 'yellow perch'],
  'salmon': ['salmon', 'coho', 'chinook', 'king salmon'],
  'trout': ['trout', 'steelhead', 'brown trout', 'rainbow trout'],
  'bluegill': ['bluegill', 'blue gill', 'sunfish', 'panfish'],
  'crappie': ['crappie', 'crappy', 'paper mouth']
}

// Lure types matching CatchLogger modal options exactly
const LURE_MAPPINGS = {
  'Bucktail': ['bucktail', 'buck tail', 'tail', 'buck', 'musky buck', 'hair jig', 'spinner bait', 'blade', 'bucket', 'bucket tail', 'bucktails'],
  'Crankbait': ['crankbait', 'crank bait', 'crank', 'diving lure', 'dive', 'diving', 'plug', 'deep dive', 'shallow dive', 'minnow plug', 'lipless', 'vibe'],
  'Jerkbait': ['jerkbait', 'jerk bait', 'minnow bait', 'suspending', 'twitch bait', 'husky jerk', 'rogue', 'pointer', 'stick bait', 'stickbait'],
  'Topwater': ['topwater', 'top water', 'surface lure', 'popper', 'surface', 'top', 'buzzbait', 'buzz bait', 'frog', 'walker', 'prop bait', 'wake bait', 'pencil'],
  'Soft Plastic': ['soft plastic', 'plastic', 'rubber', 'grub', 'soft', 'tube', 'worm', 'creature', 'paddle tail', 'shad body', 'swimbait', 'swim bait'],
  'Spinnerbait': ['spinnerbait', 'spinner bait', 'spinner', 'blade', 'bladed', 'colorado', 'willow', 'double blade', 'chatterbait', 'chatter bait', 'vibrating jig'],
  'Jig': ['jig', 'jig head', 'lead head', 'head', 'leadhead', 'hair jig', 'marabou jig', 'football jig', 'swim jig'],
  'Live Bait': ['live bait', 'live', 'bait', 'minnow', 'sucker', 'worm', 'leech', 'shiner', 'fathead', 'nightcrawler'],
  'Trolling Spoon': ['trolling spoon', 'spoon', 'casting spoon', 'metal', 'flutter spoon', 'wobbler', 'flutter', 'heavy spoon', 'slug'],
  'Other': ['other', 'different', 'custom', 'homemade', 'fly', 'streamer', 'glide bait', 'glider', 'musky killer']
}

// Number word mappings for voice input
const NUMBER_WORDS = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
  'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
  'eighty': 80, 'ninety': 90, 'hundred': 100
}

// Fuzzy string matching
export function fuzzyMatch(input, options, threshold = 0.6) {
  const inputLower = input.toLowerCase().trim()
  
  for (const [key, variations] of Object.entries(options)) {
    for (const variation of variations) {
      // Exact substring matching (prioritized)
      if (inputLower.includes(variation) || variation.includes(inputLower)) {
        return key
      }
      
      // Special case for partial word matches (like "buck" for "bucktail")
      if (variation.length >= 4 && inputLower.length >= 3) {
        if (inputLower.startsWith(variation.substring(0, 3)) || variation.startsWith(inputLower.substring(0, 3))) {
          return key
        }
      }
      
      // Check for fuzzy similarity
      const similarity = calculateSimilarity(inputLower, variation)
      if (similarity >= threshold) {
        return key
      }
    }
  }
  
  return null
}

// Calculate string similarity (simple implementation)
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

// Levenshtein distance for string similarity
function levenshteinDistance(str1, str2) {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

// Extract number from speech with units
export function parseNumberFromSpeech(transcript) {
  const text = transcript.toLowerCase().trim()
  console.log('Parsing speech for number:', text)
  
  // Look for explicit numbers first
  const numberMatch = text.match(/(\d+(?:\.\d+)?)/g)
  if (numberMatch) {
    const number = parseFloat(numberMatch[0])
    const unit = extractUnit(text)
    console.log('Found number:', { number, unit, confidence: 0.9 })
    return { value: number, unit, confidence: 0.9 }
  }
  
  // Look for spelled out numbers
  let totalValue = 0
  let confidence = 0.7
  
  const words = text.split(/\s+/)
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    
    if (NUMBER_WORDS[word] !== undefined) {
      totalValue += NUMBER_WORDS[word]
    }
    
    // Handle compound numbers like "twenty five"
    if (word === 'twenty' && i + 1 < words.length && NUMBER_WORDS[words[i + 1]] < 10) {
      totalValue += NUMBER_WORDS[words[i + 1]]
      i++ // Skip next word
    }
  }
  
  if (totalValue > 0) {
    const unit = extractUnit(text)
    return { value: totalValue, unit, confidence }
  }
  
  return null
}

// Extract unit from speech
function extractUnit(text) {
  if (text.includes('inch') || text.includes('in')) return 'inches'
  if (text.includes('pound') || text.includes('lb')) return 'pounds'
  if (text.includes('feet') || text.includes('foot') || text.includes('ft')) return 'feet'
  if (text.includes('ounce') || text.includes('oz')) return 'ounces'
  return null
}

// Parse species from speech
export function parseSpecies(transcript) {
  return fuzzyMatch(transcript, SPECIES_MAPPINGS, 0.5)
}

// Parse lure type from speech
export function parseLure(transcript) {
  console.log('=== LURE PARSING DEBUG ===')
  console.log('Input transcript:', transcript)
  console.log('Cleaned transcript:', transcript.toLowerCase().trim())
  
  // Try exact matching first, then fuzzy matching
  const result = fuzzyMatch(transcript, LURE_MAPPINGS, 0.4)
  
  console.log('Fuzzy match result:', result)
  console.log('Available lure types:', Object.keys(LURE_MAPPINGS))
  
  // Test each lure type individually for debugging
  for (const [lureType, variations] of Object.entries(LURE_MAPPINGS)) {
    const matches = variations.filter(variation => 
      transcript.toLowerCase().includes(variation) || variation.includes(transcript.toLowerCase())
    )
    if (matches.length > 0) {
      console.log(`Direct match found for ${lureType}:`, matches)
    }
  }
  
  console.log('Final result:', result)
  console.log('=== END LURE PARSING DEBUG ===')
  
  return result
}

// Check for catch confirmation phrases with yes/no detection
export function isCatchConfirmation(transcript) {
  // Enhanced yes patterns for better recognition
  const yesPhases = [
    // Simple affirmatives
    'yes', 'yeah', 'yep', 'yup', 'ya', 'uh huh', 'mm hmm', 'sure', 'correct', 'right', 'true', 'affirm', 'positive',
    
    // Casual confirmations  
    'that\'s right', 'that\'s correct', 'exactly', 'you got it', 'bingo', 'spot on', 'perfect', 'absolutely',
    
    // Variations with context
    'yes that\'s right', 'yeah that\'s correct', 'yep that\'s it', 'that\'s what I said',
    
    // Original catch-specific phrases
    'nice catch', 'good catch', 'nice one', 'got him', 'got it', 
    'fish on', 'caught one', 'landed', 'hooked up'
  ]
  
  // Enhanced no patterns for better recognition
  const noPhases = [
    // Simple negatives
    'no', 'nope', 'nah', 'uh uh', 'negative', 'incorrect', 'wrong', 'false',
    
    // Casual denials
    'that\'s not right', 'that\'s wrong', 'not correct', 'try again', 'no way',
    
    // Variations with context
    'no that\'s not right', 'nope that\'s wrong', 'that\'s not what I said',
    
    // Original fishing-specific phrases
    'didn\'t get', 'didn\'t catch', 'missed', 'lost him', 
    'lost it', 'nothing', 'no luck', 'strike out', 'struck out'
  ]
  
  const text = transcript.toLowerCase().trim()
  console.log('=== CONFIRMATION RECOGNITION DEBUG ===')
  console.log('Input transcript:', transcript)
  console.log('Cleaned text:', text)
  
  // Check for yes responses
  const matchedYes = yesPhases.filter(phrase => 
    text.includes(phrase) || phrase.includes(text)
  )
  
  // Check for no responses  
  const matchedNo = noPhases.filter(phrase => 
    text.includes(phrase) || phrase.includes(text)
  )
  
  const isYes = matchedYes.length > 0
  const isNo = matchedNo.length > 0
  
  console.log('Matched YES phrases:', matchedYes)
  console.log('Matched NO phrases:', matchedNo)
  console.log('Final result:', { isYes, isNo, isResponse: isYes || isNo })
  console.log('=== END CONFIRMATION RECOGNITION DEBUG ===')
  
  if (isYes) return { confirmed: true, isResponse: true }
  if (isNo) return { confirmed: false, isResponse: true }
  
  return { confirmed: false, isResponse: false }
}

// Check for mark fish commands
export function isMarkFishCommand(transcript) {
  console.log('🔍 === isMarkFishCommand DEBUG ===')
  console.log('🔍 Input transcript:', transcript)
  console.log('🔍 Input type:', typeof transcript)
  
  const markCommands = [
    'mark fish', 'mark spot', 'fish here', 'mark location', 
    'mark this spot', 'mark it', 'mark'
  ]
  
  const text = transcript.toLowerCase().trim()
  console.log('🔍 Processed text:', text)
  console.log('🔍 Mark commands to check:', markCommands)
  
  const result = markCommands.some(command => {
    const includes1 = text.includes(command)
    const includes2 = command.includes(text)
    console.log(`🔍 Checking "${command}": text.includes(${includes1}) || command.includes(${includes2})`)
    return includes1 || includes2
  })
  
  console.log('🔍 Final result:', result)
  console.log('🔍 === END isMarkFishCommand DEBUG ===')
  
  return result
}

// Default exports
export default {
  parseSpecies,
  parseLure,
  parseNumberFromSpeech,
  isCatchConfirmation,
  isMarkFishCommand,
  fuzzyMatch
}