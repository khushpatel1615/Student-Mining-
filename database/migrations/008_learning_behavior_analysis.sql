-- ============================================================================
-- LEARNING BEHAVIOR ANALYSIS - DATABASE MIGRATIONS
-- Migration: 008_learning_behavior_analysis.sql
-- Date: 2026-02-05
-- Description: Adds tables for learning behavior tracking, behavior patterns,
--              and intervention management.
-- ============================================================================

USE student_data_mining;

-- TABLE 1: LEARNING SESSIONS
-- Tracks individual learning session data including login time, content type,
-- duration, and engagement metrics.

CREATE TABLE IF NOT EXISTS learning_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject_id INT DEFAULT NULL,
    content_type ENUM('video', 'reading', 'assignment', 'quiz', 'discussion', 'page_view', 'other') NOT NULL,
    content_id INT DEFAULT NULL,
    content_title VARCHAR(255) DEFAULT NULL,
    session_start TIMESTAMP NOT NULL,
    session_end TIMESTAMP NULL,
    duration_seconds INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT 0,
    interaction_count INT DEFAULT 0,
    metadata JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    
    INDEX idx_user_date (user_id, session_start),
    INDEX idx_content (content_type, content_id),
    INDEX idx_user_subject (user_id, subject_id),
    INDEX idx_session_duration (user_id, duration_seconds),
    INDEX idx_completed (is_completed, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLE 2: BEHAVIOR PATTERNS
-- Pre-computed weekly summaries of student behavior

CREATE TABLE IF NOT EXISTS behavior_patterns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    week_start DATE NOT NULL,
    
    -- Activity Metrics
    total_logins INT DEFAULT 0,
    total_session_duration_minutes INT DEFAULT 0,
    avg_session_duration_minutes DECIMAL(8,2) DEFAULT 0,
    max_session_duration_minutes INT DEFAULT 0,
    
    -- Content Engagement
    video_sessions INT DEFAULT 0,
    video_completion_rate DECIMAL(5,2) DEFAULT 0,
    assignment_sessions INT DEFAULT 0,
    assignment_completion_rate DECIMAL(5,2) DEFAULT 0,
    quiz_attempts INT DEFAULT 0,
    quiz_avg_score DECIMAL(5,2) DEFAULT 0,
    discussion_posts INT DEFAULT 0,
    
    -- Time Distribution (percentages)
    morning_activity_pct DECIMAL(5,2) DEFAULT 0,
    afternoon_activity_pct DECIMAL(5,2) DEFAULT 0,
    evening_activity_pct DECIMAL(5,2) DEFAULT 0,
    night_activity_pct DECIMAL(5,2) DEFAULT 0,
    
    -- Engagement Scores (0-100)
    video_engagement_score DECIMAL(5,2) DEFAULT 0,
    assignment_engagement_score DECIMAL(5,2) DEFAULT 0,
    discussion_engagement_score DECIMAL(5,2) DEFAULT 0,
    overall_engagement_score DECIMAL(5,2) DEFAULT 0,
    
    -- Study Patterns
    study_consistency_score DECIMAL(5,2) DEFAULT 0,
    preferred_study_time ENUM('morning', 'afternoon', 'evening', 'night', 'varied') DEFAULT 'varied',
    days_active INT DEFAULT 0,
    
    -- Academic Metrics
    days_attended INT DEFAULT 0,
    assignments_submitted INT DEFAULT 0,
    assignments_on_time INT DEFAULT 0,
    on_time_submission_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Grade Tracking
    avg_grade_this_week DECIMAL(5,2) DEFAULT NULL,
    grade_trend VARCHAR(20) DEFAULT NULL,
    
    -- Risk Assessment
    is_at_risk BOOLEAN DEFAULT 0,
    risk_level ENUM('safe', 'warning', 'at_risk', 'critical') DEFAULT 'safe',
    risk_score DECIMAL(5,2) DEFAULT 0,
    risk_factors JSON DEFAULT NULL,
    
    -- Timestamps
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_week (user_id, week_start),
    
    INDEX idx_week (week_start),
    INDEX idx_risk (risk_level),
    INDEX idx_user_risk (user_id, risk_level),
    INDEX idx_engagement (overall_engagement_score),
    INDEX idx_days_active (days_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLE 3: INTERVENTIONS
-- Formal tracking of interventions taken for at-risk or struggling students

CREATE TABLE IF NOT EXISTS interventions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    created_by INT NOT NULL,
    
    -- Intervention Details
    intervention_type ENUM(
        'email', 'message', 'meeting', 'call', 'warning',
        'support_referral', 'grade_recovery', 'schedule_change', 'other'
    ) NOT NULL,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    notes TEXT,
    
    -- Status & Outcome
    status ENUM('pending', 'in_progress', 'successful', 'unsuccessful', 'closed') DEFAULT 'pending',
    outcome_description TEXT,
    
    -- Follow-up
    effectiveness_rating INT DEFAULT NULL,
    follow_up_date DATE DEFAULT NULL,
    follow_up_required BOOLEAN DEFAULT 0,
    
    -- Risk Context
    triggered_by_risk_score DECIMAL(5,2) DEFAULT NULL,
    risk_factors_identified JSON DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_student (student_id),
    INDEX idx_creator (created_by),
    INDEX idx_status (status),
    INDEX idx_type (intervention_type),
    INDEX idx_created (created_at),
    INDEX idx_follow_up (follow_up_date),
    INDEX idx_student_status (student_id, status),
    INDEX idx_open_interventions (status, follow_up_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- EXTEND EMAIL PREFERENCES (if columns don't exist)
-- Note: Using separate ALTER statements for compatibility

ALTER TABLE email_preferences
ADD COLUMN behavior_insights BOOLEAN DEFAULT 1;

ALTER TABLE email_preferences
ADD COLUMN weekly_summary BOOLEAN DEFAULT 0;

ALTER TABLE email_preferences
ADD COLUMN intervention_notifications BOOLEAN DEFAULT 1;

ALTER TABLE email_preferences
ADD COLUMN digest_frequency ENUM('daily', 'weekly', 'monthly') DEFAULT 'weekly';

-- HELPER VIEWS

-- View: Current Week Behavior Summary
CREATE OR REPLACE VIEW vw_current_week_behavior AS
SELECT 
    bp.*,
    u.full_name as student_name,
    u.email as student_email,
    u.is_active as enrollment_status
FROM behavior_patterns bp
JOIN users u ON bp.user_id = u.id
WHERE bp.week_start = (SELECT MAX(week_start) FROM behavior_patterns)
ORDER BY bp.risk_level DESC, bp.overall_engagement_score ASC;

-- View: At-Risk Students with Intervention Status
CREATE OR REPLACE VIEW vw_at_risk_students AS
SELECT 
    u.id,
    u.full_name as name,
    u.email,
    u.student_id,
    bp.risk_level,
    bp.risk_score,
    bp.overall_engagement_score,
    bp.on_time_submission_rate,
    bp.grade_trend,
    bp.week_start,
    COUNT(DISTINCT CASE WHEN i.status IN ('pending', 'in_progress') THEN i.id END) as pending_interventions,
    MAX(i.created_at) as last_intervention_date
FROM users u
JOIN behavior_patterns bp ON u.id = bp.user_id
LEFT JOIN interventions i ON u.id = i.student_id
WHERE bp.risk_level IN ('warning', 'at_risk', 'critical')
    AND bp.week_start = (SELECT MAX(week_start) FROM behavior_patterns)
    AND u.role = 'student'
    AND u.is_active = 1
GROUP BY u.id, bp.id
ORDER BY bp.risk_score DESC;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
SELECT 'Learning Behavior Analysis migration completed successfully!' AS Status;
