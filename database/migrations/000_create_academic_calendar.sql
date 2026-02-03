-- ============================================
-- Create Academic Calendar Table (Pre-Req)
-- Needed before 004_update_calendar_enum.sql
-- ============================================

USE student_data_mining;

CREATE TABLE IF NOT EXISTS academic_calendar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'event',
    description TEXT DEFAULT NULL,
    target_audience VARCHAR(50) NOT NULL DEFAULT 'all',
    target_dept_id INT DEFAULT NULL,
    target_program_id INT DEFAULT NULL,
    target_semester INT DEFAULT NULL,
    target_subject_id INT DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_event_date (event_date),
    INDEX idx_audience (target_audience)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

