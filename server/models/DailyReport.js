const { query, getClient } = require('../database/connection')

class DailyReport {
  /**
   * Get today's report from database
   * @returns {Object|null} Today's report or null if not found
   */
  static async getTodaysReport() {
    try {
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      
      const result = await query(
        `SELECT * FROM daily_fishing_reports 
         WHERE report_date = $1 
         ORDER BY generated_at DESC 
         LIMIT 1`,
        [today]
      )
      
      if (result.rows.length === 0) {
        console.log('📊 No report found for today:', today)
        return null
      }
      
      const report = result.rows[0]
      console.log(`📊 Retrieved today's report: ${report.cache_status} (${report.token_count} tokens)`)
      
      return {
        id: report.id,
        title: report.title,
        content: report.content,
        generatedAt: report.generated_at,
        validUntil: this.getNextDayAt1201AM(),
        cacheStatus: report.cache_status,
        location: report.location,
        source: report.source,
        tokenCount: report.token_count,
        generationDuration: report.generation_duration_ms
      }
      
    } catch (error) {
      console.error('❌ Error getting today\'s report:', error)
      return null
    }
  }

  /**
   * Create or update today's report
   * @param {Object} reportData - Report data to store
   * @returns {Object} Stored report object
   */
  static async createOrUpdateReport(reportData) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const client = await getClient()
      
      try {
        await client.query('BEGIN')
        
        // Check if report already exists for today
        const existing = await client.query(
          'SELECT id FROM daily_fishing_reports WHERE report_date = $1',
          [today]
        )
        
        let result
        if (existing.rows.length > 0) {
          // Update existing report
          result = await client.query(
            `UPDATE daily_fishing_reports 
             SET title = $2, content = $3, generated_at = CURRENT_TIMESTAMP, 
                 cache_status = $4, token_count = $5, generation_duration_ms = $6, 
                 updated_at = CURRENT_TIMESTAMP
             WHERE report_date = $1
             RETURNING *`,
            [
              today,
              reportData.title,
              reportData.content, 
              reportData.cacheStatus || 'fresh',
              reportData.tokenCount || 0,
              reportData.generationDuration || 0
            ]
          )
          console.log('📊 Updated existing daily report for:', today)
        } else {
          // Insert new report
          result = await client.query(
            `INSERT INTO daily_fishing_reports 
             (report_date, title, content, cache_status, token_count, generation_duration_ms)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
              today,
              reportData.title,
              reportData.content,
              reportData.cacheStatus || 'fresh', 
              reportData.tokenCount || 0,
              reportData.generationDuration || 0
            ]
          )
          console.log('📊 Created new daily report for:', today)
        }
        
        await client.query('COMMIT')
        
        const savedReport = result.rows[0]
        return {
          id: savedReport.id,
          title: savedReport.title,
          content: savedReport.content,
          generatedAt: savedReport.generated_at,
          validUntil: this.getNextDayAt1201AM(),
          cacheStatus: savedReport.cache_status,
          location: savedReport.location,
          source: savedReport.source,
          tokenCount: savedReport.token_count,
          generationDuration: savedReport.generation_duration_ms
        }
        
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
      
    } catch (error) {
      console.error('❌ Error creating/updating report:', error)
      throw error
    }
  }

  /**
   * Check if we need to generate a fresh report
   * @returns {boolean} True if report needs refresh
   */
  static async needsRefresh() {
    try {
      const todaysReport = await this.getTodaysReport()
      
      if (!todaysReport) {
        console.log('📊 No report exists - needs refresh')
        return true
      }
      
      // Check if report is from today and not too old
      const now = new Date()
      const generatedAt = new Date(todaysReport.generatedAt)
      const hoursSinceGeneration = (now - generatedAt) / (1000 * 60 * 60)
      
      if (hoursSinceGeneration > 24) {
        console.log(`📊 Report is ${hoursSinceGeneration.toFixed(1)} hours old - needs refresh`)
        return true
      }
      
      console.log(`📊 Report is ${hoursSinceGeneration.toFixed(1)} hours old - still fresh`)
      return false
      
    } catch (error) {
      console.error('❌ Error checking refresh status:', error)
      return true // Default to refresh on error
    }
  }

  /**
   * Get timestamp for tomorrow at 12:01 AM
   * @returns {string} ISO timestamp for next refresh
   */
  static getNextDayAt1201AM() {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 1, 0, 0) // 12:01 AM
    return tomorrow.toISOString()
  }

  /**
   * Clean up old reports (keep last 7 days)
   * @returns {number} Number of reports deleted
   */
  static async cleanupOldReports() {
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const cutoffDate = sevenDaysAgo.toISOString().split('T')[0]
      
      const result = await query(
        'DELETE FROM daily_fishing_reports WHERE report_date < $1',
        [cutoffDate]
      )
      
      console.log(`🗑️ Cleaned up ${result.rowCount} old fishing reports`)
      return result.rowCount
      
    } catch (error) {
      console.error('❌ Error cleaning up old reports:', error)
      return 0
    }
  }

  /**
   * Get statistics about report generation
   * @returns {Object} Stats object
   */
  static async getStats() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_reports,
          AVG(token_count) as avg_tokens,
          AVG(generation_duration_ms) as avg_duration_ms,
          MAX(generated_at) as latest_report,
          SUM(token_count) as total_tokens_used
        FROM daily_fishing_reports 
        WHERE generated_at >= CURRENT_DATE - INTERVAL '30 days'
      `)
      
      const stats = result.rows[0]
      return {
        totalReports: parseInt(stats.total_reports),
        avgTokens: Math.round(stats.avg_tokens || 0),
        avgDurationMs: Math.round(stats.avg_duration_ms || 0),
        latestReport: stats.latest_report,
        totalTokensUsed: parseInt(stats.total_tokens_used || 0)
      }
      
    } catch (error) {
      console.error('❌ Error getting report stats:', error)
      return {
        totalReports: 0,
        avgTokens: 0, 
        avgDurationMs: 0,
        latestReport: null,
        totalTokensUsed: 0
      }
    }
  }
}

module.exports = DailyReport