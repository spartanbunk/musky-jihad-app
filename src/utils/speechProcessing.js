// Speech processing utilities for voice commands

// Common fishing species with variations
const SPECIES_MAPPINGS = {
  'musky': ['musky', 'muskie', 'muskellunge', 'ski', 'muskie fish', 'musk'],
  'bass': ['bass', 'largemouth', 'large mouth', 'smallmouth', 'small mouth', 'largemouth bass', 'smallmouth bass'],
  'walleye': ['walleye', 'wall eye', 'pickerel', 'walleyed pike'],
  'pike': ['pike', 'northern pike', 'northern', 'jack', 'jack pike'],
  'perch': ['perch', 'yellow perch', 'jumbo perch'],
  'salmon': ['salmon', 'coho', 'chinook', 'king salmon', 'silver salmon'],
  'trout': ['trout', 'steelhead', 'brown trout', 'rainbow trout', 'lake trout'],
  'bluegill': ['bluegill', 'blue gill', 'sunfish', 'panfish', 'bream'],
  'crappie': ['crappie', 'crappy', 'paper mouth', 'slab', 'white crappie', 'black crappie']
};

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
};

// Number word mappings for voice input
const NUMBER_WORDS = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
  'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
  'eighty': 80, 'ninety': 90, 'hundred': 100
};

/**
 * Finds the best match for an input string from a dictionary of options.
 * @param {string} input - The voice transcript.
 * @param {Object} options - The mappings object (e.g., SPECIES_MAPPINGS).
 * @param {number} threshold - The minimum similarity score to consider a match.
 * @returns {string|null} The key of the best match or null.
 */
export function fuzzyMatch(input, options, threshold = 0.6) {
  const inputLower = input.toLowerCase().trim();
  let bestMatch = null;
  let highestScore = 0;

  for (const [key, variations] of Object.entries(options)) {
    for (const variation of variations) {
      // Prioritize exact or near-exact matches
      if (inputLower === variation) {
        return key; // Perfect match
      }

      // Check for containment, but only if the input is substantial
      if (inputLower.includes(variation) && variation.length > 3) {
        const score = variation.length / inputLower.length;
        if (score > highestScore) {
          highestScore = score;
          bestMatch = key;
        }
      }

      // Check for fuzzy similarity
      const similarity = calculateSimilarity(inputLower, variation);
      if (similarity > highestScore && similarity >= threshold) {
        highestScore = similarity;
        bestMatch = key;
      }
    }
  }
  return bestMatch;
}

/**
 * Calculates a similarity score between two strings.
 * @param {string} str1
 * @param {string} str2
 * @returns {number} A score between 0 and 1.
 */
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculates the Levenshtein distance between two strings.
 * @param {string} str1
 * @param {string} str2
 * @returns {number} The edit distance.
 */
function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,      // Deletion
        matrix[j][i - 1] + 1,      // Insertion
        matrix[j - 1][i - 1] + cost // Substitution
      );
    }
  }
  return matrix[str2.length][str1.length];
}

/**
 * Extracts a number from a voice transcript, handling digits and words.
 * @param {string} transcript - The voice input.
 * @returns {{value: number, unit: string|null, confidence: number}|null}
 */
export function parseNumberFromSpeech(transcript) {
  const text = transcript.toLowerCase().trim();

  // Look for explicit numbers first (e.g., "15.5", "25")
  const numberMatch = text.match(/(\d+(?:\.\d+)?)/);
  if (numberMatch) {
    const number = parseFloat(numberMatch[0]);
    const unit = extractUnit(text);
    return { value: number, unit, confidence: 0.95 };
  }

  // Handle spelled-out numbers
  const words = text.replace(/[^a-zA-Z\s]/g, '').split(/\s+/);
  let totalValue = 0;
  let tempValue = 0;

  words.forEach(word => {
    if (NUMBER_WORDS[word] !== undefined) {
      if (NUMBER_WORDS[word] === 100) {
        tempValue *= 100;
      } else {
        tempValue += NUMBER_WORDS[word];
      }
    } else {
      if (tempValue > 0) {
        totalValue += tempValue;
        tempValue = 0;
      }
    }
  });
  totalValue += tempValue;

  if (totalValue > 0) {
    const unit = extractUnit(text);
    return { value: totalValue, unit, confidence: 0.8 };
  }

  return null;
}

/**
 * Extracts a unit of measurement from a string.
 * @param {string} text
 * @returns {string|null}
 */
function extractUnit(text) {
  if (text.includes('inch') || text.includes('in')) return 'inches';
  if (text.includes('pound') || text.includes('lb')) return 'pounds';
  if (text.includes('feet') || text.includes('foot') || text.includes('ft')) return 'feet';
  if (text.includes('ounce') || text.includes('oz')) return 'ounces';
  return null;
}

/**
 * Parses the fish species from a transcript.
 * @param {string} transcript
 * @returns {string|null}
 */
export function parseSpecies(transcript) {
  return fuzzyMatch(transcript, SPECIES_MAPPINGS, 0.4);
}

/**
 * Parses the lure type from a transcript.
 * @param {string} transcript
 * @returns {string|null}
 */
export function parseLure(transcript) {
  return fuzzyMatch(transcript, LURE_MAPPINGS, 0.5);
}

/**
 * Determines if a transcript is a "yes" or "no" response.
 * @param {string} transcript
 * @returns {{confirmed: boolean, isResponse: boolean}}
 */
export function isCatchConfirmation(transcript) {
  const text = transcript.toLowerCase().trim();

  const yesPhrases = [
    'yes', 'yeah', 'yep', 'yup', 'ya', 'correct', 'right', 'affirmative',
    'you got it', 'spot on', 'perfect', 'absolutely', 'that\'s right', 'i got one', 'got one', 'fish on'
  ];

  const noPhrases = [
    'no', 'nope', 'nah', 'negative', 'incorrect', 'wrong',
    'that\'s not right', 'try again', 'lost him', 'lost it', 'missed'
  ];

  if (yesPhrases.some(phrase => text.includes(phrase))) {
    return { confirmed: true, isResponse: true };
  }

  if (noPhrases.some(phrase => text.includes(phrase))) {
    return { confirmed: false, isResponse: true };
  }

  return { confirmed: false, isResponse: false };
}


// Add this function to speechProcessing.js

export function isStillFighting(transcript) {
  const text = transcript.toLowerCase().trim();
  const fightingPhrases = [
    'still fighting',
    'fighting it',
    'still on',
    'not in yet',
    'working on it'
  ];

  if (fightingPhrases.some(phrase => text.includes(phrase))) {
    return true;
  }
  return false;
}
/**
 * Checks if a transcript is a command to start the "mark fish" workflow.
 * @param {string} transcript
 * @returns {boolean}
 */
export function isMarkFishCommand(transcript) {
  const text = transcript.toLowerCase().trim();
  const markCommands = [
    'mark fish', 'mark spot', 'fish here', 'mark location',
    'mark this spot', 'mark it', 'mark'
  ];

  // Use `some` to find if any command is present in the transcript
  return markCommands.some(command => text.includes(command));
}

export default {
  parseSpecies,
  parseLure,
  parseNumberFromSpeech,
  isCatchConfirmation,
  isMarkFishCommand,
  isStillFighting,
  fuzzyMatch
};