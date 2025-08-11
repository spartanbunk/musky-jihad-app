const axios = require('axios')

async function debugParser() {
  try {
    console.log('🔍 Fetching current daily fishing report...')
    const response = await axios.get('http://localhost:3011/api/weather/daily-fishing-report')
    const reportData = response.data
    
    console.log('\n📊 Report Metadata:')
    console.log('- Title:', reportData.title)
    console.log('- Source:', reportData.source)
    console.log('- Cache Status:', reportData.cacheStatus)
    console.log('- Content Length:', reportData.content.length, 'characters')
    
    console.log('\n📄 Full Report Content:')
    console.log('=' .repeat(80))
    console.log(reportData.content)
    console.log('=' .repeat(80))
    
    console.log('\n🐟 Analyzing species mentions in report...')
    const content = reportData.content.toLowerCase()
    const speciesList = [
      'musky', 'muskellunge', 'muskies',
      'bass', 'smallmouth bass', 'largemouth bass', 'smallmouth', 'largemouth',
      'walleye', 'walleyes',
      'perch', 'yellow perch',
      'crappie', 'crappies',
      'bluegill', 'bluegills', 'sunfish', 'panfish',
      'pike', 'northern pike',
      'salmon', 'trout'
    ]
    
    console.log('\nSpecies found in report:')
    speciesList.forEach(species => {
      if (content.includes(species)) {
        console.log(`✅ Found: "${species}"`)
      }
    })
    
    console.log('\n🧪 Testing parser patterns...')
    
    // Test the actual parsing function
    const parseSpeciesFromReport = (reportContent, targetSpecies) => {
      console.log(`\n--- Testing parsing for: ${targetSpecies} ---`)
      
      const speciesAliases = {
        musky: ['musky', 'muskellunge', 'esox masquinongy', 'muskies'],
        bass: ['bass', 'smallmouth bass', 'largemouth bass', 'micropterus', 'smallmouth', 'largemouth'],
        walleye: ['walleye', 'sander vitreus', 'walleyed pike', 'walleyes'],
        perch: ['perch', 'yellow perch', 'perca flavescens'],
        crappie: ['crappie', 'crappies', 'black crappie', 'white crappie'],
        bluegill: ['bluegill', 'bluegills', 'sunfish', 'panfish', 'bluegill/sunfish']
      }
      
      const aliases = speciesAliases[targetSpecies.toLowerCase()] || [targetSpecies.toLowerCase()]
      console.log('Trying aliases:', aliases)
      
      for (const alias of aliases) {
        console.log(`\nTesting alias: "${alias}"`)
        
        // Pattern 1: Look for "- Species name" followed by structured content
        const structuredPattern = new RegExp(`\\-\\s*${alias}[\\s\\S]*?(?=\\n\\s*\\-\\s*[A-Z]|\\n\\nCurrent conditions|\\n\\n-|$)`, 'gi')
        const structuredMatch = reportContent.match(structuredPattern)
        
        if (structuredMatch) {
          console.log('✅ Pattern 1 matched:', structuredMatch[0].substring(0, 100) + '...')
          let content = structuredMatch[0]
          content = content.replace(new RegExp(`^\\-\\s*${alias}\\s*`, 'i'), '').trim()
          if (content.length > 100) {
            console.log('✅ Substantial content found, returning:', content.substring(0, 200) + '...')
            return content
          }
        }
        
        // Pattern 2: Look for "**Species**" section
        const boldPattern = new RegExp(`\\*\\*${alias}\\*\\*[\\s\\S]*?(?=\\n\\s*\\*\\*|\\n\\nCurrent|\\n\\n-|$)`, 'gi')
        const boldMatch = reportContent.match(boldPattern)
        
        if (boldMatch) {
          console.log('✅ Pattern 2 matched:', boldMatch[0].substring(0, 100) + '...')
          let content = boldMatch[0]
          content = content.replace(new RegExp(`\\*\\*${alias}\\*\\*\\s*`, 'i'), '').trim()
          if (content.length > 100) {
            console.log('✅ Substantial content found, returning:', content.substring(0, 200) + '...')
            return content
          }
        }
        
        // Pattern 3: Look for species in paragraph format
        const paragraphPattern = new RegExp(`${alias}[^\\n]*\\n[\\s\\S]*?(?=\\n\\n|\\n\\s*\\-|\\n\\s*\\*\\*|$)`, 'gi')
        const paragraphMatch = reportContent.match(paragraphPattern)
        
        if (paragraphMatch) {
          console.log('✅ Pattern 3 matched:', paragraphMatch[0].substring(0, 100) + '...')
          let content = paragraphMatch[0].trim()
          if (content.length > 100) {
            console.log('✅ Substantial content found, returning:', content.substring(0, 200) + '...')
            return content
          }
        }
      }
      
      console.log('❌ No substantial content found for', targetSpecies)
      return null
    }
    
    // Test parsing for each target species
    const testSpecies = ['musky', 'bass', 'walleye', 'perch', 'crappie', 'bluegill']
    testSpecies.forEach(species => {
      const result = parseSpeciesFromReport(reportData.content, species)
      console.log(`\n🎯 Final result for ${species}:`)
      if (result) {
        console.log('✅ SUCCESS:', result.substring(0, 300) + '...')
      } else {
        console.log('❌ FAILED: Using fallback')
      }
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

debugParser()