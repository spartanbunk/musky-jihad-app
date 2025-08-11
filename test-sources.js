// Test all weather data sources
const axios = require('axios')

async function testSources() {
  console.log('🔍 Testing Weather Data Sources...\n')
  
  try {
    // 1. Test USNO Astronomy API directly
    console.log('1️⃣ Testing U.S. Naval Observatory API...')
    const usnoResponse = await axios.get('https://aa.usno.navy.mil/api/rstt/oneday?date=2025-8-11&coords=42.4583,-82.7167')
    const moonData = usnoResponse.data.properties.data
    console.log(`   ✅ Moon Phase: ${moonData.curphase} ${moonData.fracillum}`)
    
    // Extract sun/moon timing data
    const sunrise = usnoResponse.data.properties.data.sundata.find(event => event.phen === 'Rise')?.time
    const sunset = usnoResponse.data.properties.data.sundata.find(event => event.phen === 'Set')?.time
    const moonrise = usnoResponse.data.properties.data.moondata.find(event => event.phen === 'Rise')?.time
    const moonset = usnoResponse.data.properties.data.moondata.find(event => event.phen === 'Set')?.time
    
    console.log(`   ✅ Sunrise: ${sunrise}, Sunset: ${sunset}`)
    console.log(`   ✅ Moonrise: ${moonrise}, Moonset: ${moonset}\n`)
    
    // 2. Test our Perplexity endpoint
    console.log('2️⃣ Testing Perplexity Weather API...')
    const perplexityResponse = await axios.get('http://localhost:3011/api/weather/current-perplexity')
    const pData = perplexityResponse.data.conditions
    console.log(`   ✅ Temperature: ${pData.temperature}°F`)
    console.log(`   ✅ Wind: ${pData.windSpeed} mph ${pData.windDirection}`)
    console.log(`   ✅ Humidity: ${pData.humidity}%`)
    console.log(`   ✅ Moon (overridden): ${pData.moonPhase.name} ${pData.moonPhase.illumination}%\n`)
    
    // 3. Test our validated multi-source endpoint
    console.log('3️⃣ Testing Validated Multi-Source API...')
    const validatedResponse = await axios.get('http://localhost:3011/api/weather/current-validated')
    const vData = validatedResponse.data.conditions
    console.log(`   ✅ Temperature: ${vData.temperature}°F`)
    console.log(`   ✅ Wind: ${vData.windSpeed} mph ${vData.windDirection}`)
    console.log(`   ✅ Humidity: ${vData.humidity}%`)
    console.log(`   ✅ Moon Phase: ${vData.moonPhase.name} ${vData.moonPhase.illumination}% (source: ${vData.moonPhase.source})`)
    console.log(`   ✅ Sources Used: ${validatedResponse.data.dataQuality.sourcesUsed}`)
    console.log(`   ✅ Validation Level: ${validatedResponse.data.dataQuality.validationLevel}\n`)
    
    console.log('✅ All data sources are working correctly!')
    console.log(`\n📊 Current Conditions Summary:`)
    console.log(`   🌡️ Temperature: ${vData.temperature}°F`)
    console.log(`   🌬️ Wind: ${vData.windSpeed} mph ${vData.windDirection}`) 
    console.log(`   💧 Humidity: ${vData.humidity}%`)
    console.log(`   📊 Pressure: ${vData.pressure}"`)
    console.log(`   🌙 Moon: ${vData.moonPhase.name} ${vData.moonPhase.illumination}%`)
    console.log(`   🌊 Wave Height: ${vData.waveHeight} ft`)
    if (vData.astronomy) {
      console.log(`   🌅 Sunrise: ${vData.astronomy.sunrise}, Sunset: ${vData.astronomy.sunset}`)
      console.log(`   🌙 Moonrise: ${vData.astronomy.moonrise}, Moonset: ${vData.astronomy.moonset}`)
    }
    
  } catch (error) {
    console.error('❌ Error testing sources:', error.message)
  }
}

testSources()