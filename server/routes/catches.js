const express = require('express')
const { query } = require('../database/connection')
const { authenticateToken } = require('./auth')

const router = express.Router()

// Get all catches for authenticated user
router.get('/', async (req, res) => {
  const currentEnv = (process.env.NODE_ENV || '').trim();
  console.log('🎣 GET /api/catches - Environment:', currentEnv);
  console.log('🎣 Environment is development?:', currentEnv === 'development');
  
  // Skip auth in development for testing
  let userId = null;
  if (req.user && req.user.userId) {
    console.log('🎣 Using authenticated user:', req.user.userId);
    userId = req.user.userId;
  } else if (currentEnv === 'development') {
    console.log('🎣 Development mode - looking for test user');
    // For development, use test user
    try {
      const testUser = await query('SELECT id FROM users WHERE email = $1', ['test@fishing.com']);
      console.log('🎣 Test user found:', testUser.rows.length > 0);
      if (testUser.rows.length > 0) {
        userId = testUser.rows[0].id;
        console.log('🎣 Using test user ID:', userId);
      } else {
        console.log('🎣 No test user found, returning 404');
        return res.status(404).json({ error: 'No test user found' });
      }
    } catch (error) {
      console.error('🎣 Database error in development:', error);
      return res.status(500).json({ error: 'Database error in development mode' });
    }
  } else {
    console.log('🎣 Production mode - returning 401');
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const { species, limit = 50, offset = 0 } = req.query

    let queryText = `
      SELECT 
        fc.id, fc.fish_length, fc.fish_weight, fc.catch_time,
        fc.latitude, fc.longitude, fc.depth_feet, fc.lure_type,
        fc.environmental_conditions, fc.photo_url, fc.location_notes,
        fs.species_name, fs.icon_emoji, fs.map_color
      FROM fish_catches fc
      JOIN fish_species fs ON fc.species_id = fs.id
      WHERE fc.user_id = $1
    `
    const queryParams = [userId]

    if (species) {
      queryText += ' AND fs.species_name = $2'
      queryParams.push(species)
      queryText += ' ORDER BY fc.catch_time DESC LIMIT $3 OFFSET $4'
      queryParams.push(parseInt(limit), parseInt(offset))
    } else {
      queryText += ' ORDER BY fc.catch_time DESC LIMIT $2 OFFSET $3'
      queryParams.push(parseInt(limit), parseInt(offset))
    }

    const result = await query(queryText, queryParams)

    const catches = result.rows.map(row => ({
      id: row.id,
      species: row.species_name,
      length: parseFloat(row.fish_length),
      weight: parseFloat(row.fish_weight),
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      catchTime: row.catch_time,
      depth: row.depth_feet,
      lureType: row.lure_type,
      conditions: row.environmental_conditions,
      photoUrl: row.photo_url,
      locationNotes: row.location_notes,
      speciesConfig: {
        emoji: row.icon_emoji,
        color: row.map_color
      }
    }))

    res.json(catches)
  } catch (error) {
    console.error('Get catches error:', error)
    res.status(500).json({ error: 'Failed to retrieve catches' })
  }
})

// Log a new catch
router.post('/', async (req, res) => {
  const currentEnv = (process.env.NODE_ENV || '').trim();
  console.log('🎣 POST /api/catches - Environment:', currentEnv);
  console.log('🎣 Environment check:', { 
    raw: process.env.NODE_ENV,
    trimmed: currentEnv,
    isDevelopment: currentEnv === 'development',
    length: currentEnv.length
  });
  
  // Skip auth in development for testing
  let userId = null;
  if (req.user && req.user.userId) {
    console.log('🎣 Using authenticated user:', req.user.userId);
    userId = req.user.userId;
  } else if (currentEnv === 'development') {
    console.log('🎣 Development mode - creating/finding test user');
    // For development, create or use a test user
    try {
      const testUser = await query('SELECT id FROM users WHERE email = $1', ['test@fishing.com']);
      console.log('🎣 Test user query result:', testUser.rows.length);
      if (testUser.rows.length === 0) {
        console.log('🎣 Creating new test user');
        const newUser = await query(
          'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
          ['test@fishing.com', 'test_hash']
        );
        userId = newUser.rows[0].id;
        console.log('🎣 Created test user with ID:', userId);
      } else {
        userId = testUser.rows[0].id;
        console.log('🎣 Found existing test user with ID:', userId);
      }
    } catch (error) {
      console.error('🎣 Test user creation failed:', error);
      return res.status(500).json({ error: 'Database error in development mode' });
    }
  } else {
    console.log('🎣 Production mode - authentication required');
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const {
      species,
      length,
      weight,
      latitude,
      longitude,
      depth,
      lureType,
      catchTime,
      conditions,
      locationNotes,
      speciesSpecificAttributes,
      photoUrl
    } = req.body

    // Debug logging
    console.log('Catch POST request body:', JSON.stringify(req.body, null, 2))
    
    // Validate required fields
    if (!species || !length || !weight || !latitude || !longitude) {
      console.log('Validation failed:', { species, length, weight, latitude, longitude })
      return res.status(400).json({ 
        error: 'Required fields: species, length, weight, latitude, longitude',
        received: { species, length, weight, latitude, longitude }
      })
    }

    // Get species ID
    const speciesResult = await query(
      'SELECT id FROM fish_species WHERE species_name = $1',
      [species]
    )

    if (speciesResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid species' })
    }

    const speciesId = speciesResult.rows[0].id

    // Insert catch record
    const result = await query(
      `INSERT INTO fish_catches 
       (user_id, species_id, fish_length, fish_weight, latitude, longitude, 
        depth_feet, lure_type, catch_time, environmental_conditions, 
        location_notes, species_specific_attributes, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, catch_time`,
      [
        userId,
        speciesId,
        length,
        weight,
        latitude,
        longitude,
        depth || null,
        lureType || null,
        catchTime || new Date(),
        conditions ? JSON.stringify(conditions) : null,
        locationNotes || null,
        speciesSpecificAttributes ? JSON.stringify(speciesSpecificAttributes) : null,
        photoUrl || null
      ]
    )

    const newCatch = result.rows[0]

    // Log user activity
    await query(
      `INSERT INTO user_analytics (user_id, event_type, event_data)
       VALUES ($1, 'catch_logged', $2)`,
      [
        userId,
        JSON.stringify({
          species,
          length,
          weight,
          location: { latitude, longitude }
        })
      ]
    )

    res.status(201).json({
      id: newCatch.id,
      message: 'Catch logged successfully',
      catchTime: newCatch.catch_time
    })
  } catch (error) {
    console.error('Log catch error:', error)
    res.status(500).json({ error: 'Failed to log catch' })
  }
})

