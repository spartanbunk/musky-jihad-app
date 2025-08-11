'use client'

import { useState, useEffect } from 'react'
import WeatherWidget from './WeatherWidget'
import FishingMap from './FishingMap'
import CatchLogger from './CatchLogger'
import SpeciesSelector from './SpeciesSelector'
import FishingReports from './FishingReports'

export default function FishingDashboard({ user }) {
  const [selectedSpecies, setSelectedSpecies] = useState('musky')
  const [currentConditions, setCurrentConditions] = useState(null)
  const [aiRecommendations, setAiRecommendations] = useState(null)
  const [userCatches, setUserCatches] = useState([])
  const [dailyReport, setDailyReport] = useState(null)

  useEffect(() => {
    // Load current conditions on dashboard mount
    fetchCurrentConditions()
    fetchUserCatches()
    fetchAIRecommendations()
    fetchDailyReport() // Re-enabled with database-backed caching
  }, [selectedSpecies])

  const fetchCurrentConditions = async () => {
    try {
      // Fetch complete weather + water temperature data from our backend API
      const response = await fetch('http://localhost:3011/api/weather/current-with-water-temp')
      if (!response.ok) {
        throw new Error('Failed to fetch weather data')
      }
      
      const weatherData = await response.json()
      console.log('Complete weather + water temperature data received:', weatherData)
      
      // Update conditions with real data including water temperature
      setCurrentConditions({
        windSpeed: weatherData.conditions.windSpeed,
        windDirection: weatherData.conditions.windDirection,
        temperature: weatherData.conditions.temperature,
        waterTemp: weatherData.conditions.waterTemp,
        pressure: parseFloat(weatherData.conditions.pressure),
        cloudCover: weatherData.conditions.cloudCover,
        humidity: weatherData.conditions.humidity,
        moonPhase: weatherData.conditions.moonPhase,
        astronomy: weatherData.conditions.astronomy,
        waveHeight: weatherData.conditions.waveHeight,
        source: weatherData.source,
        dataQuality: weatherData.dataQuality,
        // Add detailed water temperature data
        waterTemperature: weatherData.waterTemperature,
        fishingRecommendations: weatherData.fishingRecommendations,
        dataSources: weatherData.dataSources
      })
    } catch (error) {
      console.error('Error fetching conditions:', error)
      // Fallback to mock data if API fails
      setCurrentConditions({
        windSpeed: 8,
        windDirection: 'SW',
        temperature: 68,
        waterTemp: 70,
        pressure: 30.00,
        cloudCover: 30,
        humidity: 65,
        moonPhase: { name: 'Unknown', illumination: 50, optimal: false },
        astronomy: { sunrise: 'N/A', sunset: 'N/A', moonrise: 'N/A', moonset: 'N/A' },
        source: 'offline'
      })
    }
  }

  const fetchUserCatches = async () => {
    try {
      // Mock data - replace with API call
      setUserCatches([
        {
          id: 1,
          species: 'musky',
          length: 42,
          weight: 18.5,
          latitude: 42.4583,
          longitude: -82.7167,
          catchTime: new Date().toISOString(),
          conditions: { temp: 68, wind: 12 }
        }
      ])
    } catch (error) {
      console.error('Error fetching catches:', error)
    }
  }

  const fetchAIRecommendations = async () => {
    try {
      // Fetch real solunar data for best fishing times
      let bestTimes = ['6:00 AM - 9:00 AM', '6:30 PM - 8:00 PM'] // Default fallback
      let solunarConfidence = 70
      
      try {
        const solunarResponse = await fetch('http://localhost:3011/api/weather/solunar-multi')
        if (solunarResponse.ok) {
          const solunarData = await solunarResponse.json()
          console.log('Multi-source solunar data received:', solunarData)
          
          if (solunarData.fishingForecast && solunarData.fishingForecast.bestTimes) {
            bestTimes = solunarData.fishingForecast.bestTimes.map(period => {
              // Convert 24hr format to 12hr format for display
              const formatTime = (time24) => {
                if (!time24) return time24
                const [hours, minutes] = time24.split(':').map(Number)
                const period = hours >= 12 ? 'PM' : 'AM'
                const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
                return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
              }
              
              return `${formatTime(period.start)} - ${formatTime(period.end)} (${period.type})`
            })
            
            solunarConfidence = solunarData.solunar.reliability === 'high' ? 95 : 
                               solunarData.solunar.reliability === 'medium' ? 85 : 75
          }
        }
      } catch (solunarError) {
        console.log('Solunar data fetch failed, using defaults:', solunarError.message)
      }
      
      // Mock AI recommendations based on species with real solunar integration
      const recommendations = {
        musky: 'Current conditions favor musky activity. Southwest winds are pushing baitfish toward the north shore weedlines. Focus on 8-12 foot edges with large baits during peak solunar periods.',
        walleye: 'Excellent walleye conditions with dropping pressure. Target 15-20 foot depths along the Canadian shipping channel during major feeding periods.',
        bass: 'Good bass fishing with moderate winds. Focus on shallow rocky areas and drop-offs in 6-10 feet of water during solunar peak times.'
      }
      
      setAiRecommendations({
        text: recommendations[selectedSpecies] || 'Loading recommendations...',
        confidence: solunarConfidence,
        bestTimes: bestTimes
      })
    } catch (error) {
      console.error('Error fetching AI recommendations:', error)
    }
  }

  const fetchDailyReport = async () => {
    try {
      console.log('📊 Fetching daily fishing report from database...')
      const response = await fetch('http://localhost:3011/api/weather/daily-fishing-report')
      
      if (!response.ok) {
        // Handle different error cases
        if (response.status === 500) {
          const errorData = await response.json().catch(() => ({}))
          console.log('Server error fetching report:', errorData)
          setDailyReport({
            error: true,
            message: 'Daily report is being generated. Please check back in a few minutes.',
            details: 'The system is attempting to generate today\'s fishing report.'
          })
          return
        }
        throw new Error('Failed to fetch daily fishing report')
      }
      
      const reportData = await response.json()
      console.log('Daily fishing report received:', reportData)
      
      if (reportData.success === false) {
        // Handle API errors gracefully
        setDailyReport({
          error: true,
          message: 'Daily report temporarily unavailable',
          details: 'The fishing report will be available once generated by our system.'
        })
        return
      }
      
      setDailyReport({
        title: reportData.title,
        content: reportData.content,
        generatedAt: reportData.generatedAt,
        source: reportData.source,
        cacheStatus: reportData.cacheStatus,
        tokenCount: reportData.tokenCount
      })
    } catch (error) {
      console.error('Error fetching daily fishing report:', error)
      // Set graceful error message instead of null
      setDailyReport({
        error: true,
        message: 'Unable to load daily fishing report',
        details: 'Please try refreshing the page or check back later.'
      })
    }
  }

  const handleCatchLogged = (newCatch) => {
    setUserCatches(prev => [newCatch, ...prev])
    fetchAIRecommendations() // Refresh recommendations with new data
  }

  return (
    <div>
      <div className="card">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <h2 style={{ color: '#1e3a8a', fontSize: '1.8rem', margin: 0 }}>
            Fishing Intelligence Dashboard
          </h2>
          
          {/* Overall Fishing Conditions - Center */}
          {currentConditions && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '8px 16px',
              borderRadius: '20px',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              backgroundColor: currentConditions.windSpeed < 15 && currentConditions.pressure > 29.9 ? '#059669' : 
                             currentConditions.windSpeed < 20 && currentConditions.pressure > 29.7 ? '#d97706' : '#dc2626',
              color: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              {currentConditions.windSpeed < 15 && currentConditions.pressure > 29.9 ? '⚡ EXCELLENT' : 
               currentConditions.windSpeed < 20 && currentConditions.pressure > 29.7 ? '✓ GOOD' : '△ FAIR'}
            </div>
          )}
          
          {/* Species Selector - Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Species:</span>
            <select 
              value={selectedSpecies}
              onChange={(e) => setSelectedSpecies(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '2px solid #e2e8f0',
                backgroundColor: 'white',
                color: '#1e3a8a',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                cursor: 'pointer',
                minWidth: '120px'
              }}
            >
              <option value="musky">🐟 Musky</option>
              <option value="walleye">🎣 Walleye</option>
              <option value="bass">🎯 Bass</option>
            </select>
          </div>
        </div>
        
        {/* Current Conditions */}
        <WeatherWidget conditions={currentConditions} />
        
        {/* AI Recommendations */}
        {aiRecommendations && (
          <div className="card" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', border: '1px solid #0284c7' }}>
            <h3 style={{ color: '#0369a1', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🤖 AI Fishing Recommendations for {selectedSpecies.charAt(0).toUpperCase() + selectedSpecies.slice(1)}
              <span style={{ fontSize: '0.8rem', background: '#0284c7', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>
                {aiRecommendations.confidence}% confidence
              </span>
            </h3>
            <p style={{ marginBottom: '15px', lineHeight: '1.6' }}>{aiRecommendations.text}</p>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <strong>Best Times Today:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  {aiRecommendations.bestTimes.map((time, index) => (
                    <li key={index}>{time}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* Daily Fishing Report */}
        <FishingReports dailyReport={dailyReport} />
      </div>

      {/* Map and Catch Logger */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginTop: '20px' }}>
        <div className="card">
          <h3 style={{ color: '#1e3a8a', marginBottom: '15px' }}>
            Lake St. Clair - {selectedSpecies.charAt(0).toUpperCase() + selectedSpecies.slice(1)} Locations
          </h3>
          <FishingMap 
            catches={userCatches.filter(fishCatch => fishCatch.species === selectedSpecies)}
            selectedSpecies={selectedSpecies}
          />
        </div>
        
        <div>
          <CatchLogger 
            onCatchLogged={handleCatchLogged}
            currentConditions={currentConditions}
          />
        </div>
      </div>

      {/* Recent Catches */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3 style={{ color: '#1e3a8a', marginBottom: '15px' }}>Recent Catches</h3>
        {userCatches.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {userCatches.slice(0, 6).map(fishCatch => (
              <div key={fishCatch.id} style={{ 
                background: '#f8fafc', 
                padding: '15px', 
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                    {fishCatch.species}
                  </span>
                  <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                    {new Date(fishCatch.catchTime).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ margin: '5px 0' }}>Length: {fishCatch.length}"</p>
                <p style={{ margin: '5px 0' }}>Weight: {fishCatch.weight} lbs</p>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  Conditions: {fishCatch.conditions.temp}°F, {fishCatch.conditions.wind}mph wind
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>
            No catches logged yet. Start logging your catches to build your fishing intelligence!
          </p>
        )}
      </div>
    </div>
  )
}