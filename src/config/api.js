// API Configuration
// This file centralizes all API endpoints and URLs

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010'

export const config = {
  api: {
    baseUrl: API_URL,
    endpoints: {
      // Auth endpoints
      auth: {
        login: `${API_URL}/api/auth/login`,
        register: `${API_URL}/api/auth/register`,
        profile: `${API_URL}/api/auth/profile`,
        logout: `${API_URL}/api/auth/logout`
      },
      // Catches endpoints
      catches: {
        base: `${API_URL}/api/catches`,
        byId: (id) => `${API_URL}/api/catches/${id}`,
        stats: `${API_URL}/api/catches/stats`
      },
      // Weather endpoints
      weather: {
        current: `${API_URL}/api/weather/current`,
        currentWithWaterTemp: `${API_URL}/api/weather/current-with-water-temp`,
        solunar: `${API_URL}/api/weather/solunar-multi`,
        dailyReport: `${API_URL}/api/weather/daily-fishing-report`
      },
      // Upload endpoints
      uploads: {
        catchPhoto: `${API_URL}/api/uploads/catch-photo`
      },
      // AI endpoints
      ai: {
        recommendations: `${API_URL}/api/ai/recommendations`
      }
    }
  },
  app: {
    url: APP_URL
  }
}

// Helper function to build photo URLs
export const buildPhotoUrl = (path) => {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${API_URL}${path}`
}

export default config