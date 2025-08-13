// Authentication debugging and clearing utility

export const clearAllAuth = () => {
  console.log('🔧 Clearing all authentication data...')
  
  // Clear localStorage
  const keys = Object.keys(localStorage)
  keys.forEach(key => {
    if (key.includes('auth') || key.includes('token') || key.includes('user')) {
      console.log('🗑️ Removing localStorage key:', key)
      localStorage.removeItem(key)
    }
  })
  
  // Clear sessionStorage
  const sessionKeys = Object.keys(sessionStorage)
  sessionKeys.forEach(key => {
    if (key.includes('auth') || key.includes('token') || key.includes('user')) {
      console.log('🗑️ Removing sessionStorage key:', key)
      sessionStorage.removeItem(key)
    }
  })
  
  // Clear all cookies
  document.cookie.split(";").forEach((c) => {
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
  })
  
  console.log('✅ All auth data cleared')
}

export const debugAuth = () => {
  console.log('🔍 Current auth state:')
  console.log('localStorage user:', localStorage.getItem('user'))
  console.log('localStorage authToken:', localStorage.getItem('authToken'))
  console.log('sessionStorage user:', sessionStorage.getItem('user'))
  console.log('sessionStorage authToken:', sessionStorage.getItem('authToken'))
  console.log('All localStorage keys:', Object.keys(localStorage))
  console.log('All sessionStorage keys:', Object.keys(sessionStorage))
}

// Auto-run debug on import
if (typeof window !== 'undefined') {
  debugAuth()
}