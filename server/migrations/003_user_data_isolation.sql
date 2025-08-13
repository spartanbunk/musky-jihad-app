-- Migration: User Data Isolation and Security
-- Purpose: Ensure complete user data isolation and prevent cross-user data leaks
-- Date: 2025-01-13

-- 1. Add missing indexes for user-specific queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_fish_catches_user_id ON fish_catches(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics(user_id);

-- 2. Add session tracking table for JWT tokens
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 3. Add row-level security policies (requires enabling RLS on tables)
-- Note: These are PostgreSQL-specific RLS policies

-- Enable Row Level Security on sensitive tables
ALTER TABLE fish_catches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for fish_catches
DROP POLICY IF EXISTS fish_catches_user_isolation ON fish_catches;
CREATE POLICY fish_catches_user_isolation ON fish_catches
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Create policies for ai_insights
DROP POLICY IF EXISTS ai_insights_user_isolation ON ai_insights;
CREATE POLICY ai_insights_user_isolation ON ai_insights
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Create policies for user_analytics
DROP POLICY IF EXISTS user_analytics_user_isolation ON user_analytics;
CREATE POLICY user_analytics_user_isolation ON user_analytics
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- 4. Add audit logging table for security events
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL, -- login_success, login_failure, unauthorized_access, data_access, etc
    event_details JSON,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at);

-- 5. Add user roles and permissions (for future expansion)
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSON DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add role column to users table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'role_id') THEN
        ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES user_roles(id) DEFAULT 1;
    END IF;
END $$;

-- Insert default roles
INSERT INTO user_roles (role_name, permissions) VALUES
    ('user', '{"can_log_catches": true, "can_view_own_data": true}'),
    ('premium', '{"can_log_catches": true, "can_view_own_data": true, "can_access_ai": true}'),
    ('admin', '{"can_log_catches": true, "can_view_own_data": true, "can_access_ai": true, "can_view_all_data": true}')
ON CONFLICT (role_name) DO NOTHING;

-- 6. Add constraints to ensure data integrity
-- Ensure user_id is never null in fish_catches
ALTER TABLE fish_catches ALTER COLUMN user_id SET NOT NULL;

-- 7. Create a view for safe user data access (without exposing sensitive fields)
CREATE OR REPLACE VIEW user_catches_view AS
SELECT 
    fc.id,
    fc.species_id,
    fs.species_name,
    fs.icon_emoji,
    fs.map_color,
    fc.fish_length,
    fc.fish_weight,
    fc.catch_time,
    fc.latitude,
    fc.longitude,
    fc.depth_feet,
    fc.location_notes,
    fc.lure_type,
    fc.environmental_conditions,
    fc.photo_url,
    fc.user_id
FROM fish_catches fc
JOIN fish_species fs ON fc.species_id = fs.id;

-- 8. Function to safely get user's catches (with built-in filtering)
CREATE OR REPLACE FUNCTION get_user_catches(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    species_name VARCHAR,
    fish_length DECIMAL,
    fish_weight DECIMAL,
    catch_time TIMESTAMP,
    latitude DECIMAL,
    longitude DECIMAL,
    depth_feet INTEGER,
    lure_type VARCHAR,
    environmental_conditions JSON,
    photo_url VARCHAR,
    location_notes TEXT,
    icon_emoji VARCHAR,
    map_color VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fc.id,
        fs.species_name,
        fc.fish_length,
        fc.fish_weight,
        fc.catch_time,
        fc.latitude,
        fc.longitude,
        fc.depth_feet,
        fc.lure_type,
        fc.environmental_conditions,
        fc.photo_url,
        fc.location_notes,
        fs.icon_emoji,
        fs.map_color
    FROM fish_catches fc
    JOIN fish_species fs ON fc.species_id = fs.id
    WHERE fc.user_id = p_user_id
    ORDER BY fc.catch_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to fish_catches if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_fish_catches_updated_at') THEN
        CREATE TRIGGER update_fish_catches_updated_at
            BEFORE UPDATE ON fish_catches
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Apply trigger to users if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 10. Clean up any test data that shouldn't be in production
-- Remove hardcoded test user (only in production)
-- This is commented out for safety - uncomment when ready to deploy to production
-- DELETE FROM users WHERE email = 'test@fishing.com';
-- DELETE FROM users WHERE email = 'dev@fishing.com';

-- Migration complete
-- Note: After running this migration, ensure all API endpoints use proper authentication
-- and include user_id filtering in all queries