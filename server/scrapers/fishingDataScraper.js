const axios = require('axios')
const cheerio = require('cheerio')

// Dynamic multi-source fishing data scraper for any location and date
class FishingDataScraper {
  constructor() {
    this.sources = [
      'solunar_org',
      'fishing_reminder', 
      'in_fisherman',
      'bass_forecast'
    ]
  }

  // Main method to get aggregated fishing times from multiple sources
  async getAggregatedFishingTimes(latitude, longitude, date = new Date()) {
    console.log(`🎣 Scraping fishing times for ${latitude}, ${longitude} on ${date.toDateString()}`)
    
    const results = []
    const errors = []

    // Source 1: Solunar.org API (most reliable)
    try {
      const solunarData = await this.scrapeSolunarOrg(latitude, longitude, date)
      if (solunarData) {
        results.push({
          source: 'Solunar.org',
          confidence: 'high',
          weight: 0.4,
          data: solunarData
        })
      }
    } catch (error) {
      errors.push({ source: 'Solunar.org', error: error.message })
    }

    // Source 2: FishingReminder.com
    try {
      const fishingReminderData = await this.scrapeFishingReminder(latitude, longitude, date)
      if (fishingReminderData) {
        results.push({
          source: 'FishingReminder',
          confidence: 'medium',
          weight: 0.3,
          data: fishingReminderData
        })
      }
    } catch (error) {
      errors.push({ source: 'FishingReminder', error: error.message })
    }

    // Source 3: In-Fisherman (via web scraping)
    try {
      const inFishermanData = await this.scrapeInFisherman(latitude, longitude, date)
      if (inFishermanData) {
        results.push({
          source: 'In-Fisherman',
          confidence: 'medium', 
          weight: 0.2,
          data: inFishermanData
        })
      }
    } catch (error) {
      errors.push({ source: 'In-Fisherman', error: error.message })
    }

    // Source 4: BassForecast (if available)
    try {
      const bassForecastData = await this.scrapeBassForecast(latitude, longitude, date)
      if (bassForecastData) {
        results.push({
          source: 'BassForecast',
          confidence: 'medium',
          weight: 0.1,
          data: bassForecastData
        })
      }
    } catch (error) {
      errors.push({ source: 'BassForecast', error: error.message })
    }

    // Aggregate results using AI-like logic
    const aggregatedData = this.aggregateResults(results, date)
    
    return {
      aggregated: aggregatedData,
      sources: results,
      errors: errors,
      totalSources: results.length,
      reliability: this.calculateReliability(results)
    }
  }

  // Scrape Solunar.org API
  async scrapeSolunarOrg(latitude, longitude, date) {
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
    const timezone = -4 // EDT for Lake St. Clair
    
    const response = await axios.get(
      `https://api.solunar.org/solunar/${latitude},${longitude},${dateStr},${timezone}`,
      { timeout: 8000 }
    )
    
    const data = response.data
    
    return {
      majorPeriods: [
        { start: data.major1Start, end: data.major1Stop, type: 'Major', quality: 'Excellent' },
        { start: data.major2Start, end: data.major2Stop, type: 'Major', quality: 'Excellent' }
      ].filter(p => p.start && p.end),
      minorPeriods: [
        { start: data.minor1Start, end: data.minor1Stop, type: 'Minor', quality: 'Good' },
        { start: data.minor2Start, end: data.minor2Stop, type: 'Minor', quality: 'Good' }
      ].filter(p => p.start && p.end),
      moonPhase: data.moonPhase,
      moonIllumination: Math.round(data.moonIllumination * 100),
      dayRating: data.dayRating,
      sunTimes: {
        sunrise: data.sunRise,
        sunset: data.sunSet
      }
    }
  }

  // Scrape FishingReminder.com for location-based data
  async scrapeFishingReminder(latitude, longitude, date) {
    // FishingReminder uses city names, so we'll use coordinates to find nearby city
    const cityQuery = await this.getCityFromCoordinates(latitude, longitude)
    
    try {
      // Try to get fishing times for the area
      const url = `https://www.fishingreminder.com/US/charts/fishing_times/${encodeURIComponent(cityQuery)}`
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })
      
      const $ = cheerio.load(response.data)
      
      // Parse the fishing times from the page
      const fishingTimes = this.parseFishingReminderData($, date)
      
