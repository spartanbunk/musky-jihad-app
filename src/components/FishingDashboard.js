'use client'

import { useState, useEffect } from 'react'
import WeatherWidget from './WeatherWidget'
import FishingMap from './FishingMap'
import CatchLogger from './CatchLogger'
import SpeciesSelector from './SpeciesSelector'

export default function FishingDashboard({ user }) {
  const [selectedSpecies, setSelectedSpecies] = useState('musky')
  const [currentConditions, setCurrentConditions] = useState(null)
  const [aiRecommendations, setAiRecommendations] = useState(null)
  const [userCatches, setUserCatches] = useState([])

  useEffect(() => {
    // Load current conditions on dashboard mount
    fetchCurrentConditions()
    fetchUserCatches()
    fetchAIRecommendations()
  }, [selectedSpecies])

  const fetchCurrentConditions = async () => {
    try {
      // Fetch real weather data from our backend API
      const response = await fetch('http://localhost:3011/api/weather/current-validated')
      if (!response.ok) {
        throw new Error('Failed to fetch weather data')
      }
      
      const weatherData = await response.json()
      console.log('Weather data received:', weatherData)
      
      // Update conditions with real data
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
        dataQuality: weatherData.dataQuality
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

  const handleCatchLogged = (newCatch) => {
    setUserCatches(prev => [newCatch, ...prev])
    fetchAIRecommendations() // Refresh recommendations with new data
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#1e3a8a', fontSize: '1.8rem' }}>Fishing Intelligence Dashboard</h2>
          <SpeciesSelector 
            selectedSpecies={selectedSpecies} 
            onSpeciesChange={setSelectedSpecies}
          />
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