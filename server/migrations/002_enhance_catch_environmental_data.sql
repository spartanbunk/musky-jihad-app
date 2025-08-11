-- Migration to ensure fish_catches table can handle comprehensive environmental data
-- The existing environmental_conditions JSON field should handle all our data,
-- but let's add some helpful indexes and ensure data integrity

-- Add index for better performance on environmental condition queries
CREATE INDEX IF NOT EXISTS idx_fish_catches_environmental_conditions 
ON fish_catches USING GIN (environmental_conditions);

-- Add index for catch time to improve recent catches queries
CREATE INDEX IF NOT EXISTS idx_fish_catches_catch_time_desc 
ON fish_catches (catch_time DESC);

-- Add index for user catches with catch time for dashboard queries
CREATE INDEX IF NOT EXISTS idx_fish_catches_user_catch_time 
ON fish_catches (user_id, catch_time DESC);

-- Update the updated_at timestamp trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for fish_catches table
DROP TRIGGER IF EXISTS update_fish_catches_updated_at ON fish_catches;
CREATE TRIGGER update_fish_catches_updated_at 
    BEFORE UPDATE ON fish_catches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add some helpful comments to document the environmental_conditions JSON structure
COMMENT ON COLUMN fish_catches.environmental_conditions IS 
'JSON field containing comprehensive environmental data at catch time:
{
  "windSpeed": number,
  "windDirection": string,
  "airTemperature": number,
  "barometricPressure": number,
  "waterTemp": number,
  "waterTempRange": number,
  "warmestWaterTemp": number,
  "coldestWaterTemp": number,
  "waveHeight": number,
  "cloudCover": number,
  "humidity": number,
  "moonPhase": string,
  "moonIllumination": number,
  "moonOptimal": boolean,
  "sunrise": string,
  "sunset": string,
  "moonrise": string,
  "moonset": string,
  "dataSource": string,
  "dataQuality": object,
  "capturedAt": string (ISO timestamp)
}';

-- Ensure we have proper constraints
ALTER TABLE fish_catches 
ADD CONSTRAINT check_fish_length_positive 
CHECK (fish_length > 0);

ALTER TABLE fish_catches 
ADD CONSTRAINT check_fish_weight_positive 
CHECK (fish_weight > 0);

-- Add constraint for reasonable latitude/longitude values (Lake St. Clair area)
ALTER TABLE fish_catches 
ADD CONSTRAINT check_latitude_lake_st_clair 
CHECK (latitude BETWEEN 42.0 AND 43.0);

ALTER TABLE fish_catches 
ADD CONSTRAINT check_longitude_lake_st_clair 
CHECK (longitude BETWEEN -83.5 AND -82.0);