-- Lake St. Clair Musky App Database Schema
-- PostgreSQL initialization script

-- Create database if not exists (handled by Docker environment)
-- Database name: fishing_intelligence

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Catches table
CREATE TABLE IF NOT EXISTS catches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    species VARCHAR(50) NOT NULL,
    length DECIMAL(5,2),
    weight DECIMAL(5,2),
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    depth DECIMAL(5,2),
    lure_type VARCHAR(100),
    catch_time TIMESTAMP NOT NULL,
    location_notes TEXT,
    photo_url TEXT,
    conditions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Environmental conditions table
CREATE TABLE IF NOT EXISTS environmental_conditions (
    id SERIAL PRIMARY KEY,
    catch_id INTEGER REFERENCES catches(id),
    wind_speed DECIMAL(5,2),
    wind_direction VARCHAR(10),
    air_temperature DECIMAL(5,2),
    water_temperature DECIMAL(5,2),
    barometric_pressure DECIMAL(5,2),
    moon_phase VARCHAR(50),
    cloud_cover INTEGER,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_catches_user_id ON catches(user_id);
CREATE INDEX IF NOT EXISTS idx_catches_species ON catches(species);
CREATE INDEX IF NOT EXISTS idx_catches_catch_time ON catches(catch_time);
CREATE INDEX IF NOT EXISTS idx_catches_location ON catches(latitude, longitude);

-- Insert test user for development
INSERT INTO users (email, username) 
VALUES ('test@example.com', 'TestUser')
ON CONFLICT (email) DO NOTHING;

-- Grant permissions (if needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;