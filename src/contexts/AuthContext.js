'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import config from '../config/api'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Load token and user from localStorage on mount
  useEffect(() => {
    console.log('🔍 AuthContext: Loading auth data from storage...')
    const storedToken = localStorage.getItem('authToken')
    const storedUser = localStorage.getItem('user')
    
    console.log('🔍 AuthContext: storedToken exists:', !!storedToken)
    console.log('🔍 AuthContext: storedUser:', storedUser)
    
    if (storedToken && storedUser) {
      console.log('🔐 AuthContext: Setting user from storage:', JSON.parse(storedUser))
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
      
      // Verify token is still valid
      verifyToken(storedToken)
    } else {
      console.log('❌ AuthContext: No stored auth data found')
    }
    
    setLoading(false)
  }, [])

  const verifyToken = async (authToken) => {
    try {
      const response = await fetch(config.api.endpoints.auth.profile, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      
      if (!response.ok) {
        // Token is invalid, clear auth
        logout()
        return false
      }
      
      const userData = await response.json()
      console.log('🔐 AuthContext: verifyToken received user data:', userData)
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      return true
    } catch (error) {
      console.error('Token verification failed:', error)
      logout()
      return false
    }
  }

  const login = async (email, password) => {
    try {
      const response = await fetch(config.api.endpoints.auth.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Login failed')
      }

      const data = await response.json()
      
      // Store token and user
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      setToken(data.token)
      setUser(data.user)
      
      return { success: true, user: data.user }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: error.message }
    }
  }

  const register = async (email, password) => {
    try {
      const response = await fetch(config.api.endpoints.auth.register, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Registration failed')
      }

      const data = await response.json()
      
      // Store token and user
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      setToken(data.token)
      setUser(data.user)
      
      return { success: true, user: data.user }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: error.message }
    }
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    router.push('/login')
  }

  // Helper function to make authenticated API calls
  const authenticatedFetch = async (url, options = {}) => {
    if (!token) {
      throw new Error('No authentication token');
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    // If unauthorized, logout and redirect
    if (response.status === 401 || response.status === 403) {
      logout();
      throw new Error('Authentication expired');
    }

    return response;
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    authenticatedFetch,
    isAuthenticated: !!token && !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}