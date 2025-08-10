'use client'

import { useState } from 'react'

export default function AuthModal({ onClose, onLogin }) {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!isLogin) {
        // Sign up validation
        if (formData.password !== formData.confirmPassword) {
          alert('Passwords do not match')
          setLoading(false)
          return
        }
        if (formData.password.length < 6) {
          alert('Password must be at least 6 characters')
          setLoading(false)
          return
        }
      }

      // Mock authentication - replace with actual API calls
      if (isLogin) {
        // Mock login
        setTimeout(() => {
          onLogin({ 
            email: formData.email, 
            id: '12345',
            subscriptionStatus: 'active'
          })
          setLoading(false)
        }, 1000)
      } else {
        // Mock signup - would normally create account then redirect to Stripe
        setTimeout(() => {
          alert('Account created! Please complete your subscription to access all features.')
          onLogin({ 
            email: formData.email, 
            id: '12345',
            subscriptionStatus: 'trial'
          })
          setLoading(false)
        }, 1000)
      }
    } catch (error) {
      console.error('Auth error:', error)
      alert('Authentication failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '30px',
        width: '90%',
        maxWidth: '400px',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#64748b'
          }}
        >
          ✕
        </button>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🎣</div>
          <h2 style={{ color: '#1e3a8a', marginBottom: '10px' }}>
            {isLogin ? 'Welcome Back!' : 'Join Lake St. Clair Intelligence'}
          </h2>
          <p style={{ color: '#64748b' }}>
            {isLogin 
              ? 'Sign in to access your fishing intelligence dashboard'
              : 'Start catching more fish with AI-powered analysis'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: 'bold', 
              color: '#374151' 
            }}>
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your@email.com"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: isLogin ? '20px' : '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: 'bold', 
              color: '#374151' 
            }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px'
              }}
              required
            />
          </div>

          {!isLogin && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontWeight: 'bold', 
                color: '#374151' 
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ 
              width: '100%',
              marginBottom: '20px',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#64748b', marginBottom: '15px' }}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </p>
          <button
            onClick={() => setIsLogin(!isLogin)}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>

        {!isLogin && (
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            background: '#f0f9ff', 
            borderRadius: '8px',
            border: '1px solid #0284c7'
          }}>
            <h4 style={{ color: '#0369a1', marginBottom: '10px' }}>🚀 Subscription Features:</h4>
            <ul style={{ color: '#64748b', fontSize: '0.9rem', paddingLeft: '20px' }}>
              <li>Real-time weather and conditions</li>
              <li>AI-powered fishing recommendations</li>
              <li>Unlimited catch logging</li>
              <li>Species-specific insights</li>
              <li>Historical pattern analysis</li>
            </ul>
            <p style={{ color: '#0369a1', fontSize: '0.8rem', marginTop: '10px', fontWeight: 'bold' }}>
              7-day free trial, then $9.99/month
            </p>
          </div>
        )}
      </div>
    </div>
  )
}