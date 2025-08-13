const express = require('express')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { query } = require('../database/connection')
const { authenticateToken } = require('./auth')

const router = express.Router()

// Load knowledge base patterns
function loadKnowledgeBase(species) {
  try {
    const knowledgeFile = path.join(__dirname, '../../knowledge-base', `${species}-patterns.json`)
    if (fs.existsSync(knowledgeFile)) {
      return JSON.parse(fs.readFileSync(knowledgeFile, 'utf8'))
    }
    return null
  } catch (error) {
    console.error('Error loading knowledge base:', error)
    return null
  }
}

// Get AI recommendations for fishing
router.post('/recommendations', authenticateToken, async (req, res) => {
  try {
    const { species, location, currentConditions, userHistory } = req.body

    if (!species) {
      return res.status(400).json({ error: 'Species is required' })
    }

    // Load static knowledge base for species
    const knowledgeBase = loadKnowledgeBase(species)

    // Get recent successful catches for this species and location
    const recentCatches = await query(
      `SELECT fc.*, ed.wind_speed, ed.wind_direction, ed.air_temperature, ed.barometric_pressure
       FROM fish_catches fc
       JOIN fish_species fs ON fc.species_id = fs.id
       LEFT JOIN environmental_data ed ON 
         ABS(ed.latitude - fc.latitude) < 0.01 AND 
         ABS(ed.longitude - fc.longitude) < 0.01 AND
         ed.recorded_at BETWEEN fc.catch_time - INTERVAL '1 hour' AND fc.catch_time + INTERVAL '1 hour'
       WHERE fs.species_name = $1
       AND fc.catch_time > NOW() - INTERVAL '30 days'
       ORDER BY fc.catch_time DESC
       LIMIT 10`,
      [species]
    )

    // Analyze current conditions against knowledge base
    const analysis = analyzeConditions(species, currentConditions, knowledgeBase, recentCatches.rows)

    // Get real-time insights from Perplexity (if enabled and API key available)
    let realTimeInsights = null
    const perplexityEnabled = process.env.ENABLE_PERPLEXITY_SEARCH !== 'false'
    
    if (perplexityEnabled && process.env.PERPLEXITY_API_KEY) {
      try {
        console.log('Perplexity search enabled - fetching real-time insights...')
        realTimeInsights = await getPerplexityInsights(species, currentConditions)
      } catch (error) {
        console.error('Perplexity API error:', error.response?.data || error.message)
      }
    } else {
      console.log('Perplexity search disabled or no API key')
    }

    // Generate recommendation text
    const recommendation = generateRecommendation(species, analysis, realTimeInsights)

    // Store AI insight
    const speciesResult = await query('SELECT id FROM fish_species WHERE species_name = $1', [species])
    if (speciesResult.rows.length > 0) {
      await query(
        `INSERT INTO ai_insights 
         (user_id, target_species_id, generated_at, recommendation_text, confidence_score,
          conditions_analyzed, success_prediction, best_times, recommended_techniques)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          req.user.userId,
          speciesResult.rows[0].id,
          new Date(),
          recommendation.text,
          recommendation.confidence,
          JSON.stringify(currentConditions),
          recommendation.successPrediction,
          JSON.stringify(recommendation.bestTimes),
          JSON.stringify(recommendation.techniques)
        ]
      )
    }

    res.json({
      species,
      recommendation: recommendation.text,
      confidence: recommendation.confidence,
      successPrediction: recommendation.successPrediction,
      bestTimes: recommendation.bestTimes,
      techniques: recommendation.techniques,
      analysis: analysis,
      realTimeInsights: realTimeInsights,
      perplexitySearchEnabled: perplexityEnabled,
      generated: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI recommendation error:', error)
    res.status(500).json({ error: 'Failed to generate recommendations' })
  }
})

// Analyze conditions against knowledge base
function analyzeConditions(species, conditions, knowledgeBase, recentCatches) {
  const analysis = {
    favorableFactors: [],
    concerns: [],
    score: 50 // Base score
  }

  if (!conditions) return analysis

  // Wind analysis
  if (conditions.windSpeed <= 10) {
    analysis.favorableFactors.push('Light winds ideal for precise presentations')
    analysis.score += 15
  } else if (conditions.windSpeed > 20) {
    analysis.concerns.push('Strong winds may make boat control difficult')
    analysis.score -= 10
  }

  // Pressure analysis
  const pressure = parseFloat(conditions.pressure)
  if (pressure > 30.10) {
    analysis.favorableFactors.push('High pressure system - stable conditions')
    analysis.score += 10
  } else if (pressure < 29.80) {
    analysis.favorableFactors.push('Falling pressure can trigger feeding activity')
    analysis.score += 15
  }

  // Temperature analysis for species-specific preferences
  if (species === 'musky') {
    if (conditions.waterTemp >= 65 && conditions.waterTemp <= 78) {
      analysis.favorableFactors.push('Water temperature in optimal musky range')
      analysis.score += 20
    }
  } else if (species === 'walleye') {
    if (conditions.waterTemp >= 60 && conditions.waterTemp <= 72) {
      analysis.favorableFactors.push('Water temperature ideal for walleye activity')
      analysis.score += 20
    }
  }

  // Cloud cover analysis
  if (conditions.cloudCover > 50) {
    analysis.favorableFactors.push('Overcast conditions reduce light penetration')
    analysis.score += 10
  }

  // Moon phase considerations
  const moonPhaseName = conditions.moonPhase?.name || conditions.moonPhase || ''
  if (moonPhaseName && (moonPhaseName.includes('New') || moonPhaseName.includes('Full'))) {
    analysis.favorableFactors.push('Major moon phase may increase fish activity')
    analysis.score += 10
  }

  // Ensure score stays within bounds
  analysis.score = Math.min(100, Math.max(0, analysis.score))

  return analysis
}

// Get real-time insights from Perplexity API
async function getPerplexityInsights(species, conditions) {
  if (!process.env.PERPLEXITY_API_KEY || process.env.ENABLE_PERPLEXITY_SEARCH === 'false') {
    return null
  }

  try {
    const query = `Recent ${species} fishing reports and conditions on Lake St. Clair. Current conditions: ${JSON.stringify(conditions)}. What are anglers saying about recent ${species} activity?`

    const response = await axios.post('https://api.perplexity.ai/chat/completions', {
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: 'You are a fishing expert analyzing recent fishing reports and social media for current fishing conditions and success patterns. Focus on factual, recent information from fishing forums, YouTube, and Reddit.'
        },
        {
          role: 'user',
          content: query
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.data && response.data.choices && response.data.choices[0]) {
      return {
        text: response.data.choices[0].message.content,
        source: 'perplexity',
        timestamp: new Date().toISOString()
      }
    } else {
      console.error('Unexpected Perplexity response format:', response.data)
      return null
    }
  } catch (error) {
    console.error('Perplexity API error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    })
    return null
  }
}

// Generate final recommendation
function generateRecommendation(species, analysis, realTimeInsights) {
  let text = `Based on current conditions, here's your ${species} fishing analysis for Lake St. Clair:\n\n`

  // Add favorable factors
  if (analysis.favorableFactors.length > 0) {
    text += "✅ Favorable Conditions:\n"
    analysis.favorableFactors.forEach(factor => {
      text += `• ${factor}\n`
    })
    text += "\n"
  }

  // Add concerns
  if (analysis.concerns.length > 0) {
    text += "⚠️ Considerations:\n"
    analysis.concerns.forEach(concern => {
      text += `• ${concern}\n`
    })
    text += "\n"
  }

  // Species-specific recommendations
  const speciesAdvice = getSpeciesSpecificAdvice(species, analysis)
  text += `🎣 ${species.charAt(0).toUpperCase() + species.slice(1)} Strategy:\n${speciesAdvice}\n\n`

  // Add real-time insights if available
  if (realTimeInsights) {
    text += `🌐 Recent Reports:\n${realTimeInsights.text}\n\n`
  }

  const confidence = Math.round(analysis.score)
  const successPrediction = Math.round(analysis.score * 0.8) // Slightly conservative

  const bestTimes = generateBestTimes()
  const techniques = getRecommendedTechniques(species, analysis)

  return {
    text,
    confidence,
    successPrediction,
    bestTimes,
    techniques
  }
}

function getSpeciesSpecificAdvice(species, analysis) {
  const advice = {
    musky: "Focus on weed edges and drop-offs in 8-15 feet of water. Use large baits like bucktails, crankbaits, or soft plastics. Work structures slowly and cover water methodically.",
    walleye: "Target deeper structures in 15-25 feet. Jigging presentations work well, especially with live bait or soft plastics near bottom. Look for schools on your electronics.",
    bass: "Work shallow cover and structure. Spinnerbaits, crankbaits, and soft plastics are productive. Focus on rocks, docks, and weed edges in 5-15 feet.",
    pike: "Target shallow weedy areas and edges. Use spinnerbaits, spoons, or large soft plastics. Work edges where weeds meet open water.",
    perch: "Look for schools in 15-30 feet over structure. Small jigs with live bait or soft plastics work well. Fish vertically once you locate schools.",
    salmon: "Focus on deep, cold water areas. Trolling with downriggers or lead core is most effective. Target the thermocline.",
    trout: "Work deep, cold water areas. Trolling or jigging in 30-80 feet. Focus on areas with good current flow."
  }

  return advice[species] || "Fish areas appropriate for your target species based on seasonal patterns."
}

function generateBestTimes() {
  const now = new Date()
  const sunrise = new Date(now)
  sunrise.setHours(6, 30, 0) // Approximate sunrise
  const sunset = new Date(now)
  sunset.setHours(19, 30, 0) // Approximate sunset

  return [
    `${sunrise.getHours()}:${sunrise.getMinutes().toString().padStart(2, '0')} AM - ${(sunrise.getHours() + 2) % 24}:${sunrise.getMinutes().toString().padStart(2, '0')} AM`,
    `${sunset.getHours()}:${sunset.getMinutes().toString().padStart(2, '0')} PM - ${(sunset.getHours() + 2) % 24}:${sunset.getMinutes().toString().padStart(2, '0')} PM`
  ]
}

function getRecommendedTechniques(species, analysis) {
  const techniques = {
    musky: ['Bucktail', 'Large Crankbait', 'Jerkbait', 'Soft Plastic'],
    walleye: ['Jig & Minnow', 'Bottom Bouncer', 'Crankbait', 'Live Bait Rig'],
    bass: ['Spinnerbait', 'Crankbait', 'Soft Plastic', 'Topwater'],
    pike: ['Spinnerbait', 'Spoon', 'Large Soft Plastic', 'Live Bait'],
    perch: ['Small Jig', 'Live Bait', 'Drop Shot', 'Small Spoon'],
    salmon: ['Trolling Spoon', 'Downrigger', 'Lead Core', 'Planer Board'],
    trout: ['Trolling', 'Jigging', 'Live Bait', 'Small Lures']
  }

  return techniques[species] || ['Appropriate lures for target species']
}

module.exports = router