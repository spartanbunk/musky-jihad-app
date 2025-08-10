-- Lake St. Clair Fishing Intelligence App Database Schema

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Stripe integration
    stripe_customer_id VARCHAR(255),
    subscription_status VARCHAR(50) DEFAULT 'trial', -- trial, active, canceled, past_due
    subscription_id VARCHAR(255),
    trial_end_date TIMESTAMP,
    
    -- User preferences
    preferred_species VARCHAR(50) DEFAULT 'musky',
    notification_settings JSON DEFAULT '{"email": true, "conditions": true, "ai_insights": true}'
);

-- Fish species reference table
CREATE TABLE fish_species (
    id SERIAL PRIMARY KEY,
    species_name VARCHAR(100) NOT NULL UNIQUE,
    scientific_name VARCHAR(150),
    common_names TEXT[],
    
    -- Behavioral characteristics
    preferred_depth_min INTEGER, -- feet
    preferred_depth_max INTEGER,
    preferred_temp_min DECIMAL(4,1), -- fahrenheit  
    preferred_temp_max DECIMAL(4,1),
    
    -- Seasonal and environmental patterns
    seasonal_patterns JSON,
    behavior_notes TEXT,
    habitat_preferences JSON,
    
    -- Display configuration
    map_color VARCHAR(7) DEFAULT '#3b82f6',
    icon_emoji VARCHAR(10) DEFAULT '🐟',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fish catches table
CREATE TABLE fish_catches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    species_id INTEGER NOT NULL REFERENCES fish_species(id),
    
    -- Catch details
    fish_length DECIMAL(5,2) NOT NULL, -- inches
    fish_weight DECIMAL(6,2) NOT NULL, -- pounds
    catch_time TIMESTAMP NOT NULL,
    
    -- Location
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    depth_feet INTEGER,
    location_notes TEXT,
    
    -- Fishing details
    lure_type VARCHAR(100),
    bait_used VARCHAR(100),
    technique_used VARCHAR(100),
    
    -- Environmental conditions at catch time
    environmental_conditions JSON,
    
    -- Media
    photo_url VARCHAR(500),
    
    -- Species-specific attributes (JSON for flexibility)
    species_specific_attributes JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Environmental data table
CREATE TABLE environmental_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Location
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    
    -- Time
    recorded_at TIMESTAMP NOT NULL,
    data_source VARCHAR(100), -- 'api', 'user_input', 'sensor'
    
    -- Weather conditions
    wind_speed DECIMAL(4,1), -- mph
    wind_direction VARCHAR(3), -- N, NE, E, SE, S, SW, W, NW
    air_temperature DECIMAL(5,2), -- fahrenheit
    water_temperature DECIMAL(5,2), -- fahrenheit
    barometric_pressure DECIMAL(6,2), -- inches of mercury
    
    -- Sky conditions  
    cloud_cover INTEGER, -- percentage 0-100
    precipitation_type VARCHAR(20), -- none, rain, snow, sleet
    precipitation_intensity DECIMAL(4,2), -- inches per hour
    visibility_miles DECIMAL(4,1),
    
    -- Water conditions
    wave_height DECIMAL(4,2), -- feet
    current_speed DECIMAL(4,2), -- mph
    current_direction VARCHAR(3),
    water_clarity VARCHAR(20), -- clear, murky, stained, muddy
    
    -- Astronomical
    moon_phase VARCHAR(20),
    moon_illumination INTEGER, -- percentage 0-100
    sunrise_time TIME,
    sunset_time TIME,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI insights and recommendations table
CREATE TABLE ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Target species for this insight
    target_species_id INTEGER REFERENCES fish_species(id),
    target_location_lat DECIMAL(10, 8),
    target_location_lng DECIMAL(11, 8),
    
    -- Recommendation details
    generated_at TIMESTAMP NOT NULL,
    recommendation_text TEXT NOT NULL,
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    
    -- Analysis data
    conditions_analyzed JSON, -- snapshot of environmental data used
    historical_patterns_used JSON, -- patterns from knowledge base
    success_prediction DECIMAL(5,2), -- predicted success rate
    
    -- Recommendations
    best_times JSON, -- array of recommended time windows
    recommended_techniques JSON, -- fishing methods, lures, etc
    location_suggestions JSON, -- specific lat/lng with reasoning
    
    -- Species-specific factors
    species_specific_factors JSON,
    
    -- Feedback
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT,
    actual_result BOOLEAN, -- did user catch fish following this advice?
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge base patterns (for static musky/species patterns)
CREATE TABLE knowledge_patterns (
    id SERIAL PRIMARY KEY,
    species_id INTEGER NOT NULL REFERENCES fish_species(id),
    
    pattern_type VARCHAR(50) NOT NULL, -- weather, seasonal, location, etc
    pattern_name VARCHAR(100) NOT NULL,
    pattern_description TEXT,
    
    -- Conditions that trigger this pattern
    trigger_conditions JSON,
    
    -- Expected fish behavior
    expected_behavior JSON,
    
    -- Recommended actions
    recommended_techniques JSON,
    
    -- Pattern strength/reliability
    confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 10),
    source VARCHAR(100), -- research, expert_knowledge, data_analysis
    
    -- Seasonal/temporal applicability
    valid_months INTEGER[], -- array of month numbers 1-12
    valid_times_of_day TIME[],
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User activity and analytics
CREATE TABLE user_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    event_type VARCHAR(50) NOT NULL, -- login, catch_logged, ai_request, etc
    event_data JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_fish_catches_user_species ON fish_catches(user_id, species_id);
CREATE INDEX idx_fish_catches_location ON fish_catches(latitude, longitude);
CREATE INDEX idx_fish_catches_time ON fish_catches(catch_time);
CREATE INDEX idx_environmental_data_location_time ON environmental_data(latitude, longitude, recorded_at);
CREATE INDEX idx_ai_insights_user_species ON ai_insights(user_id, target_species_id);
CREATE INDEX idx_knowledge_patterns_species ON knowledge_patterns(species_id, pattern_type);

-- Insert default fish species for Lake St. Clair
INSERT INTO fish_species (species_name, scientific_name, preferred_depth_min, preferred_depth_max, preferred_temp_min, preferred_temp_max, map_color, icon_emoji, seasonal_patterns, habitat_preferences) VALUES
('musky', 'Esox masquinongy', 8, 25, 65, 78, '#059669', '🐟', 
 '{"spring": "shallow weed areas", "summer": "weed edges and drop-offs", "fall": "deeper structures", "winter": "deep basins"}',
 '{"structure": "weed edges, drop-offs, rocky areas", "cover": "vegetation, fallen trees", "bottom": "sand, gravel, rock"}'
),
('walleye', 'Sander vitreus', 15, 40, 60, 72, '#d97706', '🐠',
 '{"spring": "shallow spawning areas", "summer": "deep water structures", "fall": "schools on breaks", "winter": "deep basins"}', 
 '{"structure": "drop-offs, channels, humps", "cover": "minimal", "bottom": "sand, gravel, mud"}'
),
('bass', 'Micropterus spp.', 5, 20, 68, 80, '#7c3aed', '🎣',
 '{"spring": "shallow spawning bays", "summer": "structure and cover", "fall": "feeding on baitfish", "winter": "deep structure"}',
 '{"structure": "rocks, docks, weed edges", "cover": "vegetation, logs, docks", "bottom": "rock, sand, gravel"}'
),
('pike', 'Esox lucius', 5, 15, 50, 75, '#dc2626', '🐡',
 '{"spring": "shallow weedy bays", "summer": "weed edges", "fall": "following baitfish", "winter": "deep weed edges"}',
 '{"structure": "weed beds, shallow bays", "cover": "heavy vegetation", "bottom": "mud, sand with vegetation"}'
),
('perch', 'Perca flavescens', 10, 30, 55, 72, '#eab308', '🐟',
 '{"spring": "shallow spawning", "summer": "schools in deep water", "fall": "feeding heavily", "winter": "deep schools"}',
 '{"structure": "humps, drop-offs, channels", "cover": "minimal", "bottom": "sand, gravel, mud"}'
),
('salmon', 'Oncorhynchus spp.', 40, 120, 45, 60, '#ec4899', '🍣',
 '{"spring": "deep cold water", "summer": "thermocline", "fall": "staging for spawning", "winter": "deep water"}',
 '{"structure": "open water, thermocline", "cover": "minimal", "bottom": "any, water column oriented"}'
),
('trout', 'Salvelinus namaycush', 30, 100, 45, 55, '#06b6d4', '🐟',
 '{"spring": "shallow after ice out", "summer": "deep cold water", "fall": "spawning areas", "winter": "deep basins"}',
 '{"structure": "deep water, rocky areas", "cover": "minimal", "bottom": "rock, gravel, sand"}'
);