-- WeightCha Database Initialization
-- This script creates the necessary tables for the WeightCha API

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verification attempts table
CREATE TABLE IF NOT EXISTS verification_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    pressure_data JSONB,
    motion_data JSONB,
    device_info JSONB,
    detection_method VARCHAR(50),
    confidence_score DECIMAL(5,4),
    is_human BOOLEAN NOT NULL DEFAULT false,
    verification_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour'),
    used_at TIMESTAMP WITH TIME ZONE
);

-- Verification sessions table
CREATE TABLE IF NOT EXISTS verification_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_data JSONB NOT NULL,
    expected_pattern JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes'),
    completed_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT
);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    limit_type VARCHAR(50) NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour'),
    UNIQUE(identifier, limit_type)
);

-- Analytics table for tracking verification patterns
CREATE TABLE IF NOT EXISTS verification_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    detection_method VARCHAR(50),
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    avg_confidence DECIMAL(5,4),
    unique_sessions INTEGER NOT NULL DEFAULT 0,
    device_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_verification_attempts_session_id ON verification_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_ip_address ON verification_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_created_at ON verification_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_token ON verification_attempts(verification_token);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_expires_at ON verification_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, limit_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON rate_limits(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_analytics_date ON verification_analytics(date);

-- Function to clean up expired records
CREATE OR REPLACE FUNCTION cleanup_expired_records()
RETURNS void AS $$
BEGIN
    -- Clean up expired verification attempts
    DELETE FROM verification_attempts 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Clean up expired verification sessions
    DELETE FROM verification_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Clean up expired rate limits
    DELETE FROM rate_limits 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Update analytics summary
    INSERT INTO verification_analytics (
        date, detection_method, success_count, failure_count, 
        avg_confidence, unique_sessions, device_type
    )
    SELECT 
        CURRENT_DATE,
        detection_method,
        COUNT(CASE WHEN is_human = true THEN 1 END) as success_count,
        COUNT(CASE WHEN is_human = false THEN 1 END) as failure_count,
        AVG(confidence_score) as avg_confidence,
        COUNT(DISTINCT session_id) as unique_sessions,
        device_info->>'type' as device_type
    FROM verification_attempts 
    WHERE created_at >= CURRENT_DATE 
    AND created_at < CURRENT_DATE + INTERVAL '1 day'
    GROUP BY detection_method, device_info->>'type'
    ON CONFLICT (date, detection_method, device_type) 
    DO UPDATE SET
        success_count = EXCLUDED.success_count,
        failure_count = EXCLUDED.failure_count,
        avg_confidence = EXCLUDED.avg_confidence,
        unique_sessions = EXCLUDED.unique_sessions,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (requires pg_cron extension in production)
-- SELECT cron.schedule('cleanup-weightcha', '0 0 * * *', 'SELECT cleanup_expired_records();');

COMMIT;
