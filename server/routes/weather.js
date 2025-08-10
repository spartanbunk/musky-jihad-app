const express = require('express')
const axios = require('axios')
const { query } = require('../database/connection')
const { authenticateToken } = require('./auth')

const router = express.Router()

// Lake St. Clair coordinates for weather data
const LAKE_ST_CLAIR_LAT = 42.4583
const LAKE_ST_CLAIR_LNG = -82.7167

// Get current weather conditions for Lake St. Clair
router.get('/current', async (req, res) => {
  try {
    const { lat = LAKE_ST_CLAIR_LAT, lng = LAKE_ST_CLAIR_LNG } = req.query

    if (!process.env.WEATHER_API_KEY) {
      // Return mock data if no API key
      return res.json({
        source: 'mock',
        location: { latitude: lat, longitude: lng },
        conditions: {
          windSpeed: Math.floor(Math.random() * 20) + 5,
          windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
          temperature: Math.floor(Math.random() * 20) + 60,
          waterTemp: Math.floor(Math.random() * 15) + 65,
          pressure: (Math.random() * 1.5 + 29.5).toFixed(2),
          cloudCover: Math.floor(Math.random() * 100),
          moonPhase: 'Waxing Gibbous'
        },
        timestamp: new Date().toISOString()
      })
    }

    // OpenWeatherMap API call
    const weatherResponse = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather`,
      {
        params: {
          lat: lat,
          lon: lng,
          appid: process.env.WEATHER_API_KEY,
          units: 'imperial'
        }
      }
    )

    const weather = weatherResponse.data

    // Get moon phase (simplified calculation)
    const moonPhase = getMoonPhase(new Date())

    const conditions = {
      windSpeed: Math.round(weather.wind?.speed || 0),
      windDirection: degreeToCompass(weather.wind?.deg || 0),
      temperature: Math.round(weather.main.temp),
      waterTemp: Math.round(weather.main.temp - 5), // Approximate water temp
      pressure: (weather.main.pressure * 0.02953).toFixed(2), // Convert hPa to inHg
      cloudCover: weather.clouds.all,
      visibility: Math.round((weather.visibility || 10000) / 1609.34), // Convert m to miles
      humidity: weather.main.humidity,
      moonPhase: moonPhase
    }

    // Store environmental data
    await query(
      `INSERT INTO environmental_data 
       (latitude, longitude, recorded_at, data_source, wind_speed, wind_direction,
        air_temperature, barometric_pressure, cloud_cover, moon_phase)
       VALUES ($1, $2, $3, 'openweather', $4, $5, $6, $7, $8, $9)`,
      [
        lat, lng, new Date(), conditions.windSpeed, conditions.windDirection,
        conditions.temperature, conditions.pressure, conditions.cloudCover, conditions.moonPhase
      ]
    )

    res.json({
      source: 'openweather',
      location: { latitude: lat, longitude: lng },
      conditions,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Weather API error:', error)
    res.status(500).json({ error: 'Failed to fetch weather data' })
  }
})

// Get historical weather conditions
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, lat = LAKE_ST_CLAIR_LAT, lng = LAKE_ST_CLAIR_LNG } = req.query

    const result = await query(
      `SELECT * FROM environmental_data 
       WHERE latitude BETWEEN $1 AND $2 
       AND longitude BETWEEN $3 AND $4
       AND recorded_at BETWEEN $5 AND $6
       ORDER BY recorded_at DESC
       LIMIT 100`,
      [
        parseFloat(lat) - 0.1, parseFloat(lat) + 0.1,
        parseFloat(lng) - 0.1, parseFloat(lng) + 0.1,
        startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate || new Date()
      ]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Weather history error:', error)
    res.status(500).json({ error: 'Failed to fetch weather history' })
  }
})

// Get weather forecast (mock implementation)
router.get('/forecast', async (req, res) => {
  try {
    const { lat = LAKE_ST_CLAIR_LAT, lng = LAKE_ST_CLAIR_LNG } = req.query

    // Mock 5-day forecast
    const forecast = []
    for (let i = 0; i < 5; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      
      forecast.push({
        date: date.toISOString().split('T')[0],
        conditions: {
          windSpeed: Math.floor(Math.random() * 20) + 5,
          windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
          tempHigh: Math.floor(Math.random() * 10) + 70,
          tempLow: Math.floor(Math.random() * 10) + 55,
          cloudCover: Math.floor(Math.random() * 100),
          precipitationChance: Math.floor(Math.random() * 60)
        }
      })
    }

    res.json({
      location: { latitude: lat, longitude: lng },
      forecast,
      generated: new Date().toISOString()
    })
  } catch (error) {
    console.error('Forecast error:', error)
    res.status(500).json({ error: 'Failed to fetch forecast' })
  }
})

// Helper functions
function degreeToCompass(degree) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  return directions[Math.round(degree / 22.5) % 16]
}

function getMoonPhase(date) {
  // Simplified moon phase calculation
  const phases = [
    'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
    'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'
  ]
  
  const knownNewMoon = new Date('2024-01-11') // Known new moon date
  const daysSinceNewMoon = Math.floor((date - knownNewMoon) / (1000 * 60 * 60 * 24))
  const phase = Math.floor((daysSinceNewMoon % 29.53) / 3.69) // 29.53 days lunar cycle
  
  return phases[phase % 8]
}

module.exports = router