# Lake St. Clair Multi-Species Fishing Intelligence App 🎣

An AI-powered fishing assistance application for Lake St. Clair that helps anglers catch musky, walleye, bass, pike, perch, salmon, and trout using real-time environmental data, weather conditions, and pattern analysis.

## Features

### 🌊 Real-Time Environmental Monitoring
- Wind speed, direction, and conditions
- Air and water temperature tracking
- Barometric pressure analysis
- Cloud cover and precipitation
- Moon phases and astronomical data

### 🗺️ Smart Location Mapping
- Google Maps integration for precise catch logging
- Species-specific map markers and layers
- GPS location detection
- Interactive map with catch history

### 🤖 AI-Powered Analysis
- Species-specific fishing recommendations
- Pattern recognition from historical data
- Real-time social media fishing report analysis via Perplexity AI
- Confidence scoring for predictions

### 📊 Comprehensive Species Support
- **Musky**: Weed pattern analysis and structure fishing
- **Walleye**: Deep water structure and night bite patterns
- **Bass**: Smallmouth rocky areas and largemouth weed edges
- **Pike**: Shallow bay ambush and weed edge patrol
- **Perch**: School fishing and depth analysis
- **Salmon**: Thermocline and deep water trolling
- **Trout**: Cold water structure fishing

### 💳 Subscription Features
- User authentication and profiles
- Stripe payment integration
- 7-day free trial
- Subscription management

## Tech Stack

- **Frontend**: Next.js 14 (JavaScript, no TypeScript)
- **Backend**: Express.js API server
- **Database**: PostgreSQL with comprehensive schema
- **Maps**: Google Maps JavaScript API
- **AI**: Perplexity API for real-time insights
- **Weather**: OpenWeatherMap API
- **Payments**: Stripe
- **Containerization**: Docker & Docker Compose
- **Styling**: Pure CSS with responsive design

## Getting Started

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- API Keys:
  - Google Maps API key
  - Perplexity API key (optional)
  - OpenWeatherMap API key (optional)
  - Stripe keys (for payments)

### Installation

1. **Clone and setup**:
   ```bash
   cd "D:/AI Projects/websites/musky_jihad"
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` and fill in your API keys:
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys
   ```

3. **Start the application**:
   ```bash
   # Start database and services
   docker-compose up -d
   
   # Run database migrations
   npm run db:migrate
   
   # Start development servers
   npm run dev  # Frontend on port 3010
   npm run server:dev  # Backend API on port 3011
   ```

4. **Access the application**:
   - Frontend: http://localhost:3010
   - Backend API: http://localhost:3011
   - Database: localhost:5432

## Project Structure

```
musky_jihad/
├── src/app/                    # Next.js app directory
│   ├── page.js                # Main application page
│   ├── layout.js              # Root layout
│   └── globals.css            # Global styles
├── src/components/            # React components
│   ├── FishingDashboard.js    # Main dashboard
│   ├── WeatherWidget.js       # Weather conditions display
│   ├── FishingMap.js          # Google Maps integration
│   ├── CatchLogger.js         # Fish catch logging form
│   ├── SpeciesSelector.js     # Multi-species toggle
│   └── AuthModal.js           # Authentication modal
├── server/                    # Express.js backend
│   ├── index.js              # Main server file
│   ├── database/             # Database connection and schema
│   ├── routes/               # API routes
│   └── migrations/           # Database migrations
├── knowledge-base/           # Species-specific fishing patterns
│   ├── musky-patterns.json
│   ├── walleye-patterns.json
│   ├── bass-patterns.json
│   ├── pike-patterns.json
│   └── species-config.json
└── docker-compose.yml        # Docker services configuration
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Fishing Data
- `GET /api/catches` - Get user's catch history
- `POST /api/catches` - Log a new catch
- `GET /api/catches/stats` - Get catch statistics

### Environmental Data
- `GET /api/weather/current` - Current conditions
- `GET /api/weather/forecast` - Weather forecast
- `GET /api/weather/history` - Historical conditions

### AI Recommendations
- `POST /api/ai/recommendations` - Get AI fishing recommendations

### Payments
- `POST /api/stripe/create-checkout-session` - Create payment session
- `GET /api/stripe/subscription-status` - Check subscription status

## Database Schema

The application uses a comprehensive PostgreSQL schema with tables for:
- **users**: User accounts and subscription info
- **fish_species**: Species configuration and characteristics
- **fish_catches**: Individual catch records with location and conditions
- **environmental_data**: Weather and environmental conditions
- **ai_insights**: AI-generated recommendations and analysis
- **knowledge_patterns**: Static fishing patterns and behavior data

## Development

### Adding New Species
1. Add species configuration in `knowledge-base/species-config.json`
2. Create species-specific patterns file (e.g., `species-name-patterns.json`)
3. Update database with new species entry
4. Add species to frontend selectors

### Customizing AI Analysis
- Modify pattern analysis in `server/routes/ai.js`
- Update knowledge base files with new patterns
- Adjust confidence scoring algorithms

### API Integration
- Weather data: Configured for OpenWeatherMap
- Social media analysis: Uses Perplexity AI
- Maps: Google Maps JavaScript API
- Payments: Stripe integration

## Deployment

The application is containerized and ready for deployment:
- Frontend and backend in Docker containers
- PostgreSQL database with persistent volumes
- Environment-based configuration
- Production-ready security headers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions:
- Check the documentation
- Review the knowledge base files
- Examine the API routes
- Check database schema for data structure

---

**Happy Fishing! 🎣**

*Catch more fish with AI-powered intelligence on Lake St. Clair*