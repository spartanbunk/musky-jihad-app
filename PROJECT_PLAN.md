# Lake St. Clair Multi-Species Fishing Intelligence App

## Project Overview
A subscription-based web application that helps fishermen catch multiple fish species on Lake St. Clair by analyzing weather conditions, weed patterns, and historical catch data using AI predictions. Initially focused on musky, the platform is designed to extend to walleye, bass, pike, perch, and other Lake St. Clair species.

## Core Features

### 1. Real-Time Environmental Monitoring
- **Wind Speed & Direction**: Track wind patterns affecting weed movement
- **Water Temperature**: Monitor optimal musky hunting conditions
- **Air Temperature & Barometric Pressure**: Weather pattern analysis
- **Cloud Cover & Precipitation**: Light conditions and fish behavior
- **Water Current Data**: Predict weed drift patterns
- **Moon Phases**: Lunar influence on fish activity

### 2. Multi-Species Location-Based Catch Tracking
- **Google Maps Integration**: Users plot exact catch locations with species-specific markers
- **Species Selection**: Dropdown for musky, walleye, bass, pike, perch, salmon, trout
- **Automatic Location Detection**: GPS coordinates when fish is caught
- **Fish Data Entry**: Length, weight, species verification with species-specific attributes
- **Photo Upload**: Image documentation with species identification assistance
- **Environmental Context**: Auto-capture conditions at catch time
- **Species-Specific Maps**: Toggle layers to show different fish species distributions

### 3. Multi-Species AI-Powered Analysis
- **Perplexity API Integration**: Real-time Reddit/YouTube fishing reports for all species
- **Species-Specific Pattern Recognition**: Analyze successful catch conditions per fish type
- **Habitat Prediction**: AI models for species-specific preferred environments
- **Weed Movement Prediction**: AI models for vegetation drift (musky/pike focus)
- **Depth Analysis**: Species preference for different water depths
- **Personalized Recommendations**: Custom advice based on target species and user history
- **Pre-loaded Knowledge Base**: Static behavior patterns for all Lake St. Clair species

### 4. Multi-Species User Dashboard
- **Live Conditions Display**: Current environmental data
- **Species-Specific Forecasts**: AI predictions for optimal times/locations per fish type
- **Target Species Selector**: Toggle between different fish species predictions
- **Catch History**: Personal fishing log with species-specific analytics
- **Success Patterns**: Visual analysis of productive conditions by species
- **Community Insights**: Recent catches from other users by species (optional sharing)
- **Species Comparison**: Compare conditions favorable for different fish types

### 5. Subscription & Payment
- **User Authentication**: Secure sign-in system
- **Stripe Integration**: Monthly/annual subscription billing
- **Tiered Access**: Basic vs Premium features
- **Payment Management**: Billing history and subscription control

## Technical Architecture

### Frontend (Port 3010)
- **Framework**: Next.js (JavaScript only, no TypeScript)
- **Styling**: CSS modules + responsive design
- **Maps**: Google Maps JavaScript API
- **State Management**: React Context API
- **Image Upload**: Direct to cloud storage

### Backend API (Port 3011)
- **Database**: PostgreSQL with connection pooling
- **Authentication**: JWT tokens with refresh mechanism
- **Payment Processing**: Stripe webhook integration
- **File Storage**: Cloud storage for fish photos
- **External APIs**: Weather services, Perplexity, Google Maps

### Data Sources
- **Weather API**: OpenWeatherMap or similar for Lake St. Clair
- **Marine Data**: NOAA Great Lakes data for currents/water temp
- **Perplexity API**: Real-time fishing report analysis
- **Google Maps API**: Location services and mapping
- **Static Knowledge**: Pre-loaded multi-species behavior database for Lake St. Clair

### Infrastructure
- **Containerization**: Docker Compose setup
- **Database**: PostgreSQL with persistent volumes
- **Environment**: Development and production configs
- **Deployment**: Ready for cloud deployment

## Database Schema

### Users Table
- ID, email, password_hash, subscription_status, created_at
- Stripe customer ID, subscription details

### Fish_Catches Table
- ID, user_id, fish_species, latitude, longitude, fish_length, fish_weight
- Catch_time, photo_url, environmental_conditions JSON, depth, lure_type
- Species_specific_attributes JSON (e.g., musky: teeth condition, walleye: eye clarity)

### Environmental_Data Table
- ID, timestamp, latitude, longitude, wind_speed, wind_direction
- Water_temp, air_temp, barometric_pressure, cloud_cover, moon_phase

### AI_Insights Table
- ID, user_id, target_species, generated_at, recommendation_text, confidence_score
- Conditions_analyzed JSON, success_prediction, species_specific_factors JSON

### Fish_Species Table
- ID, species_name, scientific_name, preferred_depth_range, preferred_temp_range
- Seasonal_patterns JSON, behavior_notes, habitat_preferences JSON

## Development Phases

### Phase 1: Core Infrastructure
1. Next.js project setup with Docker
2. PostgreSQL database and basic schema
3. User authentication system
4. Basic dashboard layout

### Phase 2: Location & Mapping
1. Google Maps integration
2. Location-based catch logging
3. Environmental data collection
4. Basic data visualization

### Phase 3: AI & Analytics
1. Perplexity API integration
2. Static knowledge base implementation
3. Pattern analysis algorithms
4. Recommendation engine

### Phase 4: Payment & Production
1. Stripe subscription integration
2. Production deployment setup
3. Performance optimization
4. User testing and refinement

## File Structure
```
musky_jihad/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── next.config.js
├── src/
│   ├── app/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── catch-log/
│   │   └── subscription/
│   ├── components/
│   │   ├── Map/
│   │   ├── Weather/
│   │   └── UI/
│   ├── lib/
│   │   ├── database/
│   │   ├── apis/
│   │   └── ai/
│   └── styles/
├── server/
│   ├── routes/
│   ├── middleware/
│   └── services/
└── knowledge-base/
    ├── musky-patterns.json
    ├── walleye-patterns.json
    ├── bass-patterns.json
    ├── pike-patterns.json
    └── species-config.json
```

## Environment Variables Needed
- DATABASE_URL
- GOOGLE_MAPS_API_KEY
- PERPLEXITY_API_KEY
- WEATHER_API_KEY
- STRIPE_PUBLISHABLE_KEY
- STRIPE_SECRET_KEY
- JWT_SECRET
- CLOUD_STORAGE_CONFIG

## Success Metrics
- User catch success rate improvement per species
- Prediction accuracy vs actual conditions by fish type
- User retention and subscription renewals
- Species-specific community engagement with shared insights
- Data quality and completeness across all species
- Multi-species usage adoption rates

## Lake St. Clair Target Species

### Primary Species (Phase 1)
- **Musky**: Main focus, weed pattern analysis critical
- **Walleye**: Popular sport fish, depth and structure dependent
- **Bass** (Smallmouth/Largemouth): Weather sensitive, structure focused

### Secondary Species (Phase 2)
- **Northern Pike**: Similar to musky, weed edge focused
- **Yellow Perch**: School fish, depth and structure dependent
- **Salmon/Trout**: Temperature and current sensitive
- **White Perch**: Seasonal patterns important

## Next Steps
1. Initialize Next.js project with proper structure
2. Set up Docker environment for development
3. Create database schema and migrations
4. Begin with authentication and basic dashboard
5. Integrate Google Maps for location tracking