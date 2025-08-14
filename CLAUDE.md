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

### Troubleshooting: Service Restart & Docker Desktop Management

#### Problem: Docker Desktop Dies During Process Restarts
- Aggressive process killing affects Docker Desktop stability
- Named pipe errors: `//./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`
- Database connection failures after restarts
- Environment variable loss in backend

#### ✅ RELIABLE RESTART PROCEDURE:

**1. Check Docker Desktop Health First**
```bash
# Always verify Docker Desktop before restarting services
./scripts/check-docker.sh

# If Docker fails: manually restart Docker Desktop, wait 3-5 minutes
```

**2. Use Gentle Service Restart**
```bash
# Recommended: Use automated script
./scripts/restart-services.sh

# OR manual gentle restart:
npx kill-port 3010 3011        # Graceful shutdown first
sleep 3                        # Wait for cleanup
netstat -ano | findstr :3010   # Check remaining processes
powershell "Stop-Process -Id [PID] -Force"  # Only if needed
npm run dev &                  # Start frontend
npm run server:dev &           # Start backend (loads .env properly)
```

**3. Environment Variable Validation**
```bash
# Backend now validates critical env vars on startup:
# - DATABASE_URL (should be localhost:5433 for Docker)
# - JWT_SECRET
# - PORT

# If validation fails, check .env file exists and is readable
```

**4. Service Health Verification**
```bash
# Check all services are running
netstat -ano | findstr :3010   # Frontend
netstat -ano | findstr :3011   # Backend  
docker ps                      # Database containers
curl http://localhost:3011/api/health  # Backend health
```

#### ⚠️ DOCKER DESKTOP RECOVERY:
When Docker Desktop becomes unresponsive:
```bash
# 1. Check Docker status
docker ps  # If this fails, Docker Desktop is down

# 2. Manual restart required
# - Close Docker Desktop completely
# - Restart Docker Desktop from Start menu  
# - Wait 3-5 minutes for full initialization
# - Verify with: docker ps

# 3. Start database containers
docker-compose up -d

# 4. Restart application services
./scripts/restart-services.sh
```

#### ❌ PROBLEMATIC METHODS (AVOID):
- **Aggressive process killing without Docker health checks**
- **Starting backend with `node index.js` (misses .env loading)**  
- **Restarting services while Docker Desktop is unhealthy**
- **Force killing processes without graceful shutdown first**

#### 🔧 RECOVERY PATTERNS:
- **Pattern**: Restart services → Docker dies → 5min recovery
- **Fix**: Always check Docker health before service restart
- **Time**: Gentle restart ~30 seconds vs aggressive restart ~5 minutes

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