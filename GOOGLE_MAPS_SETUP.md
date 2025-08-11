# Google Maps API Setup

## Getting Your Google Maps API Key

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** (or select existing one)
3. **Enable the Maps JavaScript API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Maps JavaScript API"
   - Click "Enable"
4. **Create credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy your new API key

## Configure the API Key

1. **Update your .env file**:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

2. **Restart your development server**:
   ```bash
   npm run dev
   ```

## API Restrictions (Recommended for Security)

In Google Cloud Console > Credentials:

### HTTP Referrers
- Add `localhost:3000/*` for development
- Add your production domain when deploying

### API Restrictions  
- Restrict to "Maps JavaScript API" only

## Free Usage Limits

Google Maps gives you:
- **$200 free monthly credit**
- Maps JavaScript API: ~28,000 map loads per month free
- Perfect for development and small applications

## Troubleshooting

### Common Issues:
- **"InvalidKey" error**: API key not set or incorrect
- **"RefererNotAllowed"**: Domain not in HTTP referrers list  
- **Map not loading**: Check browser console for specific error

### Verify Setup:
1. Check `.env` file has correct key
2. Restart dev server after changing .env
3. Check browser console for errors
4. Verify API is enabled in Google Cloud Console

## Alternative: Development Without API Key

The map will show a helpful setup message when the API key is missing, but catch logging and other features will still work.