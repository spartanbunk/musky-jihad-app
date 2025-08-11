const axios = require('axios')

async function quickDebug() {
  try {
    const response = await axios.get('http://localhost:3011/api/weather/daily-fishing-report')
    const reportData = response.data
    
    // Test Musky parsing
    const parseSpeciesFromReport = (reportContent, targetSpecies) => {
      const speciesAliases = {
        musky: ['musky', 'muskellunge', 'esox masquinongy', 'muskies'],
        bass: ['smallmouth bass', 'bass', 'largemouth bass', 'micropterus', 'smallmouth', 'largemouth'],
      }
      
      const aliases = speciesAliases[targetSpecies.toLowerCase()] || [targetSpecies.toLowerCase()]
      
      for (const alias of aliases) {
        const structuredPattern = new RegExp(`^-\\s*${alias}\\s*\\n([\\s\\S]*?)(?=\\n-\\s*[A-Z]|\\nCurrent\\s+conditions|$)`, 'gim')
        const structuredMatch = reportContent.match(structuredPattern)
        
        if (structuredMatch && structuredMatch[0]) {
          let content = structuredMatch[0]
          content = content.replace(new RegExp(`^-\\s*${alias}\\s*\\n`, 'im'), '').trim()
          
          if (content.length > 50 && (content.includes('Locations:') || content.includes('Depths:') || content.includes('- '))) {
            console.log(`\n🎯 EXTRACTED CONTENT FOR ${alias.toUpperCase()}:`)
            console.log('=' .repeat(60))
            console.log(content)
            console.log('=' .repeat(60))
            console.log('Content length:', content.length)
            console.log('Has Depths:', content.includes('Depths:'))
            console.log('Has Techniques:', content.includes('Techniques/baits:'))
            return content
          }
        }
      }
      return null
    }
    
    const muskyResult = parseSpeciesFromReport(reportData.content, 'musky')
    const bassResult = parseSpeciesFromReport(reportData.content, 'bass')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

quickDebug()