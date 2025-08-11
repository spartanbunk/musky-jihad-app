const axios = require('axios')

async function debugStructure() {
  try {
    const response = await axios.get('http://localhost:3011/api/weather/daily-fishing-report')
    const reportData = response.data
    
    console.log('LOOKING FOR MUSKY SECTION:')
    const lines = reportData.content.split('\n')
    let inMuskySection = false
    let muskyContent = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      if (line.match(/^-\s*Musky/i)) {
        console.log(`Found Musky at line ${i}: "${line}"`)
        inMuskySection = true
        muskyContent.push(line)
        continue
      }
      
      if (inMuskySection) {
        // Check if we hit the next species or section
        if (line.match(/^-\s*[A-Z]/) && !line.match(/^-\s*Musky/i)) {
          console.log(`End of Musky section at line ${i}: "${line}"`)
          break
        }
        
        if (line.match(/^Current conditions/i)) {
          console.log(`End of Musky section at Current conditions: "${line}"`)
          break
        }
        
        muskyContent.push(line)
      }
    }
    
    console.log('\nMUSKY SECTION CONTENT:')
    console.log('=' .repeat(60))
    muskyContent.forEach((line, index) => {
      console.log(`${index}: "${line}"`)
    })
    console.log('=' .repeat(60))
    
    console.log('\nJOINED CONTENT:')
    const joinedContent = muskyContent.join('\n')
    console.log(joinedContent)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

debugStructure()