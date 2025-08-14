-- =====================================================================
-- Lake St. Clair Musky Fishing Database Optimization Script
-- DBA Analysis Implementation - Critical Fixes & Performance Enhancements
-- =====================================================================

-- Execute this script in order - each section builds on the previous
-- Estimated execution time: 2-5 minutes depending on data volume

BEGIN;

-- =====================================================================
-- SECTION 1: CREATE MISSING UPDATE TRIGGER FUNCTION
-- =====================================================================

-- Create the update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================================
-- SECTION 2: ENHANCE USERS TABLE - CRITICAL MISSING FIELDS
-- =====================================================================

-- Add essential user fields for production subscription service
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS preferred_species INTEGER REFERENCES fish_species(id),
ADD COLUMN IF NOT EXISTS notification_settings JSON DEFAULT '{"email": true, "sms": false, "push": true}'::json,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add indexes for new subscription-related fields
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_trial_end_date ON users(trial_end_date) WHERE trial_end_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Add update trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add check constraints for data validation
ALTER TABLE users 
ADD CONSTRAINT check_subscription_status 
CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled', 'suspended'));

ALTER TABLE users 
ADD CONSTRAINT check_subscription_tier 
CHECK (subscription_tier IN ('basic', 'premium', 'pro', 'enterprise'));

-- =====================================================================
-- SECTION 3: LINK ENVIRONMENTAL DATA TO FISH CATCHES
-- =====================================================================

-- Add environmental data reference to fish catches
ALTER TABLE fish_catches 
ADD COLUMN IF NOT EXISTS environmental_data_id UUID REFERENCES environmental_data(id);

-- Create index for the new relationship
CREATE INDEX IF NOT EXISTS idx_fish_catches_environmental ON fish_catches(environmental_data_id);

-- =====================================================================
-- SECTION 4: ADD CRITICAL PERFORMANCE INDEXES
-- =====================================================================

-- Environmental data composite index for location + time queries
CREATE INDEX IF NOT EXISTS idx_environmental_data_composite 
ON environmental_data(recorded_at DESC, latitude, longitude);

-- User analytics composite index for user event analysis
CREATE INDEX IF NOT EXISTS idx_user_analytics_composite 
ON user_analytics(user_id, created_at DESC, event_type);

-- Fish catches location index for geographic clustering
CREATE INDEX IF NOT EXISTS idx_fish_catches_location_detailed 
ON fish_catches(latitude, longitude, catch_time DESC);

-- AI insights performance index for user + species + time
CREATE INDEX IF NOT EXISTS idx_ai_insights_performance 
ON ai_insights(user_id, target_species_id, generated_at DESC);

-- Knowledge patterns search optimization
CREATE INDEX IF NOT EXISTS idx_knowledge_patterns_search 
ON knowledge_patterns(pattern_type, species_id, confidence_level DESC);

-- =====================================================================
-- SECTION 5: ADD MISSING UPDATE TRIGGERS
-- =====================================================================

-- Add update trigger to daily_fishing_reports
DROP TRIGGER IF EXISTS update_daily_fishing_reports_updated_at ON daily_fishing_reports;
CREATE TRIGGER update_daily_fishing_reports_updated_at 
    BEFORE UPDATE ON daily_fishing_reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add update trigger to knowledge_patterns
DROP TRIGGER IF EXISTS update_knowledge_patterns_updated_at ON knowledge_patterns;
CREATE TRIGGER update_knowledge_patterns_updated_at 
    BEFORE UPDATE ON knowledge_patterns 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- SECTION 6: ENHANCE ENVIRONMENTAL DATA TABLE
-- =====================================================================

-- Add missing fields for comprehensive environmental tracking
ALTER TABLE environmental_data 
ADD COLUMN IF NOT EXISTS water_temperature NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS water_clarity_feet INTEGER,
ADD COLUMN IF NOT EXISTS wind_gust_speed NUMERIC(4,1),
ADD COLUMN IF NOT EXISTS precipitation_inches NUMERIC(4,2),
ADD COLUMN IF NOT EXISTS humidity_percent INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add environmental data update trigger
DROP TRIGGER IF EXISTS update_environmental_data_updated_at ON environmental_data;
CREATE TRIGGER update_environmental_data_updated_at 
    BEFORE UPDATE ON environmental_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for new environmental fields
