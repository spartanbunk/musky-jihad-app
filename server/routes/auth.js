const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query } = require('../database/connection')

const router = express.Router()

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const newUser = await query(
      `INSERT INTO users (email, password_hash, subscription_status) 
       VALUES ($1, $2, 'trial') 
       RETURNING id, email, subscription_status, created_at`,
      [email, passwordHash]
    )

    const user = newUser.rows[0]

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        subscriptionStatus: user.subscription_status,
        createdAt: user.created_at
      },
      token
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    // Find user
    const userResult = await query(
      'SELECT id, email, password_hash, subscription_status FROM users WHERE email = $1',
      [email]
    )

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const user = userResult.rows[0]

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        subscriptionStatus: user.subscription_status
      },
      token
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// Verify token middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT verification error:', err.message, 'Token:', token ? token.substring(0, 20) + '...' : 'none')
      return res.status(403).json({ error: 'Invalid token', details: err.message })
    }
    req.user = user
    next()
  })
}

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userResult = await query(
      `SELECT id, email, subscription_status, subscription_tier, 
       first_name, last_name, phone, trial_end_date, 
       preferred_species, notification_settings, 
       created_at, updated_at 
       FROM users WHERE id = $1`,
      [req.user.userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json(userResult.rows[0])
  } catch (error) {
    console.error('Profile error:', error)
    res.status(500).json({ error: 'Failed to get profile' })
  }
})

// Update user preferences
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      phone, 
      preferredSpecies, 
      notificationSettings 
    } = req.body

    await query(
      `UPDATE users SET 
       first_name = COALESCE($1, first_name),
       last_name = COALESCE($2, last_name),
       phone = COALESCE($3, phone),
       preferred_species = COALESCE($4, preferred_species),
       notification_settings = COALESCE($5, notification_settings),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [
        firstName, 
        lastName, 
        phone, 
        preferredSpecies, 
        notificationSettings ? JSON.stringify(notificationSettings) : null, 
        req.user.userId
      ]
    )

    res.json({ message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Profile update error:', error)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

module.exports = { router, authenticateToken }