// Update a catch
router.put('/:catchId', async (req, res) => {
  // Skip auth in development for testing
  let userId = null;
  if (req.user && req.user.userId) {
    userId = req.user.userId;
  } else if (process.env.NODE_ENV === 'development') {
    // For development, use test user
    try {
      const testUser = await query('SELECT id FROM users WHERE email = $1', ['test@fishing.com']);
      if (testUser.rows.length > 0) {
        userId = testUser.rows[0].id;
      } else {
        return res.status(404).json({ error: 'No test user found' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Authentication required' });
    }
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const { catchId } = req.params
    const {
      length,
      weight,
      depth,
      lureType,
      locationNotes,
      speciesSpecificAttributes,
      photoUrl,
      catchTime
    } = req.body

    // Verify catch belongs to user
    const ownerCheck = await query(
      'SELECT id FROM fish_catches WHERE id = $1 AND user_id = $2',
      [catchId, userId]
    )

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Catch not found or access denied' })
    }

    // Update catch
    await query(
      `UPDATE fish_catches SET
       fish_length = COALESCE($1, fish_length),
       fish_weight = COALESCE($2, fish_weight),
       depth_feet = COALESCE($3, depth_feet),
       lure_type = COALESCE($4, lure_type),
       location_notes = COALESCE($5, location_notes),
       species_specific_attributes = COALESCE($6, species_specific_attributes),
       photo_url = COALESCE($7, photo_url),
       catch_time = COALESCE($8, catch_time),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $9`,
      [
        length,
        weight,
        depth,
        lureType,
        locationNotes,
        speciesSpecificAttributes ? JSON.stringify(speciesSpecificAttributes) : null,
        photoUrl,
        catchTime,
        catchId
      ]
    )

    res.json({ message: 'Catch updated successfully' })
  } catch (error) {
    console.error('Update catch error:', error)
    res.status(500).json({ error: 'Failed to update catch' })
  }
})

// Delete a catch
router.delete('/:catchId', async (req, res) => {
  // Skip auth in development for testing
  let userId = null;
  if (req.user && req.user.userId) {
    userId = req.user.userId;
  } else if (process.env.NODE_ENV === 'development') {
    // For development, use test user
    try {
      const testUser = await query('SELECT id FROM users WHERE email = $1', ['test@fishing.com']);
      if (testUser.rows.length > 0) {
        userId = testUser.rows[0].id;
      } else {
        return res.status(404).json({ error: 'No test user found' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Authentication required' });
    }
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const { catchId } = req.params

    const result = await query(
      'DELETE FROM fish_catches WHERE id = $1 AND user_id = $2 RETURNING id',
      [catchId, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Catch not found or access denied' })
    }

    res.json({ message: 'Catch deleted successfully' })
  } catch (error) {
    console.error('Delete catch error:', error)
    res.status(500).json({ error: 'Failed to delete catch' })
  }
})

// Get catch statistics for user
router.get('/stats', async (req, res) => {
  // Skip auth in development for testing
  let userId = null;
  if (req.user && req.user.userId) {
    userId = req.user.userId;
  } else if (process.env.NODE_ENV === 'development') {
    // For development, use test user
    try {
      const testUser = await query('SELECT id FROM users WHERE email = $1', ['test@fishing.com']);
      if (testUser.rows.length > 0) {
        userId = testUser.rows[0].id;
      } else {
        return res.status(404).json({ error: 'No test user found' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Authentication required' });
    }
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const statsQuery = `
      SELECT 
        fs.species_name,
        COUNT(*) as total_catches,
        AVG(fc.fish_length) as avg_length,
        AVG(fc.fish_weight) as avg_weight,
        MAX(fc.fish_length) as max_length,
        MAX(fc.fish_weight) as max_weight
      FROM fish_catches fc
      JOIN fish_species fs ON fc.species_id = fs.id
      WHERE fc.user_id = $1
      GROUP BY fs.species_name
      ORDER BY total_catches DESC
    `

    const result = await query(statsQuery, [userId])
    
    const stats = result.rows.map(row => ({
      species: row.species_name,
      totalCatches: parseInt(row.total_catches),
      avgLength: parseFloat(row.avg_length).toFixed(1),
      avgWeight: parseFloat(row.avg_weight).toFixed(1),
      maxLength: parseFloat(row.max_length),
      maxWeight: parseFloat(row.max_weight)
    }))

    res.json(stats)
  } catch (error) {
    console.error('Get stats error:', error)
    res.status(500).json({ error: 'Failed to retrieve statistics' })
  }
})

module.exports = router