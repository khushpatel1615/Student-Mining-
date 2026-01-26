-- ============================================
-- StudentDataMining - Complete Database Schema
-- Single Source of Truth for Fresh Installations
-- ============================================
-- This file contains ALL required tables for the system to function.
-- Run this ONCE on a fresh database, then run migrations for updates.
-- ============================================

CREATE DATABASE IF NOT EXISTS student_data_mining CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE student_data_mining;

-- ============================================
-- CORE TABLES
-- ============================================

-- Programs (Academic Programs)
CREATE TABLE IF NOT EXISTS programs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    duration_years INT DEFAULT 3,
    total_semesters INT DEFAULT 6,
    description TEXT DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_code (code),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users (Students, Teachers, Admins)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    student_id VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255) DEFAULT NULL,
    google_id VARCHAR(255) DEFAULT NULL,
    full_name VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin', 'teacher') NOT NULL DEFAULT 'student',
    avatar_url VARCHAR(500) DEFAULT NULL,
    
    -- Extended Profile Fields
    program_id INT DEFAULT NULL,
    current_semester INT DEFAULT 1,
    enrollment_year YEAR DEFAULT NULL,
    batch VARCHAR(10) DEFAULT NULL,
    class VARCHAR(10) DEFAULT NULL,
    coordinator VARCHAR(255) DEFAULT NULL,
    mobile_primary VARCHAR(15) DEFAULT NULL,
    mobile_secondary VARCHAR(15) DEFAULT NULL,
    
    -- Timestamps & Status
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_student_id (student_id),
    INDEX idx_google_id (google_id),
    INDEX idx_role (role),
    INDEX idx_program_semester (program_id, current_semester)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Sessions (JWT Token Management)
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token_hash),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subjects (Courses)
CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    program_id INT NOT NULL,
    semester INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL,
    subject_type ENUM('Open', 'Core', 'Elective', 'Lab', 'Project') DEFAULT 'Open',
    credits INT DEFAULT 3,
    description TEXT DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_subject (program_id, semester, code),
    INDEX idx_program_semester (program_id, semester),
    INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Evaluation Criteria (Grading Components per Subject)
