'use client'

import { useState } from 'react'

export default function WeatherWidget({ conditions }) {
  const [showDataSources, setShowDataSources] = useState(false)
  if (!conditions) {
    return (
      <div className="card" style={{ background: '#f8fafc' }}>
        <h3 style={{ color: '#1e3a8a', marginBottom: '15px' }}>🌊 Current Lake Conditions</h3>
        <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
          Loading current conditions...
        </div>
      </div>
    )
  }

  const getWindDirection = (direction) => {
    const directions = {
      'N': '⬆️', 'NE': '↗️', 'E': '➡️', 'SE': '↘️',
      'S': '⬇️', 'SW': '↙️', 'W': '⬅️', 'NW': '↖️'
    }
    return directions[direction] || '🌀'
  }

  const getPressureStatus = (pressure) => {
    if (pressure > 30.20) return { status: 'High', color: '#059669', icon: '📈' }
    if (pressure < 29.80) return { status: 'Low', color: '#dc2626', icon: '📉' }
    return { status: 'Stable', color: '#d97706', icon: '➖' }
  }

  const formatTime = (time24) => {
    if (!time24 || time24 === 'N/A') return 'N/A'
    
    try {
      const [hours, minutes] = time24.split(':').map(Number)
      const period = hours >= 12 ? 'PM' : 'AM'
      const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
      
      return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
    } catch (error) {
      return time24
    }
  }

  const getMoonPhaseEmoji = (moonData) => {
    if (typeof moonData === 'string') {
      // Handle old string format
      const phases = {
        'New Moon': '🌑',
        'Waxing Crescent': '🌒', 
        'First Quarter': '🌓',
        'Waxing Gibbous': '🌔',
        'Full Moon': '🌕',
        'Waning Gibbous': '🌖',
        'Last Quarter': '🌗',
        'Waning Crescent': '🌘'
      }
      return phases[moonData] || '🌙'
    } else if (moonData && moonData.name) {
      // Handle new object format with detailed moon data
      const phases = {
        'New Moon': '🌑',
        'Waxing Crescent': '🌒',
        'First Quarter': '🌓', 
        'Waxing Gibbous': '🌔',
        'Full Moon': '🌕',
        'Waning Gibbous': '🌖',
        'Last Quarter': '🌗',
        'Waning Crescent': '🌘'
      }
      return phases[moonData.name] || '🌙'
    }
    return '🌙'
  }

  const pressureInfo = getPressureStatus(conditions.pressure)

  return (
    <div className="card" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' }}>
      <h3 style={{ color: '#1e3a8a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        🌊 Current Lake St. Clair Conditions
        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
          {conditions.source === 'noaa-buoy' ? '🟢 NOAA Live' : 
           conditions.source === 'combined-openweather-noaa' ? '🟢 Combined Data' :
           conditions.source === 'openweather' ? '🟢 Weather API' : 
           '🟢 Live Data'}
        </span>
      </h3>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: '20px' 
      }}>
        {/* Wind */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '5px' }}>
            {getWindDirection(conditions.windDirection)}
          </div>
          <div style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{conditions.windSpeed} mph</div>
          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Wind {conditions.windDirection}</div>
        </div>

        {/* Air Temperature */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '5px' }}>🌡️</div>
          <div style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{conditions.temperature}°F</div>
          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Air Temp</div>
        </div>

        {/* Average Water Temperature - Enhanced with detailed data */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '5px' }}>🌊</div>
          <div style={{ fontWeight: 'bold', color: '#1e3a8a' }}>
            {conditions.waterTemperature ? 
              `${Math.round(conditions.waterTemperature.average)}°F` : 
              `${conditions.waterTemp}°F`
            }
          </div>
          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
            {conditions.waterTemperature ? 'Avg Water Temp' : 'Water Temp'}
          </div>
          {conditions.waterTemperature && (
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
              {conditions.waterTemperature.temperatureRange ? 
                `Range: ${Math.round(conditions.waterTemperature.temperatureRange)}°F` : 
                `${conditions.waterTemperature.totalLocations} locations`
              }
            </div>
          )}
        </div>

        {/* Warmest Water Location */}
        {conditions.waterTemperature?.warmest && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '5px' }}>🔥</div>
            <div style={{ fontWeight: 'bold', color: '#dc2626' }}>{conditions.waterTemperature.warmest.temperature}°F</div>
            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Warmest Water</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
              {conditions.waterTemperature.warmest.name}
            </div>
          </div>
        )}

        {/* Coldest Water Location */}
        {conditions.waterTemperature?.coldest && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '5px' }}>❄️</div>
            <div style={{ fontWeight: 'bold', color: '#0284c7' }}>{conditions.waterTemperature.coldest.temperature}°F</div>
            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Coldest Water</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
              {conditions.waterTemperature.coldest.name}
            </div>
          </div>
        )}

        {/* Barometric Pressure */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '5px' }}>{pressureInfo.icon}</div>
          <div style={{ fontWeight: 'bold', color: pressureInfo.color }}>{conditions.pressure}"</div>
          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{pressureInfo.status} Pressure</div>
        </div>

        {/* Cloud Cover */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '5px' }}>
            {conditions.cloudCover > 75 ? '☁️' : conditions.cloudCover > 25 ? '⛅' : '☀️'}
          </div>
          <div style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{conditions.cloudCover}%</div>
          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Clouds</div>
        </div>

        {/* Humidity */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '5px' }}>💧</div>
          <div style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{conditions.humidity}%</div>
          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Humidity</div>
        </div>

        {/* Wave Height (if available) */}
        {conditions.waveHeight && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '5px' }}>🌊</div>
            <div style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{conditions.waveHeight} ft</div>
            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Wave Height</div>
          </div>
        )}

        {/* Moon Phase */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '5px' }}>
            {getMoonPhaseEmoji(conditions.moonPhase)}
          </div>
          <div style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: '0.85rem' }}>
            {typeof conditions.moonPhase === 'string' ? conditions.moonPhase : conditions.moonPhase?.name || 'Unknown'}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
            {conditions.moonPhase?.optimal ? '🎣 Optimal' : 'Moon Phase'}
            {conditions.moonPhase?.illumination !== undefined && 
              ` (${conditions.moonPhase.illumination}%)`
            }
          </div>
        </div>

        {/* Sunrise/Sunset */}
        {conditions.astronomy && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '5px' }}>🌅</div>
            <div style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: '0.8rem' }}>
              <div>Rise: {formatTime(conditions.astronomy.sunrise)}</div>
              <div>Set: {formatTime(conditions.astronomy.sunset)}</div>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Sunrise/Sunset</div>
          </div>
        )}

        {/* Moonrise/Moonset */}
        {conditions.astronomy && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '5px' }}>🌙</div>
            <div style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: '0.8rem' }}>
              <div>Rise: {formatTime(conditions.astronomy.moonrise)}</div>
              <div>Set: {formatTime(conditions.astronomy.moonset)}</div>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Moonrise/Moonset</div>
          </div>
        )}

      </div>


      {/* Collapsible Data Sources */}
      {conditions.dataQuality && (
        <div style={{ marginTop: '15px' }}>
          <div 
            style={{ 
              cursor: 'pointer',
              padding: '10px',
              background: 'rgba(59, 130, 246, 0.05)',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onClick={() => setShowDataSources(!showDataSources)}
          >
            <span>{showDataSources ? '▼' : '▶'}</span>
            Data Sources
          </div>
          
          {showDataSources && (
            <div style={{ 
              marginTop: '10px',
              padding: '15px', 
              background: 'rgba(59, 130, 246, 0.05)', 
              borderRadius: '6px',
              fontSize: '0.8rem',
              color: '#64748b',
              transition: 'all 0.3s ease-out'
            }}>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span>{conditions.dataQuality.realBuoyData ? '✅ NOAA Buoy' : '❌ NOAA Buoy'}</span>
                <span>{conditions.dataQuality.realWeatherData ? '✅ Perplexity API' : '❌ Weather API'}</span>
                <span>{conditions.moonPhase?.source === 'USNO' ? '✅ USNO Astronomy' : 
                       conditions.moonPhase?.source === 'validated' ? '✅ Validated Data' : 
                       '❌ Moon Data'}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                <div><strong>Weather:</strong> {conditions.dataSources?.weather || 'Perplexity API'} (temp, wind, humidity)</div>
                <div><strong>Astronomy:</strong> U.S. Naval Observatory (moon phase, sun/moon times)</div>
                <div><strong>Water Temp:</strong> {conditions.dataSources?.waterTemp || 'seatemperature.info'} 
                  {conditions.waterTemperature?.totalLocations && ` (${conditions.waterTemperature.totalLocations} locations)`}
                </div>
                <div><strong>Pressure:</strong> Estimated from weather data</div>
              </div>
              {conditions.dataQuality.lastUpdated && (
                <div style={{ marginTop: '5px' }}>
                  Updated: {new Date(conditions.dataQuality.lastUpdated).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}