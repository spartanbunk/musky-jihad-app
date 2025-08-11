-- Migration: Add daily_fishing_reports table for token-efficient report caching
-- Date: 2025-08-11
-- Purpose: Store daily fishing reports to minimize Perplexity API calls

-- Daily Fishing Reports table for 24-hour caching
CREATE TABLE daily_fishing_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_date DATE NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(50) DEFAULT 'perplexity-ai',
    location VARCHAR(100) DEFAULT 'Lake St. Clair, MI',
    cache_status VARCHAR(20) DEFAULT 'fresh',
    token_count INTEGER DEFAULT 0,
    generation_duration_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient date-based lookups
CREATE INDEX idx_daily_reports_date ON daily_fishing_reports(report_date);

-- Index for cache management
CREATE INDEX idx_daily_reports_generated_at ON daily_fishing_reports(generated_at);

-- Comment for documentation
COMMENT ON TABLE daily_fishing_reports IS 'Stores daily fishing reports with 24-hour caching to minimize API token usage';
COMMENT ON COLUMN daily_fishing_reports.report_date IS 'Date for which this report is valid (YYYY-MM-DD)';
COMMENT ON COLUMN daily_fishing_reports.content IS 'Full fishing report content from Perplexity AI';
COMMENT ON COLUMN daily_fishing_reports.cache_status IS 'Status: fresh, cached, stale, error';
COMMENT ON COLUMN daily_fishing_reports.token_count IS 'Number of tokens used to generate this report';