const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
require('dotenv').config()

const { router: authRoutes } = require('./routes/auth')
const catchesRoutes = require('./routes/catches')
const weatherRoutes = require('./routes/weather')
const aiRoutes = require('./routes/ai')
const stripeRoutes = require('./routes/stripe')
const fishingReportsRoutes = require('./routes/fishingReports')
const imageProxyRoutes = require('./routes/imageProxy')
const ReportScheduler = require('./services/reportScheduler')

const app = express()
const PORT = process.env.PORT || 3011

// Middleware
app.use(helmet())
app.use(cors({
  origin: ['http://localhost:3010', 'http://localhost:3000'],
  credentials: true
}))
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

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