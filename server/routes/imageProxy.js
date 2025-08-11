const express = require('express')
const axios = require('axios')
const router = express.Router()

// Image proxy to handle external images and avoid CORS issues
router.get('/image-proxy', async (req, res) => {
  try {
    const imageUrl = req.query.url
    
    if (!imageUrl) {
      return res.status(400).json({
        error: 'Missing image URL parameter'
      })
    }
    
    // Validate URL format
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      return res.status(400).json({
        error: 'Invalid image URL format'
      })
    }
    
    console.log('🖼️ Proxying image:', imageUrl)
    
    // Fetch the image
    const response = await axios.get(imageUrl, {
      timeout: 10000,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://fishingbooker.com/',
        'Origin': 'https://fishingbooker.com'
      }
    })
    
    // Set appropriate headers
    res.set({
      'Content-Type': response.headers['content-type'] || 'image/jpeg',
      'Content-Length': response.headers['content-length'],
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    })
    
    // Pipe the image data to the response
    response.data.pipe(res)
    
  } catch (error) {
    console.error('❌ Image proxy error:', error.message)
    
    // Return a placeholder image or error response
    if (error.response && error.response.status === 404) {
      res.status(404).json({
        error: 'Image not found',
        message: 'The requested image could not be found'
      })
    } else {
      res.status(500).json({
        error: 'Failed to fetch image',
        message: 'Unable to proxy the requested image'
      })
    }
  }
})

// Health check for image proxy
router.get('/image-proxy/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'image-proxy',
    timestamp: new Date().toISOString()
  })
})

module.exports = router