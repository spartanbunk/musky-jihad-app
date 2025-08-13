'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import FishingDashboard from '../components/FishingDashboard'
import AuthModal from '../components/AuthModal'
import { registerServiceWorker, setupInstallPrompt } from '../utils/registerSW'

export default function Home() {
  const { user, isAuthenticated, logout, loading } = useAuth()
  const router = useRouter()
  const [showAuth, setShowAuth] = useState(false)

  const handleLogin = (userData) => {
    setShowAuth(false)
    // Auth context handles the rest
  }

  const handleLogout = () => {
    logout()
  }

  // Initialize PWA features and check auth
  useEffect(() => {
    registerServiceWorker()
    setupInstallPrompt()
    
    // Redirect to login if not authenticated
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, loading, router])

  // Show loading while checking auth
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.5rem',
        color: '#64748b'
      }}>
        Loading...
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return (
    <div>
      <header className="header">
        <div className="container">
          <nav className="nav">
            <div className="logo">🎣 Lake St. Clair Fishing Intelligence</div>
            <ul className="nav-links">
              <li><span>Welcome, {user?.email}</span></li>
              <li><button className="btn btn-secondary" onClick={handleLogout}>Logout</button></li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="container">
        {isAuthenticated ? (
          <FishingDashboard user={user} />
        ) : (
          <div className="card" style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', color: '#1e3a8a' }}>
              Master Lake St. Clair Fishing
            </h1>
            <p style={{ fontSize: '1.2rem', marginBottom: '30px', color: '#64748b' }}>
              AI-powered analysis for musky, walleye, bass, pike, and more. 
              Get real-time conditions, weed patterns, and personalized fishing recommendations.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => setShowAuth(true)}>
                Start Fishing Smarter
              </button>
              <button className="btn btn-secondary">
                Learn More
              </button>
            </div>
            
            <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ color: '#1e3a8a', marginBottom: '10px' }}>🌊 Real-Time Conditions</h3>
                <p style={{ color: '#64748b' }}>Wind, temperature, barometric pressure, moon phases, and water conditions</p>
              </div>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ color: '#1e3a8a', marginBottom: '10px' }}>🗺️ Smart Mapping</h3>
                <p style={{ color: '#64748b' }}>Plot catches with GPS precision and species-specific insights</p>
              </div>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ color: '#1e3a8a', marginBottom: '10px' }}>🤖 AI Analysis</h3>
                <p style={{ color: '#64748b' }}>Pattern recognition for optimal fishing times and locations</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {showAuth && (
        <AuthModal 
          onClose={() => setShowAuth(false)} 
          onLogin={handleLogin}
        />
      )}
    </div>
  )
}