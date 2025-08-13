# Production URL Configuration Guide

## Overview
All hardcoded localhost URLs have been replaced with environment variables, making the app deployment-ready for any hosting environment.

## Environment Variables to Configure

### For Production Deployment

Update your `.env` file with production values:

```bash
# Application URLs (REQUIRED - Update for production)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# For AWS/EC2 deployment example:
NEXT_PUBLIC_API_URL=https://api.muskyapp.com
NEXT_PUBLIC_APP_URL=https://muskyapp.com
ALLOWED_ORIGINS=https://muskyapp.com,https://www.muskyapp.com

# For staging environment:
NEXT_PUBLIC_API_URL=https://staging-api.muskyapp.com
NEXT_PUBLIC_APP_URL=https://staging.muskyapp.com
ALLOWED_ORIGINS=https://staging.muskyapp.com
```

## What Was Changed

### 1. Created Central API Configuration
- **File**: `/src/config/api.js`
- Centralizes all API endpoints
- Uses environment variables with fallback to localhost

### 2. Updated Frontend Components
- **AuthContext**: Uses `config.api.endpoints` for auth calls
- **FishingDashboard**: Uses config for weather and catches API
- **CatchLogger**: Uses config for uploads and catches
- **CatchEditModal**: Uses config for photo uploads

### 3. Dynamic CORS Configuration
- **Server**: `/server/index.js`
- CORS origins now read from `ALLOWED_ORIGINS` environment variable
- Supports multiple origins separated by commas

## Deployment Checklist

### Before Deploying to Production:

1. **Update `.env` file** with production URLs:
   ```bash
   NEXT_PUBLIC_API_URL=https://your-api-domain.com
   NEXT_PUBLIC_APP_URL=https://your-app-domain.com
   ALLOWED_ORIGINS=https://your-app-domain.com
   ```

2. **Update Docker Compose** (if using Docker):
   ```yaml
   environment:
     - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
     - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
   ```

3. **For Vercel/Netlify**:
   - Add environment variables in dashboard
   - Set `NEXT_PUBLIC_API_URL` to your backend API URL
   - Set `NEXT_PUBLIC_APP_URL` to your frontend URL

4. **For AWS EC2**:
   - Set environment variables in your EC2 instance
   - Or use AWS Systems Manager Parameter Store

5. **Update `next.config.js`** image domains for production:
   ```javascript
   images: {
     domains: ['storage.googleapis.com', 'localhost', 'your-domain.com'],
   }
   ```

## Testing Configuration

### Development (Default)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3011
NEXT_PUBLIC_APP_URL=http://localhost:3010
ALLOWED_ORIGINS=http://localhost:3010,http://localhost:3000
```

### Production Example
```bash
NEXT_PUBLIC_API_URL=https://api.lakestclairfishing.com
NEXT_PUBLIC_APP_URL=https://lakestclairfishing.com
ALLOWED_ORIGINS=https://lakestclairfishing.com,https://www.lakestclairfishing.com
```

## Verification

After deployment, verify:

1. **Frontend can reach API**:
   - Check browser console for API errors
   - Verify authentication works
   - Test data fetching (weather, catches)

2. **CORS is configured**:
   - No CORS errors in browser console
   - API accepts requests from production domain

3. **Images load properly**:
   - Uploaded catch photos display correctly
   - Photo URLs use correct domain

## Rollback

If issues occur, you can quickly rollback by:
1. Setting environment variables back to localhost
2. Restarting the application

## Notes

- Never commit production URLs to git
- Use different API keys for production
- Enable HTTPS for production domains
- Consider using a CDN for static assets