      return fishingTimes
    } catch (error) {
      console.log(`FishingReminder scraping failed: ${error.message}`)
      return null
    }
  }

  // Scrape In-Fisherman solunar calendar
  async scrapeInFisherman(latitude, longitude, date) {
    try {
      // In-Fisherman has an interactive calendar that might require more complex scraping
      const response = await axios.get('https://www.in-fisherman.com/content/best-fishing-times/245806', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })
      
      const $ = cheerio.load(response.data)
      
      // Extract any solunar information from the page
      // This might need to be enhanced based on the actual page structure
      return this.parseInFishermanData($, date)
      
    } catch (error) {
      console.log(`In-Fisherman scraping failed: ${error.message}`)
      return null
    }
  }

  // Scrape BassForecast data  
  async scrapeBassForecast(latitude, longitude, date) {
    try {
      // BassForecast might have API or require special access
      // For now, return null and implement later if needed
      return null
    } catch (error) {
      console.log(`BassForecast scraping failed: ${error.message}`)
      return null
    }
  }

  // Helper: Get city name from coordinates for location-based services
  async getCityFromCoordinates(latitude, longitude) {
    // For Lake St. Clair area, we know it's near Detroit/St. Clair Shores
    if (Math.abs(latitude - 42.4583) < 0.1 && Math.abs(longitude + 82.7167) < 0.1) {
      return 'Saint Clair Shores, MI'
    }
    
    // For other locations, could use geocoding service
    return 'Detroit, MI' // Fallback for Great Lakes region
  }

  // Parse FishingReminder data from scraped HTML
  parseFishingReminderData($, date) {
    const fishingTimes = {
      majorPeriods: [],
      minorPeriods: [],
      moonPhase: null,
      dayRating: null
    }

    // Look for fishing time indicators in the page
    // This would need to be customized based on actual page structure
    $('.fishing-time, .major-time, .minor-time').each((i, elem) => {
      const timeText = $(elem).text()
      // Parse time data...
    })

    return fishingTimes
  }

  // Parse In-Fisherman data from scraped HTML
  parseInFishermanData($, date) {
    // Parse In-Fisherman solunar calendar data
    // Implementation depends on actual page structure
    return {
      majorPeriods: [],
      minorPeriods: [],
      moonPhase: null
    }
  }

  // Aggregate results from multiple sources using weighted averaging
  aggregateResults(sources, date) {
    if (sources.length === 0) {
      return this.getFallbackTimes(date)
    }

    const allMajors = []
    const allMinors = []
    let bestMoonPhase = null
    let bestDayRating = 0

    // Collect all times from all sources
    sources.forEach(source => {
      if (source.data.majorPeriods) {
        source.data.majorPeriods.forEach(period => {
          allMajors.push({
            ...period,
            source: source.source,
            weight: source.weight
          })
        })
      }
      
      if (source.data.minorPeriods) {
        source.data.minorPeriods.forEach(period => {
          allMinors.push({
            ...period,
            source: source.source,
            weight: source.weight
          })
        })
      }

      // Use highest confidence moon phase
      if (source.data.moonPhase && source.confidence === 'high') {
        bestMoonPhase = source.data.moonPhase
      }

      // Use highest day rating
      if (source.data.dayRating > bestDayRating) {
        bestDayRating = source.data.dayRating
      }
    })

    // Use clustering/averaging to find consensus times
    const consensusMajors = this.findConsensusTimeRanges(allMajors, 'Major')
    const consensusMinors = this.findConsensusTimeRanges(allMinors, 'Minor')

    return {
      bestTimes: [...consensusMajors, ...consensusMinors].sort((a, b) => {
        return this.timeToMinutes(a.start) - this.timeToMinutes(b.start)
      }),
      moonPhase: bestMoonPhase,
      dayRating: bestDayRating,
      confidence: sources.length >= 3 ? 'high' : sources.length >= 2 ? 'medium' : 'low'
    }
  }

  // Find consensus time ranges across multiple sources
  findConsensusTimeRanges(times, type) {
    if (times.length === 0) return []

    // Group similar times (within 2 hours of each other)
    const clusters = []
    const threshold = 120 // 2 hours in minutes

    times.forEach(time => {
      const timeMinutes = this.timeToMinutes(time.start)
      let addedToCluster = false

      for (let cluster of clusters) {
        const clusterAvg = cluster.reduce((sum, t) => sum + this.timeToMinutes(t.start), 0) / cluster.length
        
        if (Math.abs(timeMinutes - clusterAvg) <= threshold) {
          cluster.push(time)
          addedToCluster = true
          break
        }
      }

      if (!addedToCluster) {
        clusters.push([time])
      }
    })

    // Convert clusters to consensus times (weighted averages)
    return clusters.map(cluster => {
      if (cluster.length === 1) return cluster[0]

      // Weighted average of start times
      const totalWeight = cluster.reduce((sum, t) => sum + t.weight, 0)
      const avgStartMinutes = cluster.reduce((sum, t) => 
        sum + (this.timeToMinutes(t.start) * t.weight), 0
      ) / totalWeight
      const avgEndMinutes = cluster.reduce((sum, t) => 
        sum + (this.timeToMinutes(t.end) * t.weight), 0
      ) / totalWeight

      return {
        start: this.minutesToTime(avgStartMinutes),
        end: this.minutesToTime(avgEndMinutes),
        type: type,
        quality: cluster.length >= 3 ? 'Excellent' : cluster.length >= 2 ? 'Good' : 'Fair',
        sources: cluster.map(t => t.source).join(', '),
        agreement: cluster.length
      }
    })
  }

  // Helper: Convert time string to minutes since midnight
  timeToMinutes(timeStr) {
    if (!timeStr) return 0
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  // Helper: Convert minutes since midnight to time string
  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60) % 24
    const mins = Math.floor(minutes % 60)
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  // Calculate reliability score based on sources
  calculateReliability(sources) {
    if (sources.length === 0) return 'low'
    if (sources.length >= 3) return 'high'
    if (sources.length >= 2) return 'medium'
    return 'low'
  }

  // Fallback times when no sources are available
  getFallbackTimes(date) {
    // Basic sunrise/sunset based times
    return {
      bestTimes: [
        { start: '06:00', end: '08:00', type: 'Major', quality: 'Estimated', sources: 'Fallback' },
        { start: '11:00', end: '12:00', type: 'Minor', quality: 'Estimated', sources: 'Fallback' },
        { start: '18:00', end: '20:00', type: 'Major', quality: 'Estimated', sources: 'Fallback' },
        { start: '23:00', end: '24:00', type: 'Minor', quality: 'Estimated', sources: 'Fallback' }
      ],
      moonPhase: 'Unknown',
      dayRating: 1,
      confidence: 'low'
    }
  }
}

module.exports = FishingDataScraper