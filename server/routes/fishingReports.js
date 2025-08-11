const express = require('express')
const router = express.Router()
const FishingReportScraper = require('../scrapers/fishingReportScraper')

// Get daily fishing report (cached for 24 hours)
router.get('/fishing-reports', async (req, res) => {
  try {
    console.log('📡 API: Fetching daily fishing report...')
    
    // Call the weather endpoint that has the daily report
    const response = await fetch('http://localhost:3011/api/weather/daily-fishing-report')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const reportData = await response.json()
    
    console.log(`✅ API: Daily fishing report retrieved (${reportData.cacheStatus})`)
    
    res.json({
      success: reportData.success !== false,
      fishingReport: {
        title: reportData.title,
        content: reportData.content,
        generatedAt: reportData.generatedAt,
        validUntil: reportData.validUntil,
        cacheStatus: reportData.cacheStatus
      },
      dataSource: reportData.source,
      location: reportData.location,
      lastUpdated: reportData.generatedAt,
      isLiveData: reportData.success !== false,
      isCacheData: reportData.cacheStatus === 'fresh',
      message: reportData.success !== false ? 
        'Daily fishing report retrieved successfully' : 
        'Using fallback fishing report'
    })
    
  } catch (error) {
    console.error('❌ API Error fetching daily fishing report:', error)
    
    // Return error - no hardcoded fallbacks for dynamic content
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch daily fishing report. Please try again later.'
    })
  }
})

// Get a specific fishing report by ID
router.get('/fishing-reports/:id', async (req, res) => {
  try {
    const reportId = req.params.id
    
    // Get all reports and find the specific one
    const reportScraper = new FishingReportScraper()
    const scrapingResult = await reportScraper.getStClairShoresReports()
    const reports = scrapingResult.data || scrapingResult.fallbackData || []
    
    const specificReport = reports.find(report => report.id === reportId)
    
    if (!specificReport) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
        message: `No fishing report found with ID: ${reportId}`
      })
    }
    
    res.json({
      success: true,
      report: specificReport,
      message: 'Fishing report retrieved successfully'
    })
    
  } catch (error) {
    console.error('❌ API Error fetching specific report:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch fishing report'
    })
  }
})

module.exports = router