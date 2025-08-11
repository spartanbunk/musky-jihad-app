const axios = require('axios')

async function testFixedParser() {
  try {
    console.log('🔍 Testing FIXED parser patterns...')
    const response = await axios.get('http://localhost:3011/api/weather/daily-fishing-report')
    const reportData = response.data
    
    // CORRECTED parsing function
    const parseSpeciesFromReport = (reportContent, targetSpecies) => {
      const speciesAliases = {
        musky: ['musky', 'muskellunge', 'esox masquinongy', 'muskies'],
        bass: ['smallmouth bass', 'bass', 'largemouth bass', 'micropterus', 'smallmouth', 'largemouth'],
        walleye: ['walleye', 'sander vitreus', 'walleyed pike', 'walleyes'],
        perch: ['yellow perch', 'perch', 'perca flavescens'],
        crappie: ['crappie', 'crappies', 'black crappie', 'white crappie'],
        bluegill: ['bluegill/sunfish', 'bluegill', 'bluegills', 'sunfish', 'panfish']
      }
      
      const aliases = speciesAliases[targetSpecies.toLowerCase()] || [targetSpecies.toLowerCase()]
      
      for (const alias of aliases) {
        // CORRECTED Pattern: Look for "- Species name" at start of line, capture until next species or end
        const structuredPattern = new RegExp(`^-\\s*${alias}\\s*\\n([\\s\\S]*?)(?=\\n-\\s*[A-Z]|\\nCurrent\\s+conditions|$)`, 'gim')
        const structuredMatch = reportContent.match(structuredPattern)
        
        if (structuredMatch && structuredMatch[0]) {
          let content = structuredMatch[0]
          // Remove the header line ("- Species")
          content = content.replace(new RegExp(`^-\\s*${alias}\\s*\\n`, 'im'), '').trim()
          
          // Only return if we have structured content (contains "Locations:" or bullet points)
          if (content.length > 50 && (content.includes('Locations:') || content.includes('Depths:') || content.includes('- '))) {
            console.log(`✅ FIXED - Extracted structured content for ${alias}:`, content.substring(0, 300))
            return content
          }
        }
      }
      
      console.log(`❌ No structured content found for ${targetSpecies}`)
      return null
    }
    
    // Test all target species
    const testSpecies = ['musky', 'bass', 'walleye', 'perch', 'crappie', 'bluegill']
    
    testSpecies.forEach(species => {
      console.log(`\n🎯 Testing FIXED parser for ${species}:`)
      const result = parseSpeciesFromReport(reportData.content, species)
      if (result) {
        console.log('✅ SUCCESS - Got structured content with Locations/Depths/Techniques!')
      } else {
        console.log('❌ FAILED - Still not extracting correctly')
      }
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testFixedParser()