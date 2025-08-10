'use client'

export default function WeatherWidget({ conditions }) {
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

  const getMoonPhaseEmoji = (phase) => {
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
    return phases[phase] || '🌙'
  }

  const pressureInfo = getPressureStatus(conditions.pressure)

  return (
    <div className="card" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' }}>
      <h3 style={{ color: '#1e3a8a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        🌊 Current Lake St. Clair Conditions
        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Live Data</span>
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

        {/* Water Temperature */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '5px' }}>🌊</div>
          <div style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{conditions.waterTemp}°F</div>
          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Water Temp</div>
        </div>

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

        {/* Moon Phase */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '5px' }}>
            {getMoonPhaseEmoji(conditions.moonPhase)}
          </div>
          <div style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: '0.85rem' }}>
            {conditions.moonPhase}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Moon Phase</div>
        </div>
      </div>

      {/* Fishing Condition Summary */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        background: 'rgba(59, 130, 246, 0.1)', 
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <div style={{ fontWeight: 'bold', color: '#1e3a8a', marginBottom: '5px' }}>
          Overall Fishing Conditions
        </div>
        <div style={{ 
          display: 'inline-block', 
          padding: '4px 12px', 
          background: '#059669', 
          color: 'white', 
          borderRadius: '12px',
          fontSize: '0.9rem',
          fontWeight: 'bold'
        }}>
          {conditions.windSpeed < 15 && conditions.pressure > 29.9 ? 'EXCELLENT' : 
           conditions.windSpeed < 20 && conditions.pressure > 29.7 ? 'GOOD' : 'FAIR'}
        </div>
      </div>
    </div>
  )
}