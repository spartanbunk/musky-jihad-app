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
      // Mock data for development - replace with actual API calls
      setCurrentConditions({
        windSpeed: 12,
        windDirection: 'SW',
        temperature: 68,
        waterTemp: 72,
        pressure: 30.15,
        cloudCover: 25,
        moonPhase: 'Waxing Gibbous'
      })
    } catch (error) {
      console.error('Error fetching conditions:', error)
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
      // Mock AI recommendations based on species
      const recommendations = {
        musky: 'Current conditions favor musky activity. Southwest winds are pushing baitfish toward the north shore weedlines. Focus on 8-12 foot edges with large baits.',
        walleye: 'Excellent walleye conditions with dropping pressure. Target 15-20 foot depths along the Canadian shipping channel.',
        bass: 'Good bass fishing with moderate winds. Focus on shallow rocky areas and drop-offs in 6-10 feet of water.'
      }
      
      setAiRecommendations({
        text: recommendations[selectedSpecies] || 'Loading recommendations...',
        confidence: 85,
        bestTimes: ['6:00 AM - 9:00 AM', '6:30 PM - 8:00 PM']
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