const axios = require('axios')

// Fishing Report Generator using Perplexity API
class FishingReportScraper {
  constructor() {
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY
    this.perplexityUrl = 'https://api.perplexity.ai/chat/completions'
  }

  // Main method to get St. Clair Shores fishing reports using Perplexity
  async getStClairShoresReports() {
    try {
      console.log('🎣 Fetching latest fishing reports using Perplexity...')
      
      // Call our weather endpoint that has Perplexity configured
      const response = await axios.get('http://localhost:3011/api/weather/fishing-reports-perplexity', {
        timeout: 20000
      })

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch from Perplexity endpoint')
      }

      console.log('✅ Perplexity response received')
      
      // Parse the Perplexity response into structured reports
      const reports = this.parsePerplexityResponse(response.data.rawResponse)
      
      return {
        success: true,
        data: reports,
        source: 'perplexity.ai',
        location: 'St. Clair Shores, MI',
        scrapedAt: new Date().toISOString(),
        totalReports: reports.length
      }
      
    } catch (error) {
      console.error('❌ Perplexity fishing reports failed:', error.message)
      
      return {
        success: false,
        error: error.message,
        fallbackData: this.getFallbackReports()
      }
    }
  }

  // Parse Perplexity response into structured fishing reports
  parsePerplexityResponse(content) {
    try {
      console.log('🔍 Parsing Perplexity response for fishing reports...')
      
      const reports = []
      let reportIndex = 0

      // Split content into potential report sections
      const sections = content.split(/(?:\n\s*\n|\*\*|\d+\.|Report \d+|###|##)/i)
        .filter(section => section.trim().length > 50)

      for (const section of sections) {
        if (reportIndex >= 4) break // Limit to 4 reports
        
        const report = this.extractReportFromText(section.trim(), reportIndex)
        if (report && this.isValidReport(report)) {
          reports.push(report)
          reportIndex++
        }
      }

      // If we didn't get enough structured reports, create some from the full content
      if (reports.length < 2) {
        const basicReports = this.createReportsFromContent(content)
        reports.push(...basicReports.slice(0, 4 - reports.length))
      }

      console.log(`✅ Parsed ${reports.length} fishing reports from Perplexity`)
      return reports
      
    } catch (error) {
      console.error('Error parsing Perplexity response:', error)
      return this.getFallbackReports()
    }
  }

  // Extract fishing report from text content
  extractReportFromText(text, index) {
    try {
      const report = {
        id: `perplexity-${index}-${Date.now()}`,
        source: 'Perplexity AI',
        location: 'St. Clair Shores, MI'
      }

      // Extract title (first line or sentence)
      const lines = text.split('\n').filter(line => line.trim().length > 0)
      const firstLine = lines[0] || ''
      
      // Look for patterns that indicate a title/header
      let title = ''
      if (firstLine.includes(':')) {
        title = firstLine.split(':')[0].trim()
      } else if (firstLine.length < 100) {
        title = firstLine.trim()
      } else {
        // Extract first sentence as title
        const firstSentence = text.split(/[.!?]/)[0]
        title = firstSentence.substring(0, 80).trim() + (firstSentence.length > 80 ? '...' : '')
      }
      
      report.title = this.cleanText(title) || `Fishing Report ${index + 1}`

      // Extract description (main content)
      let description = text
      if (text.includes(':')) {
        description = text.split(':').slice(1).join(':').trim()
      }
      
      report.description = this.cleanText(description).substring(0, 300) + (description.length > 300 ? '...' : '')

      // Extract author/angler name
      const authorMatches = text.match(/(?:by|from|angler|captain|charter)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i)
      if (authorMatches) {
        report.author = authorMatches[1].trim()
      } else {
        // Look for names in quotes or common angler patterns
        const nameMatches = text.match(/"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)"|([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s+(?:caught|landed|reported))/i)
        if (nameMatches) {
          report.author = (nameMatches[1] || nameMatches[2]).trim()
        } else {
          report.author = 'Local Angler'
        }
      }

      // Extract or generate date
      const dateMatches = text.match(/(?:today|yesterday|\w+day|\d{1,2}\/\d{1,2}|\w+\s+\d{1,2})/i)
      if (dateMatches) {
        report.date = this.parseDate(dateMatches[0])
      } else {
        // Default to recent dates
        const daysAgo = Math.floor(Math.random() * 3) // 0-2 days ago
        const date = new Date()
        date.setDate(date.getDate() - daysAgo)
        report.date = date.toISOString().split('T')[0]
      }

      // Add image placeholder (since we don't have real images from Perplexity)
      report.imageUrl = null
      report.imageAlt = `Fishing report for ${report.title}`

      report.scrapedAt = new Date().toISOString()
      return report
      
    } catch (error) {
      console.error(`Error extracting report from text for index ${index}:`, error)
      return null
    }
  }


  // Validate if a report has minimum required data
  isValidReport(report) {
    return report && 
           (report.imageUrl || report.title) && 
           (report.title && report.title.length > 3) &&
           (report.description && report.description.length > 10)
  }

  // Create basic reports from unstructured content
  createReportsFromContent(content) {
    try {
      const reports = []
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30)
      
      // Look for fishing-related sentences
      const fishingSentences = sentences.filter(sentence => {
        const lower = sentence.toLowerCase()
        return lower.includes('fish') || lower.includes('catch') || lower.includes('angler') || 
               lower.includes('musky') || lower.includes('walleye') || lower.includes('bass') ||
               lower.includes('lake st') || lower.includes('charter')
      })

      // Create reports from fishing sentences
      for (let i = 0; i < Math.min(3, fishingSentences.length); i++) {
        const sentence = fishingSentences[i].trim()
        if (sentence.length > 20) {
          reports.push({
            id: `perplexity-basic-${i}-${Date.now()}`,
            title: `Recent Fishing Activity ${i + 1}`,
            description: sentence.substring(0, 250) + (sentence.length > 250 ? '...' : ''),
            author: 'Local Report',
            date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0], // Spread over days
            source: 'Perplexity AI',
            location: 'St. Clair Shores, MI',
            imageUrl: null,
            scrapedAt: new Date().toISOString()
          })
        }
      }

      return reports
      
    } catch (error) {
      console.error('Error creating reports from content:', error)
      return []
    }
  }

  // Clean text content
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .replace(/\t+/g, ' ')
      .trim()
  }

  // Parse date from text
  parseDate(dateText) {
    try {
      const date = new Date(dateText)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0] // Return YYYY-MM-DD format
      }
    } catch (error) {
      // Ignore date parsing errors
    }
    return new Date().toISOString().split('T')[0] // Default to today
  }

  // Fallback reports when scraping fails
  getFallbackReports() {
    return [
      {
        id: 'fallback-1',
        title: 'Great Musky Action on Lake St. Clair',
        description: 'Had an excellent day targeting musky in the Canadian waters. Water temp was perfect at 72°F with light winds. Caught 3 fish including a 42" beauty on a large bucktail.',
        imageUrl: null,
        author: 'Local Angler',
        date: new Date().toISOString().split('T')[0],
        source: 'Local Report',
        location: 'St. Clair Shores, MI',
        fallback: true
      },
      {
        id: 'fallback-2', 
        title: 'Walleye Fishing Report - North Channel',
        description: 'Trolled the north channel early morning with great success. Water was clear and fish were active. Best depth was 18-22 feet using crawler harnesses.',
        imageUrl: null,
        author: 'Charter Captain',
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
        source: 'Local Report',
        location: 'St. Clair Shores, MI',
        fallback: true
      },
      {
        id: 'fallback-3',
        title: 'Bass Fishing Update - Shallow Flats',
        description: 'Smallmouth bass are hitting topwater baits in the early morning hours. Focus on rocky areas in 6-12 feet of water. Several fish in the 3-4 lb range reported.',
        imageUrl: null,
        author: 'Tournament Angler',
        date: new Date(Date.now() - 172800000).toISOString().split('T')[0], // 2 days ago
        source: 'Local Report', 
        location: 'St. Clair Shores, MI',
        fallback: true
      }
    ]
  }

  // Format reports for API response
  formatForAPI(reportData) {
    return {
      fishingReports: reportData.data || reportData.fallbackData || [],
      dataSource: reportData.source || 'fishingbooker.com',
      location: reportData.location || 'St. Clair Shores, MI',
      totalReports: reportData.totalReports || 0,
      lastUpdated: reportData.scrapedAt || new Date().toISOString(),
      isLiveData: reportData.success || false,
      isFallbackData: !reportData.success || false
    }
  }
}

module.exports = FishingReportScraper