# Claude Development Context for Lake St. Clair Musky App

## Project Overview
This is a subscription-based musky fishing intelligence app for Lake St. Clair that combines real-time environmental data with AI analysis to help fishermen locate and catch musky more effectively.

## Key Development Guidelines

### Technology Stack
- **Frontend**: Next.js (JavaScript only - NO TypeScript)
- **Database**: PostgreSQL
- **Containerization**: Docker
- **Ports**: App on 3010, Backend API on 3011
- **Payment**: Stripe integration
- **Maps**: Google Maps API
- **AI**: Perplexity API for real-time analysis

### Core Functionality
1. **Environmental Monitoring**: Track wind, current, temperature, barometric pressure, water temp, cloud cover, precipitation
2. **Location Tracking**: Google Maps integration for plotting fish catch locations
3. **Fish Logging**: Users enter fish size (length/weight) and upload photos
4. **AI Analysis**: Combine static musky knowledge with real-time Perplexity data from Reddit/YouTube
5. **Dashboard**: Show current conditions, moon phases, and AI recommendations
6. **Authentication**: Sign-in system with Stripe subscription management

### Important Notes
- **Static Knowledge Base**: The app has pre-loaded musky behavior patterns to avoid constant research
- **Real-time Analysis**: Perplexity API evaluates current conditions against known knowledge
- **Weed Pattern Focus**: Summer weed growth and movement is a primary concern for musky fishing
- **Lake St. Clair Specific**: All data and recommendations should be tailored to this specific lake

### Development Commands
```bash
# Start development environment
docker-compose up -d

# Install dependencies
npm install

# Run development server
npm run dev

# Database migrations
npm run db:migrate

# Run tests
npm test
```

### Troubleshooting: Process and Port Management

#### Problem: `npx kill-port` doesn't reliably kill processes
- `npx kill-port 3010` reports success but process continues running
- Docker Desktop connectivity issues with named pipes
- Services restart but ports remain occupied

#### ✅ WORKING SOLUTIONS:

**1. PowerShell Process Killing (Most Reliable)**
```bash
# Find process using port
netstat -ano | findstr :3010

# Kill by PID using PowerShell (WORKS)
powershell "Stop-Process -Id [PID] -Force"

# Example:
powershell "Stop-Process -Id 22976 -Force"
```

**2. Complete Service Restart Workflow**
```bash
# Step 1: Find and kill all processes
netstat -ano | findstr :3010
netstat -ano | findstr :3011
powershell "Stop-Process -Id [PID1] -Force"
powershell "Stop-Process -Id [PID2] -Force"

# Step 2: Verify ports are free
netstat -ano | findstr :3010  # Should return nothing

# Step 3: Restart services
npm run dev &
cd server && node index.js &
```

**3. Docker Issues Workaround**
When Docker Desktop fails with named pipe errors:
```bash
# Don't rely on Docker containers, use local services:
npm run dev                    # Frontend on 3010
cd server && node index.js    # Backend on 3011
```

#### ❌ METHODS THAT DON'T WORK:
- `npx kill-port` - Reports success but processes persist
- `taskkill /PID` - Git Bash path issues
- `docker-compose down` - When Docker connectivity is broken

### Development Best Practices
- **NEVER COMMIT BEFORE TESTING**: Always thoroughly test functionality before creating git commits
- Test all user flows and edge cases
- Verify compilation succeeds without errors
- Check browser console for JavaScript errors
- Test on different screen sizes and browsers
- Ensure database operations work correctly

### API Integrations Required
- Google Maps JavaScript API (location plotting)
- Weather API (environmental conditions)
- NOAA Great Lakes API (water conditions)
- Perplexity API (real-time fishing intelligence)
- Stripe API (subscription payments)

### Database Schema Focus
- Users (authentication + subscription)
- Fish catches (location + environmental data)
- Environmental conditions (historical tracking)
- AI insights (recommendations + confidence scores)

### File Structure Priorities
- Single-page app design with component modularity
- Clean separation of frontend/backend
- Docker-ready configuration
- Environment variable management
- Static knowledge base for musky patterns

## Context for AI Recommendations
The app should always consider:
- Current wind direction and speed (affects weed movement)
- Water temperature gradients
- Barometric pressure changes
- Moon phase influence
- Time of day/season
- Historical success patterns at specific locations
- Recent community reports from social media