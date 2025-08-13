require('dotenv').config()
const axios = require('axios')

async function testPerplexityAPI() {
  console.log('🔍 Testing Perplexity API...')
  console.log('API Key:', process.env.PERPLEXITY_API_KEY ? '✅ Found' : '❌ Missing')
  console.log('Search Enabled:', process.env.ENABLE_PERPLEXITY_SEARCH !== 'false' ? '✅ Yes' : '❌ No')
  
  if (!process.env.PERPLEXITY_API_KEY) {
    console.error('❌ No PERPLEXITY_API_KEY found in environment')
    return
  }
  
  if (process.env.ENABLE_PERPLEXITY_SEARCH === 'false') {
    console.log('⚠️ Perplexity search is disabled via ENABLE_PERPLEXITY_SEARCH=false')
    return
  }
  
  try {
    console.log('\n📡 Making API request...')
    const response = await axios.post('https://api.perplexity.ai/chat/completions', {
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: 'You are a fishing expert. Be concise.'
        },
        {
          role: 'user',
          content: 'What are recent musky fishing reports for Lake St. Clair? Give me a brief 2-3 sentence summary.'
        }
      ],
      max_tokens: 150,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('✅ API Response received!')
    console.log('Response:', response.data.choices[0].message.content)
    console.log('\n📊 Full response structure:')
    console.log(JSON.stringify(response.data, null, 2))
    
  } catch (error) {
    console.error('❌ API Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    })
    
    if (error.response?.status === 401) {
      console.error('\n⚠️ Authentication failed - check your API key')
    } else if (error.response?.status === 400) {
      console.error('\n⚠️ Bad request - check the model name and request format')
    }
  }
}

// Test toggle functionality
console.log('🧪 Testing toggle functionality...\n')

// Test with search enabled
testPerplexityAPI().then(() => {
  console.log('\n' + '='.repeat(50))
  console.log('Now testing with search disabled...')
  console.log('='.repeat(50) + '\n')
  
  // Test with search disabled
  process.env.ENABLE_PERPLEXITY_SEARCH = 'false'
  testPerplexityAPI()
})