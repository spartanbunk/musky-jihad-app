-- Migration: Add missing columns to users table
-- Date: 2025-01-13

-- Add trial_end_date column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP;

-- Add role_id column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES user_roles(id) DEFAULT 1;

-- Add bluegill to fish_species if missing
INSERT INTO fish_species (species_name, scientific_name, preferred_depth_min, preferred_depth_max, preferred_temp_min, preferred_temp_max, map_color, icon_emoji, seasonal_patterns, habitat_preferences) 
VALUES (
    'bluegill', 
    'Lepomis macrochirus', 
    3, 
    15, 
    70, 
    85, 
    '#3b82f6', 
    '🐟',
    '{"spring": "shallow spawning beds", "summer": "weed beds and docks", "fall": "deeper water", "winter": "deep holes"}',
    '{"structure": "weed beds, docks, fallen trees", "cover": "heavy vegetation", "bottom": "sand, mud, gravel"}'
)
ON CONFLICT (species_name) DO NOTHING;

-- Add crappie to fish_species if missing
INSERT INTO fish_species (species_name, scientific_name, preferred_depth_min, preferred_depth_max, preferred_temp_min, preferred_temp_max, map_color, icon_emoji, seasonal_patterns, habitat_preferences)
VALUES (
    'crappie',
    'Pomoxis spp.',
    5,
    20,
    65,
    75,
    '#8b5cf6',
    '🐠',
    '{"spring": "shallow spawning areas", "summer": "suspended over structure", "fall": "schools in deeper water", "winter": "deep brush piles"}',
    '{"structure": "brush piles, docks, submerged timber", "cover": "wood structure", "bottom": "any with structure"}'
)
ON CONFLICT (species_name) DO NOTHING;