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