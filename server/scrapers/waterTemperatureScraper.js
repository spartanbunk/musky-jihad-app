const axios = require('axios')
const cheerio = require('cheerio')

// Lake St. Clair Water Temperature Scraper for seatemperature.info
class WaterTemperatureScraper {
  constructor() {
    this.baseUrl = 'https://seatemperature.info'
    this.lakePage = '/lake-st-clair-water-temperature.html'
  }

  // Main method to get Lake St. Clair water temperature data
  async getLakeStClairTemperatures() {
    try {
      console.log('🌊 Scraping Lake St. Clair water temperatures from seatemperature.info...')
      
      const response = await axios.get(`${this.baseUrl}${this.lakePage}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })

      const $ = cheerio.load(response.data)
      
      // Parse the water temperature data
      const temperatureData = this.parseTemperatureData($)
      
      return {
        success: true,
        data: temperatureData,
        source: 'seatemperature.info',
        scrapedAt: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('❌ Water temperature scraping failed:', error.message)
      
      return {
        success: false,
        error: error.message,
        fallbackData: this.getFallbackTemperatures()
      }
    }
  }

  // Parse temperature data from the scraped HTML
  parseTemperatureData($) {
    const locations = []
    let warmestLocation = null
    let coldestLocation = null
    let averageTemp = null

    try {
      // PRIMARY METHOD: Look for the first <p> after "Lake St. Clair water temperature today"
      // This contains the actual current temperature data
      
      // Find the heading
      const heading = $('h1, h2, h3').filter((i, elem) => {
        const text = $(elem).text()
        return text.toLowerCase().includes('lake st. clair water temperature') || 
               text.toLowerCase().includes('lake st clair water temperature')
      }).first()
      
      if (heading.length > 0) {
        // Get the first <p> tag after the heading
        const firstParagraph = heading.nextAll('p').first()
        
        if (firstParagraph.length > 0) {
          const paragraphText = firstParagraph.text()
          console.log('Found first paragraph after heading:', paragraphText)
          
          // Parse warmest temperature from the paragraph
          // Pattern: "warmest water temperature...is XX.X°F (location)"
          const warmestMatch = paragraphText.match(/warmest.*?(?:is\s+)?(\d+(?:\.\d+)?)\s*°F.*?(?:\(|at\s+|in\s+)([\w\s']+?)(?:\)|,|and)/i)
          if (warmestMatch) {
            warmestLocation = {
              name: this.cleanLocationName(warmestMatch[2]),
              temperature: parseFloat(warmestMatch[1]),
              unit: 'F',
              type: 'warmest'
            }
            console.log('Parsed warmest location:', warmestLocation)
          }
          
          // Parse coldest temperature from the paragraph
          // Pattern: "coldest...is XX.X°F (location)"
          const coldestMatch = paragraphText.match(/coldest.*?(?:is\s+)?(\d+(?:\.\d+)?)\s*°F.*?(?:\(|at\s+|in\s+)([\w\s']+?)(?:\)|,|and|$)/i)
          if (coldestMatch) {
            coldestLocation = {
              name: this.cleanLocationName(coldestMatch[2]),
              temperature: parseFloat(coldestMatch[1]),
              unit: 'F',
              type: 'coldest'
            }
            console.log('Parsed coldest location:', coldestLocation)
          }
          
          // Also look for any other temperature mentions in the paragraph
          const tempMatches = paragraphText.matchAll(/(\d+(?:\.\d+)?)\s*°F/gi)
          for (const match of tempMatches) {
            const temp = parseFloat(match[1])
            if (temp > 40 && temp < 100) { // Reasonable water temperature range
              locations.push({
                name: 'Lake St. Clair',
                temperature: temp,
                unit: 'F'
              })
            }
          }
        }
      }
      
      // FALLBACK: If we didn't find the data in the first paragraph, search the whole page
      if (!warmestLocation || !coldestLocation) {
        const bodyText = $('body').text()
        
        // Parse warmest temperature
        if (!warmestLocation) {
          const warmestMatch = bodyText.match(/warmest.*?(\d+(?:\.\d+)?)°F.*?(?:at\s+|in\s+|\()([\w\s']+?)(?:\)|,|and)/i)
          if (warmestMatch) {
            warmestLocation = {
              name: this.cleanLocationName(warmestMatch[2]),
              temperature: parseFloat(warmestMatch[1]),
              unit: 'F',
              type: 'warmest'
            }
          }
        }

        // Parse coldest temperature  
        if (!coldestLocation) {
          const coldestMatch = bodyText.match(/coldest.*?(\d+(?:\.\d+)?)°F.*?(?:at\s+|in\s+|\()([\w\s']+?)(?:\)|,|and)/i)
          if (coldestMatch) {
            coldestLocation = {
              name: this.cleanLocationName(coldestMatch[2]),
              temperature: parseFloat(coldestMatch[1]),
              unit: 'F',
              type: 'coldest'
            }
          }
        }

        // Parse individual location temperatures
        const locationMatches = bodyText.matchAll(/(Mitchell's\s+Bay|Pearl\s+Beach|Algonac|Anchor\s+Bay|Mount\s+Clemens|Saint?\s+Clair\s+Shores|St\.\s+Clair\s+River|New\s+Baltimore|Marine\s+City)[:\s]*(\d+(?:\.\d+)?)°F/gi)
        
        for (const match of locationMatches) {
          locations.push({
            name: this.cleanLocationName(match[1]),
            temperature: parseFloat(match[2]),
            unit: 'F'
          })
        }
      }

      // Find warmest and coldest from locations if not already found
      if (locations.length > 0 && (!warmestLocation || !coldestLocation)) {
        const sortedTemps = [...locations].sort((a, b) => b.temperature - a.temperature)
        
        if (!warmestLocation) {
          warmestLocation = { ...sortedTemps[0], type: 'warmest' }
        }
        if (!coldestLocation) {
          coldestLocation = { ...sortedTemps[sortedTemps.length - 1], type: 'coldest' }
        }
      }

      // Calculate average if not found
      if (!averageTemp && locations.length > 0) {
        averageTemp = locations.reduce((sum, loc) => sum + loc.temperature, 0) / locations.length
        averageTemp = Math.round(averageTemp * 10) / 10 // Round to 1 decimal
      }

      return {
        locations: locations,
        warmest: warmestLocation,
        coldest: coldestLocation,
        average: averageTemp,
        totalLocations: locations.length,
        temperatureRange: warmestLocation && coldestLocation ? 
          warmestLocation.temperature - coldestLocation.temperature : null
      }

    } catch (error) {
      console.error('Error parsing temperature data:', error)
      return this.getFallbackTemperatures()
    }
  }

  // Extract location name from text
  extractLocationFromText(text) {
    const locationPatterns = [
      /Mitchell's\s+Bay/i,
      /Pearl\s+Beach/i,
      /Algonac/i,
      /Anchor\s+Bay/i,
      /Mount\s+Clemens/i,
      /Saint?\s+Clair\s+Shores/i,
      /St\.\s+Clair\s+River/i,
      /New\s+Baltimore/i,
      /Marine\s+City/i
    ]

    for (const pattern of locationPatterns) {
      const match = text.match(pattern)
      if (match) {
        return this.cleanLocationName(match[0])
      }
    }
    return null
  }

  // Extract temperature from text
  extractTemperatureFromText(text) {
    const tempMatch = text.match(/(\d+(?:\.\d+)?)°F/i)
    return tempMatch ? parseFloat(tempMatch[1]) : null
  }

  // Clean and standardize location names
  cleanLocationName(locationName) {
    return locationName
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/Saint\s+/i, 'St. ')
      .replace(/St\.\s+Clair\s+River/i, 'St. Clair River')
      .replace(/Mitchell's\s+Bay/i, "Mitchell's Bay")
      .replace(/Pearl\s+Beach/i, 'Pearl Beach')
      .replace(/Anchor\s+Bay/i, 'Anchor Bay')
      .replace(/Mount\s+Clemens/i, 'Mount Clemens')
      .replace(/New\s+Baltimore/i, 'New Baltimore')
      .replace(/Marine\s+City/i, 'Marine City')
  }

  // Fallback temperature data when scraping fails
  getFallbackTemperatures() {
    return {
      locations: [
        { name: "Mitchell's Bay", temperature: 78.5, unit: 'F' },
        { name: 'Pearl Beach', temperature: 75.0, unit: 'F' },
        { name: 'Algonac', temperature: 78.0, unit: 'F' },
        { name: 'Anchor Bay', temperature: 76.0, unit: 'F' },
        { name: 'Mount Clemens', temperature: 77.5, unit: 'F' },
        { name: 'St. Clair Shores', temperature: 77.0, unit: 'F' }
      ],
      warmest: { name: "Mitchell's Bay", temperature: 78.5, unit: 'F', type: 'warmest' },
      coldest: { name: 'Pearl Beach', temperature: 75.0, unit: 'F', type: 'coldest' },
      average: 76.8,
      totalLocations: 6,
      temperatureRange: 3.5,
      fallback: true
    }
  }

  // Get temperature recommendations for fishing
  getTemperatureRecommendations(temperatureData) {
    const { warmest, coldest, average } = temperatureData
    const recommendations = []

    // Musky fishing temperature preferences
    if (average >= 68 && average <= 78) {
      recommendations.push({
        species: 'musky',
        recommendation: 'Excellent temperature range for musky fishing',
        reason: 'Musky are most active in 68-78°F water temperatures'
      })
    }

    // Temperature-based location recommendations
    if (warmest && warmest.temperature > 75) {
      recommendations.push({
        location: warmest.name,
        recommendation: 'Best for warm-water species activity',
        temperature: warmest.temperature
      })
    }

    if (coldest && coldest.temperature < 70) {
      recommendations.push({
        location: coldest.name,  
        recommendation: 'May have less fish activity due to cooler water',
        temperature: coldest.temperature
      })
    }

    return recommendations
  }

  // Format temperature data for API response
  formatForAPI(temperatureData) {
    return {
      waterTemperatures: {
        warmest: temperatureData.warmest,
        coldest: temperatureData.coldest,
        average: temperatureData.average,
        locations: temperatureData.locations,
        temperatureRange: temperatureData.temperatureRange,
        totalLocations: temperatureData.totalLocations
      },
      fishingRecommendations: this.getTemperatureRecommendations(temperatureData),
      dataSource: 'seatemperature.info',
      lastUpdated: new Date().toISOString(),
      isFallbackData: temperatureData.fallback || false
    }
  }
}

module.exports = WaterTemperatureScraper