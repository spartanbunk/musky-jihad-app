const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const path = require('path')
require('dotenv').config()

// Environment variable validation
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PORT'
]

console.log('🔧 Validating environment variables...')
const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars)
  console.error('💡 Make sure .env file exists and is properly loaded')
  process.exit(1)
}

console.log('✅ Environment variables validated')
console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:]*@/, ':***@'))
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Missing')

// Ensure NODE_ENV is set (fallback to development if not specified)
// Trim any whitespace from NODE_ENV
process.env.NODE_ENV = (process.env.NODE_ENV || 'development').trim()
console.log('🔧 Server starting with NODE_ENV:', process.env.NODE_ENV)
console.log('🔧 NODE_ENV length:', process.env.NODE_ENV.length)
console.log('🔧 NODE_ENV is development?:', process.env.NODE_ENV === 'development')

const { router: authRoutes } = require('./routes/auth')
const catchesRoutes = require('./routes/catches')
const weatherRoutes = require('./routes/weather')
const aiRoutes = require('./routes/ai')
const stripeRoutes = require('./routes/stripe')
const fishingReportsRoutes = require('./routes/fishingReports')
const imageProxyRoutes = require('./routes/imageProxy')
const uploadsRoutes = require('./routes/uploads')
const ReportScheduler = require('./services/reportScheduler')

const app = express()
const PORT = process.env.PORT || 3011

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow cross-origin requests for images
}))
// Parse allowed origins from environment variable or use defaults
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3010', 'http://localhost:3000']

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Serve static files from public/uploads folder with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Cross-Origin-Resource-Policy', 'cross-origin')
  next()
}, express.static(path.join(__dirname, '../public/uploads')))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/catches', catchesRoutes)
app.use('/api/weather', weatherRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/stripe', stripeRoutes)
app.use('/api/reports', fishingReportsRoutes)
app.use('/api/images', imageProxyRoutes)
app.use('/api/uploads', uploadsRoutes)


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎣 Lake St. Clair Fishing API server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  
  // Start the daily report scheduler
  ReportScheduler.startScheduler()
})