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

// Common lure types with variations
const LURE_MAPPINGS = {
  'bucktail': ['bucktail', 'buck tail', 'tail', 'buck'],
  'crankbait': ['crankbait', 'crank bait', 'crank', 'diving lure', 'dive', 'diving'],
  'jig': ['jig', 'jig head', 'lead head', 'head'],
  'spinnerbait': ['spinnerbait', 'spinner bait', 'spinner', 'blade', 'bladed'],
  'topwater': ['topwater', 'top water', 'surface lure', 'popper', 'surface', 'top'],
  'soft plastic': ['soft plastic', 'plastic worm', 'rubber', 'grub', 'plastic', 'soft'],
  'spoon': ['spoon', 'casting spoon', 'trolling spoon', 'metal'],
  'live bait': ['live bait', 'minnow', 'worm', 'leech', 'live', 'bait'],
  'swimbait': ['swimbait', 'swim bait', 'swim', 'paddle tail'],
  'glide bait': ['glide bait', 'glide', 'glider'],
  'tube': ['tube', 'tube jig', 'hollow body']
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
      if (inputLower.includes(variation) || variation.includes(inputLower)) {
        return key
      }
      
      // Check for partial matches
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
  console.log('Parsing lure from transcript:', transcript)
  const result = fuzzyMatch(transcript, LURE_MAPPINGS, 0.3)
  console.log('Lure parsing result:', result)
  return result
}

// Check for catch confirmation phrases with yes/no detection
export function isCatchConfirmation(transcript) {
  const yesPhases = [
    'nice catch', 'good catch', 'nice one', 'got him', 'got it', 
    'fish on', 'caught one', 'landed', 'hooked up', 'yes', 'yeah', 'yep', 'yup'
  ]
  
  const noPhases = [
    'no', 'nope', 'didn\'t get', 'didn\'t catch', 'missed', 'lost him', 
    'lost it', 'nothing', 'no luck', 'strike out', 'struck out'
  ]
  
  const text = transcript.toLowerCase().trim()
  console.log('Checking catch confirmation for:', text)
  
  const isYes = yesPhases.some(phrase => 
    text.includes(phrase) || phrase.includes(text)
  )
  
  const isNo = noPhases.some(phrase => 
    text.includes(phrase) || phrase.includes(text)
  )
  
  console.log('Catch confirmation result:', { isYes, isNo, isResponse: isYes || isNo })
  
  if (isYes) return { confirmed: true, isResponse: true }
  if (isNo) return { confirmed: false, isResponse: true }
  
  return { confirmed: false, isResponse: false }
}

// Check for mark fish commands
export function isMarkFishCommand(transcript) {
  const markCommands = [
    'mark fish', 'mark spot', 'fish here', 'mark location', 
    'mark this spot', 'mark it', 'mark'
  ]
  
  const text = transcript.toLowerCase().trim()
  
  return markCommands.some(command => 
    text.includes(command) || command.includes(text)
  )
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