CREATE TABLE IF NOT EXISTS evaluation_criteria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    component_name VARCHAR(50) NOT NULL,
    weight_percentage DECIMAL(5,2) NOT NULL,
    max_marks INT DEFAULT 100,
    description VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_criteria (subject_id, component_name),
    INDEX idx_subject (subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Student Enrollments
CREATE TABLE IF NOT EXISTS student_enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject_id INT NOT NULL,
    academic_year VARCHAR(20) DEFAULT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'completed', 'dropped', 'failed') DEFAULT 'active',
    final_grade VARCHAR(5) DEFAULT NULL,
    final_percentage DECIMAL(5,2) DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (user_id, subject_id, academic_year),
    INDEX idx_user (user_id),
    INDEX idx_subject (subject_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Student Grades (Per Evaluation Component)
CREATE TABLE IF NOT EXISTS student_grades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT NOT NULL,
    criteria_id INT NOT NULL,
    marks_obtained DECIMAL(5,2) DEFAULT NULL,
    remarks VARCHAR(255) DEFAULT NULL,
    graded_by INT DEFAULT NULL,
    graded_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE,
    FOREIGN KEY (criteria_id) REFERENCES evaluation_criteria(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_grade (enrollment_id, criteria_id),
    INDEX idx_enrollment (enrollment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attendance (Detailed Tracking)
CREATE TABLE IF NOT EXISTS student_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('present', 'absent', 'late', 'excused') DEFAULT 'present',
    remarks VARCHAR(255) DEFAULT NULL,
    marked_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_attendance (enrollment_id, attendance_date),
    INDEX idx_enrollment (enrollment_id),
    INDEX idx_date (attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alternative Attendance Table (Legacy - for CSV imports)
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    session_type ENUM('lecture', 'practical') NOT NULL,
    status ENUM('present', 'absent', 'late') NOT NULL DEFAULT 'present',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_attendance (student_id, subject_id, attendance_date, session_type),
    INDEX idx_student (student_id),
    INDEX idx_subject (subject_id),
    INDEX idx_date (attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ASSIGNMENT SYSTEM
-- ============================================

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    teacher_id INT DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    due_date DATETIME NOT NULL,
    total_points INT DEFAULT 100,
    status ENUM('draft', 'published', 'archived') DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_subject (subject_id),
    INDEX idx_due_date (due_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Assignment Submissions
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    student_id INT NOT NULL,
    submission_text TEXT DEFAULT NULL,
    file_path VARCHAR(500) DEFAULT NULL,
    file_name VARCHAR(255) DEFAULT NULL,
    file_size INT DEFAULT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('submitted', 'graded', 'late') DEFAULT 'submitted',
    marks_obtained DECIMAL(5,2) DEFAULT NULL,
    feedback TEXT DEFAULT NULL,
    graded_at TIMESTAMP NULL,
    graded_by INT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_submission (assignment_id, student_id),
    INDEX idx_assignment (assignment_id),
    INDEX idx_student (student_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ANALYTICS & PREDICTIONS
-- ============================================

-- Student Analytics (Pre-computed Metrics)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Program Analytics
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subject Analytics
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Predictions
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
    method VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    INDEX idx_student_type (student_id, prediction_type),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recommendations
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
    related_metric VARCHAR(100),
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    INDEX idx_student_active (student_id, is_dismissed),
    INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- AUDIT & LOGGING
-- ============================================

-- Grade History (Audit Trail)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Import Logs
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ADDITIONAL FEATURES (Calendar, Discussions, etc.)
-- ============================================

-- Calendar Events (if migrations add this)
CREATE TABLE IF NOT EXISTS calendar_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type ENUM('exam', 'assignment', 'holiday', 'meeting', 'other') DEFAULT 'other',
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_dates (start_date, end_date),
    INDEX idx_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Discussions/Forums (if migrations add this)
CREATE TABLE IF NOT EXISTS discussions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT DEFAULT NULL,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    parent_id INT DEFAULT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES discussions(id) ON DELETE CASCADE,
    INDEX idx_subject (subject_id),
    INDEX idx_parent (parent_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert Default Programs
INSERT INTO programs (name, code, duration_years, total_semesters, description) VALUES
('Diploma in Computer Engineering', 'DCE', 3, 6, 'Diploma program in Computer Engineering from Ganpat University')
ON DUPLICATE KEY UPDATE name=name;

-- Insert Default Users
-- Password for both: 'password123' (hashed with PHP password_hash)
INSERT INTO users (email, student_id, password_hash, full_name, role) VALUES
('admin@college.edu', 'ADMIN001', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin'),
('student@college.edu', 'STU001', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John Doe', 'student'),
('teacher@college.edu', 'TEACH001', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane Smith', 'teacher')
ON DUPLICATE KEY UPDATE email=email;

-- ============================================
-- VIEWS (Optional - for convenience)
-- ============================================

CREATE OR REPLACE VIEW vw_student_performance AS
SELECT 
    u.id AS user_id,
    u.full_name,
    u.student_id,
    p.name AS program_name,
    p.code AS program_code,
    s.semester,
    s.name AS subject_name,
    s.code AS subject_code,
    s.credits,
    se.status AS enrollment_status,
    se.final_percentage,
    se.final_grade,
    (
        SELECT ROUND(
            (COUNT(CASE WHEN sa.status = 'present' THEN 1 END) * 100.0) / 
            NULLIF(COUNT(*), 0), 2
        )
        FROM student_attendance sa 
        WHERE sa.enrollment_id = se.id
    ) AS attendance_percentage
FROM users u
JOIN programs p ON u.program_id = p.id
JOIN student_enrollments se ON u.id = se.user_id
JOIN subjects s ON se.subject_id = s.id
WHERE u.role = 'student';

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

SELECT 'Complete schema created successfully! Run migrations next.' AS Status;
