# Perplexity Search Toggle Guide

## Quick Toggle Commands

### To DISABLE Perplexity Search (save tokens during testing)
Add this to your `.env` file:
```
ENABLE_PERPLEXITY_SEARCH=false
```

### To ENABLE Perplexity Search (default)
Either remove the line from `.env` or set:
```
ENABLE_PERPLEXITY_SEARCH=true
```

## Testing the API
Run the test script to verify Perplexity is working:
```bash
node test-perplexity.js
```

## What Changed

1. **Fixed Model Name**: Changed from `llama-3.1-sonar-small-128k-online` to `sonar`
2. **Added Toggle**: Use `ENABLE_PERPLEXITY_SEARCH` environment variable
3. **Better Error Logging**: Enhanced error messages in `/server/routes/ai.js`
4. **UI Indicator**: Shows "🔍 Live Search ON" or "📊 Static Analysis" in recommendations

## Current Status
- ✅ Perplexity API Key is configured
- ✅ Correct model name: `sonar`
- ✅ Toggle mechanism implemented
- ✅ UI shows search status
- ✅ Test script confirms API works

## API Response Example
The Perplexity API returns:
- Real-time fishing reports
- Citations with sources
- Search results with dates
- Cost information per request (~$0.005 per request)

## Troubleshooting
- If you get 401 error: Check your API key
- If you get 400 error: Model name might be wrong
- Check console logs in browser for detailed error messages