CREATE INDEX IF NOT EXISTS idx_environmental_data_water_temp ON environmental_data(water_temperature) WHERE water_temperature IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_environmental_data_wind_conditions ON environmental_data(wind_speed, wind_direction) WHERE wind_speed IS NOT NULL;

-- =====================================================================
-- SECTION 7: ADD DATA VALIDATION CONSTRAINTS
-- =====================================================================

-- Fish catches validation
ALTER TABLE fish_catches 
ADD CONSTRAINT IF NOT EXISTS check_fish_length 
CHECK (fish_length > 0 AND fish_length < 100),

ADD CONSTRAINT IF NOT EXISTS check_fish_weight 
CHECK (fish_weight > 0 AND fish_weight < 200),

ADD CONSTRAINT IF NOT EXISTS check_depth_feet 
CHECK (depth_feet IS NULL OR (depth_feet > 0 AND depth_feet < 1000)),

ADD CONSTRAINT IF NOT EXISTS check_latitude_range 
CHECK (latitude BETWEEN -90 AND 90),

ADD CONSTRAINT IF NOT EXISTS check_longitude_range 
CHECK (longitude BETWEEN -180 AND 180);

-- Environmental data validation
ALTER TABLE environmental_data 
ADD CONSTRAINT IF NOT EXISTS check_env_latitude_range 
CHECK (latitude BETWEEN -90 AND 90),

ADD CONSTRAINT IF NOT EXISTS check_env_longitude_range 
CHECK (longitude BETWEEN -180 AND 180),

ADD CONSTRAINT IF NOT EXISTS check_wind_speed 
CHECK (wind_speed IS NULL OR (wind_speed >= 0 AND wind_speed < 200)),

ADD CONSTRAINT IF NOT EXISTS check_air_temperature 
CHECK (air_temperature IS NULL OR (air_temperature BETWEEN -50 AND 150)),

ADD CONSTRAINT IF NOT EXISTS check_cloud_cover 
CHECK (cloud_cover IS NULL OR (cloud_cover BETWEEN 0 AND 100)),

ADD CONSTRAINT IF NOT EXISTS check_water_temperature 
CHECK (water_temperature IS NULL OR (water_temperature BETWEEN 32 AND 100)),

ADD CONSTRAINT IF NOT EXISTS check_humidity_percent 
CHECK (humidity_percent IS NULL OR (humidity_percent BETWEEN 0 AND 100));

-- =====================================================================
-- SECTION 8: CREATE USEFUL VIEWS FOR COMMON QUERIES
-- =====================================================================

-- View for complete fish catch information with species and environmental data
CREATE OR REPLACE VIEW v_fish_catches_complete AS
SELECT 
    fc.id,
    fc.user_id,
    u.email as user_email,
    fs.species_name,
    fs.scientific_name,
    fc.fish_length,
    fc.fish_weight,
    fc.catch_time,
    fc.latitude,
    fc.longitude,
    fc.depth_feet,
    fc.location_notes,
    fc.lure_type,
    fc.bait_used,
    fc.technique_used,
    ed.air_temperature,
    ed.water_temperature,
    ed.wind_speed,
    ed.wind_direction,
    ed.barometric_pressure,
    ed.moon_phase,
    fc.created_at
FROM fish_catches fc
JOIN users u ON fc.user_id = u.id
JOIN fish_species fs ON fc.species_id = fs.id
LEFT JOIN environmental_data ed ON fc.environmental_data_id = ed.id;

