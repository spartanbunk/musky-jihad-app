'use client'

import { useState } from 'react'

export default function FishingReports({ dailyReport }) {
  const [isExpanded, setIsExpanded] = useState(false)
  // Handle loading state
  if (!dailyReport) {
    return (
      <div className="card" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' }}>
        <h3 style={{ color: '#1e3a8a', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          📊 Daily Fishing Report
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Lake St. Clair</span>
        </h3>
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🎣</div>
          <div>Loading daily fishing report...</div>
        </div>
      </div>
    )
  }

  // Handle error state
  if (dailyReport.error) {
    return (
      <div className="card" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}>
        <h3 style={{ color: '#92400e', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          📊 Daily Fishing Report
          <span style={{ fontSize: '0.8rem', color: '#a16207' }}>🟡 Unavailable</span>
        </h3>
        <div style={{ 
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #f59e0b',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '15px' }}>⏳</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#92400e', marginBottom: '8px' }}>
            {dailyReport.message}
          </div>
          <div style={{ color: '#a16207', fontSize: '0.9rem', lineHeight: '1.5' }}>
            {dailyReport.details}
          </div>
          <div style={{ 
            marginTop: '15px', 
            padding: '10px', 
            background: '#fef3c7', 
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: '#78350f'
          }}>
            💡 Reports are automatically generated daily at 12:01 AM ET
          </div>
        </div>
      </div>
    )
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Today'
    }
  }

  const getCacheStatusColor = (status) => {
    switch (status) {
      case 'fresh': return '#059669'
      case 'cached': return '#d97706' 
      case 'fallback': return '#dc2626'
      default: return '#64748b'
    }
  }

  const getCacheStatusText = (status) => {
    switch (status) {
      case 'fresh': return '🟢 Live Report'
      case 'cached': return '🟡 Cached Report'
      case 'fallback': return '📝 Local Report'
      default: return '📊 Daily Report'
    }
  }

  return (
    <div className="card" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ color: '#1e3a8a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            📊 Daily Fishing Report
            <span style={{ 
              fontSize: '0.8rem',
              color: getCacheStatusColor(dailyReport.cacheStatus),
              fontWeight: 'bold'
            }}>
              {getCacheStatusText(dailyReport.cacheStatus)}
            </span>
          </h3>
          
          {/* Expand/Collapse Button */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {isExpanded ? '▲ Collapse' : '▼ Expand'}
          </button>
        </div>
        
        <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
          <div>{dailyReport.title}</div>
          {dailyReport.generatedAt && (
            <div style={{ marginTop: '2px' }}>
              Updated: {formatDate(dailyReport.generatedAt)}
            </div>
          )}
        </div>
      </div>
      
      {/* Preview when collapsed */}
      {!isExpanded && (
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <div style={{ 
            fontSize: '0.9rem',
            lineHeight: '1.6',
            color: '#64748b',
            fontStyle: 'italic'
          }}>
            {dailyReport.content.substring(0, 200)}...
          </div>
          <div style={{ 
            marginTop: '10px',
            fontSize: '0.8rem',
            color: '#94a3b8'
          }}>
            Click "Expand" to view the full report
          </div>
        </div>
      )}
      
      {/* Full Daily Report Content */}
      {isExpanded && (
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <div style={{ 
            fontSize: '0.95rem',
            lineHeight: '1.7',
            color: '#374151',
            whiteSpace: 'pre-line'
          }}>
            {dailyReport.content}
          </div>
        </div>
      )}
      
      {/* Report Footer */}
      <div style={{ 
        marginTop: '15px',
        paddingTop: '15px',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.8rem',
        color: '#94a3b8'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span>
            📍 {dailyReport.location || 'Lake St. Clair, MI'}
          </span>
          {dailyReport.cacheStatus === 'fresh' && (
            <span>
              ⚡ Generated fresh today
            </span>
          )}
          {dailyReport.cacheStatus === 'cached' && (
            <span>
              💾 From today's cache
            </span>
          )}
        </div>
        
        {dailyReport.validUntil && (
          <div style={{ color: '#64748b' }}>
            Next update: {formatDate(dailyReport.validUntil)}
          </div>
        )}
      </div>
      
      {/* Cache Info for Development */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          marginTop: '10px',
          padding: '8px 12px',
          background: '#f8fafc',
          borderRadius: '6px',
          fontSize: '0.75rem',
          color: '#64748b',
          fontFamily: 'monospace'
        }}>
          Cache Status: {dailyReport.cacheStatus} | Generated: {dailyReport.generatedAt}
        </div>
      )}
    </div>
  )
}