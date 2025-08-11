const cron = require('node-cron')
const axios = require('axios')
const DailyReport = require('../models/DailyReport')

class ReportScheduler {
  static isRunning = false

  /**
   * Start the daily report scheduler
   * Runs at 12:01 AM every day to generate fresh fishing reports
   */
  static startScheduler() {
    if (this.isRunning) {
      console.log('📅 Report scheduler is already running')
      return
    }

    // Schedule for 12:01 AM every day (1 minute after midnight)
    // Cron format: minute hour day month day-of-week
    cron.schedule('1 0 * * *', async () => {
      console.log('🌙 Starting scheduled daily fishing report generation...')
      await this.generateDailyReport()
    }, {
      timezone: "America/New_York" // Eastern Time for Lake St. Clair
    })

    this.isRunning = true
    console.log('📅 Daily fishing report scheduler started - will run at 12:01 AM ET')
  }

  /**
   * Generate and store daily fishing report
   * Called by cron scheduler and available for manual triggers
   */
  static async generateDailyReport() {
    const startTime = Date.now()
    console.log('🎣 Generating daily fishing report...')

    try {
      // Check if we already have today's report
      const existingReport = await DailyReport.getTodaysReport()
      if (existingReport && !await DailyReport.needsRefresh()) {
        console.log('📊 Today\'s report already exists and is fresh')
        return existingReport
      }

      // Generate new report using Perplexity API
      const reportData = await this.fetchFreshReport()
      
      // Calculate generation time
      const generationDuration = Date.now() - startTime
      reportData.generationDuration = generationDuration

      // Save to database
      const savedReport = await DailyReport.createOrUpdateReport(reportData)

      // Cleanup old reports (keep last 7 days)
      await DailyReport.cleanupOldReports()

      console.log(`✅ Daily fishing report generated successfully in ${generationDuration}ms`)
      console.log(`📊 Token usage: ${reportData.tokenCount} tokens`)
      
      return savedReport

    } catch (error) {
      console.error('❌ Failed to generate daily fishing report:', error)
      
      // If generation fails, try to return existing report as fallback
      try {
        const fallbackReport = await DailyReport.getTodaysReport()
        if (fallbackReport) {
          console.log('📊 Returning existing report as fallback')
          return fallbackReport
        }
      } catch (fallbackError) {
        console.error('❌ Fallback report retrieval failed:', fallbackError)
      }

      throw error
    }
  }

  /**
   * Fetch fresh fishing report from Perplexity API
   * @returns {Object} Report data with title, content, and metadata
   */
  static async fetchFreshReport() {
    const startTime = Date.now()
    
    try {
      console.log('🔍 Calling Perplexity API directly for fresh fishing report...')
      
      if (!process.env.PERPLEXITY_API_KEY) {
        throw new Error('Perplexity API key not configured')
      }

      const query = `What are the current fishing conditions on Lake St. Clair Michigan today? Include recent reports for bass, walleye, musky, perch, crappie, and bluegill. Mention specific locations, depths, techniques, and hot baits currently working.`

      const response = await axios.post('https://api.perplexity.ai/chat/completions', {
        model: 'sonar-pro',
        messages: [
          {
            role: "system",
            content: "You are writing a daily fishing report for Lake St. Clair, Michigan. Search for the most current fishing information and create a comprehensive report covering all major fish species. Include specific locations, depths, techniques, and current conditions. Write as one flowing professional report."
          },
          {
            role: "user", 
            content: query
          }
        ],
        max_tokens: 1200,
        temperature: 0.2,
        stream: false
      }, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      const reportContent = response.data.choices[0].message.content
      const generationTime = Date.now() - startTime

      // Create title
      const title = `Daily Fishing Report - ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`

      // Estimate token count (rough approximation: 1 token ≈ 4 characters)
      const estimatedTokens = Math.ceil((query + reportContent).length / 4)

      return {
        title: title,
        content: reportContent,
        cacheStatus: 'fresh',
        tokenCount: estimatedTokens,
        generationDuration: generationTime
      }

    } catch (error) {
      console.error('❌ Perplexity API call failed:', error.message)
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to Perplexity API - server may be down')
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('Perplexity API request timed out after 30 seconds')
      } else {
        throw new Error(`Perplexity API error: ${error.message}`)
      }
    }
  }

  /**
   * Manual trigger for report generation (for testing/emergency use)
   * @returns {Object} Generated report
   */
  static async manualGeneration() {
    console.log('🔧 Manual report generation triggered')
    return await this.generateDailyReport()
  }

  /**
   * Stop the scheduler (for testing/shutdown)
   */
  static stopScheduler() {
    if (this.isRunning) {
      // Note: node-cron doesn't provide a direct way to stop specific tasks
      // This is mainly for status tracking
      this.isRunning = false
      console.log('📅 Report scheduler stopped')
    }
  }

  /**
   * Get scheduler status and statistics
   * @returns {Object} Status information
   */
  static async getStatus() {
    try {
      const stats = await DailyReport.getStats()
      const todaysReport = await DailyReport.getTodaysReport()
      
      return {
        schedulerRunning: this.isRunning,
        nextRun: '12:01 AM ET (daily)',
        todaysReportExists: !!todaysReport,
        todaysReportTime: todaysReport?.generatedAt,
        stats: stats
      }
    } catch (error) {
      console.error('❌ Error getting scheduler status:', error)
      return {
        schedulerRunning: this.isRunning,
        nextRun: '12:01 AM ET (daily)',
        error: error.message
      }
    }
  }
}

module.exports = ReportScheduler