-- View for user analytics summary
CREATE OR REPLACE VIEW v_user_analytics_summary AS
SELECT 
    user_id,
    COUNT(*) as total_events,
    COUNT(DISTINCT event_type) as unique_event_types,
    MIN(created_at) as first_event,
    MAX(created_at) as last_event,
    DATE_TRUNC('day', MAX(created_at)) - DATE_TRUNC('day', MIN(created_at)) as days_active
FROM user_analytics 
GROUP BY user_id;

-- View for recent AI insights with user feedback
CREATE OR REPLACE VIEW v_ai_insights_with_feedback AS
SELECT 
    ai.id,
    ai.user_id,
    u.email as user_email,
    fs.species_name as target_species,
    ai.generated_at,
    ai.recommendation_text,
    ai.confidence_score,
    ai.success_prediction,
    ai.user_rating,
    ai.user_feedback,
    ai.actual_result,
    CASE 
        WHEN ai.actual_result IS TRUE THEN 'Success'
        WHEN ai.actual_result IS FALSE THEN 'Failed'
        ELSE 'No Feedback'
    END as result_status
FROM ai_insights ai
JOIN users u ON ai.user_id = u.id
LEFT JOIN fish_species fs ON ai.target_species_id = fs.id
ORDER BY ai.generated_at DESC;

-- =====================================================================
-- SECTION 9: CREATE ANALYSIS FUNCTIONS
-- =====================================================================

-- Function to get user catch statistics
CREATE OR REPLACE FUNCTION get_user_catch_stats(user_uuid UUID)
RETURNS TABLE (
    total_catches INTEGER,
    unique_species INTEGER,
    avg_fish_length NUMERIC,
    avg_fish_weight NUMERIC,
    favorite_species VARCHAR,
    last_catch_date TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_catches,
        COUNT(DISTINCT species_id)::INTEGER as unique_species,
        ROUND(AVG(fish_length), 2) as avg_fish_length,
        ROUND(AVG(fish_weight), 2) as avg_fish_weight,
        (SELECT fs.species_name 
         FROM fish_catches fc2 
         JOIN fish_species fs ON fc2.species_id = fs.id 
         WHERE fc2.user_id = user_uuid 
         GROUP BY fs.species_name 
         ORDER BY COUNT(*) DESC 
         LIMIT 1) as favorite_species,
        MAX(catch_time) as last_catch_date
    FROM fish_catches fc
    WHERE fc.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to find best fishing conditions for a species
CREATE OR REPLACE FUNCTION get_best_conditions_for_species(species_name_param VARCHAR)
RETURNS TABLE (
    avg_air_temp NUMERIC,
    avg_water_temp NUMERIC,
    common_wind_direction VARCHAR,
    avg_wind_speed NUMERIC,
    best_moon_phase VARCHAR,
    success_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(AVG(ed.air_temperature), 1) as avg_air_temp,
        ROUND(AVG(ed.water_temperature), 1) as avg_water_temp,
        MODE() WITHIN GROUP (ORDER BY ed.wind_direction) as common_wind_direction,
        ROUND(AVG(ed.wind_speed), 1) as avg_wind_speed,
        MODE() WITHIN GROUP (ORDER BY ed.moon_phase) as best_moon_phase,
        COUNT(*)::INTEGER as success_count
    FROM fish_catches fc
    JOIN fish_species fs ON fc.species_id = fs.id
    LEFT JOIN environmental_data ed ON fc.environmental_data_id = ed.id
    WHERE fs.species_name = species_name_param
    AND ed.id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- =====================================================================
-- POST-EXECUTION VERIFICATION QUERIES
-- =====================================================================

-- Run these queries after executing the above script to verify changes:

/*
-- Check new user columns
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check new indexes
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Test new views
SELECT COUNT(*) FROM v_fish_catches_complete;
SELECT COUNT(*) FROM v_user_analytics_summary;
SELECT COUNT(*) FROM v_ai_insights_with_feedback;

-- Test analysis functions
SELECT * FROM get_user_catch_stats('36dd13ef-fc7f-4ee1-abd1-d470025eee81');
SELECT * FROM get_best_conditions_for_species('Musky');
*/