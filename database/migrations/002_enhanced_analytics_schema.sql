-- ============================================
-- Enhanced Database Schema for Student Analytics
-- New tables for analytics, predictions, and recommendations
-- Date: 2026-01-07
-- ============================================

USE student_data_mining;

-- ============================================
-- 1. STUDENT ANALYTICS CACHE TABLE
-- Pre-computed metrics for fast dashboard loading
-- ============================================
CREATE TABLE IF NOT EXISTS student_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    semester INT NOT NULL,
    
    -- Performance Metrics
    current_gpa DECIMAL(3,2),
    semester_gpa DECIMAL(3,2),
    cumulative_gpa DECIMAL(3,2),
    credits_completed INT DEFAULT 0,
    credits_registered INT DEFAULT 0,
    
    -- Attendance
    attendance_percentage DECIMAL(5,2),
    classes_attended INT DEFAULT 0,
    classes_total INT DEFAULT 0,
    
    -- Performance Tier
    performance_tier ENUM('excellent', 'good', 'average', 'below_average', 'at_risk') DEFAULT 'average',
    percentile_rank DECIMAL(5,2),
    
    -- Timestamps
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_semester (student_id, semester),
    INDEX idx_performance_tier (performance_tier),
    INDEX idx_semester (semester)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 2. PROGRAM ANALYTICS TABLE
-- Program-level statistics and trends
-- ============================================
CREATE TABLE IF NOT EXISTS program_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    program_id INT NOT NULL,
    semester INT NOT NULL,
    
    -- Enrollment Stats
    total_students INT DEFAULT 0,
    active_students INT DEFAULT 0,
    
    -- Performance Stats
    average_gpa DECIMAL(3,2),
    median_gpa DECIMAL(3,2),
    pass_rate DECIMAL(5,2),
    fail_rate DECIMAL(5,2),
    dropout_rate DECIMAL(5,2),
    
    -- Distribution
    excellent_count INT DEFAULT 0,
    good_count INT DEFAULT 0,
    average_count INT DEFAULT 0,
    below_average_count INT DEFAULT 0,
    at_risk_count INT DEFAULT 0,
    
    -- Timestamps
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_program_semester (program_id, semester),
    INDEX idx_semester (semester)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 3. SUBJECT ANALYTICS TABLE
-- Subject-level difficulty and performance analysis
-- ============================================
CREATE TABLE IF NOT EXISTS subject_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    semester INT NOT NULL,
    
    -- Enrollment
    enrolled_students INT DEFAULT 0,
    
    -- Performance
    average_grade DECIMAL(5,2),
    median_grade DECIMAL(5,2),
    pass_rate DECIMAL(5,2),
    fail_rate DECIMAL(5,2),
    
    -- Difficulty Indicator
    difficulty_level ENUM('easy', 'moderate', 'hard', 'very_hard') DEFAULT 'moderate',
    
    -- Grade Distribution
    grade_a_count INT DEFAULT 0,
    grade_b_count INT DEFAULT 0,
    grade_c_count INT DEFAULT 0,
    grade_d_count INT DEFAULT 0,
    grade_f_count INT DEFAULT 0,
    
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_subject_semester (subject_id, semester),
    INDEX idx_difficulty (difficulty_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 4. PREDICTIONS TABLE
-- Store calculated predictions for students
-- ============================================
CREATE TABLE IF NOT EXISTS predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    prediction_type ENUM('final_gpa', 'subject_grade', 'dropout_risk', 'graduation_time') NOT NULL,
    
    -- Prediction Details
    predicted_value VARCHAR(50),
    confidence_score DECIMAL(5,2),
    
    -- Context
    subject_id INT NULL,
    semester INT NOT NULL,
    
    -- Calculation Method
    method VARCHAR(100), -- e.g., 'linear_regression', 'trend_analysis', 'weighted_average'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    INDEX idx_student_type (student_id, prediction_type),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 5. RECOMMENDATIONS TABLE
-- Generated recommendations for students
-- ============================================
CREATE TABLE IF NOT EXISTS recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    recommendation_type ENUM('study_focus', 'time_management', 'course_selection', 'improvement_area', 'positive_feedback') NOT NULL,
    
    -- Recommendation Content
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
    
    -- Context
    subject_id INT NULL,
    related_metric VARCHAR(100), -- e.g., 'low_attendance', 'declining_grades'
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    INDEX idx_student_active (student_id, is_dismissed),
    INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 6. GRADE HISTORY TABLE (Audit Trail)
-- Track all grade changes for transparency
-- ============================================
CREATE TABLE IF NOT EXISTS grade_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grade_id INT NOT NULL,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    
    -- Previous & New Values
    old_grade DECIMAL(5,2),
    new_grade DECIMAL(5,2),
    old_letter_grade VARCHAR(5),
    new_letter_grade VARCHAR(5),
    
    -- Who made the change
    changed_by INT NOT NULL,
    change_reason TEXT,
    
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (changed_by) REFERENCES users(id),
    INDEX idx_grade (grade_id),
    INDEX idx_student (student_id),
    INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 7. BULK IMPORT LOG TABLE
-- Track data import operations
-- ============================================
CREATE TABLE IF NOT EXISTS import_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Import Details
    import_type ENUM('grades', 'attendance', 'students', 'enrollments') NOT NULL,
    filename VARCHAR(255),
    
    -- Results
    total_rows INT DEFAULT 0,
    successful_rows INT DEFAULT 0,
    failed_rows INT DEFAULT 0,
    error_log TEXT,
    
    -- Who imported
    imported_by INT NOT NULL,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (imported_by) REFERENCES users(id),
    INDEX idx_import_type (import_type),
    INDEX idx_imported_at (imported_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Insert some sample data for testing
-- ============================================

-- Sample student analytics (calculated for existing students)
INSERT IGNORE INTO student_analytics (student_id, semester, current_gpa, cumulative_gpa, performance_tier)
SELECT id, current_semester, 3.5, 3.5, 'good'
FROM users WHERE role = 'student' AND current_semester IS NOT NULL;

SELECT 'Enhanced schema created successfully!' as Status;
