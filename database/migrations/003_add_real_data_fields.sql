-- Schema Updates for Real Student Data Import
-- Adds fields from Excel file that are missing in current schema

USE student_data_mining;

-- Add missing fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS batch VARCHAR(10) AFTER student_id,
ADD COLUMN IF NOT EXISTS class VARCHAR(10) AFTER batch,
ADD COLUMN IF NOT EXISTS coordinator VARCHAR(255) AFTER class,
ADD COLUMN IF NOT EXISTS mobile_primary VARCHAR(15) AFTER coordinator,
ADD COLUMN IF NOT EXISTS mobile_secondary VARCHAR(15) AFTER mobile_primary;

-- Create attendance table if not exists
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add enrollment_year to users if not exists
ALTER TABLE users
ADD COLUMN IF NOT EXISTS enrollment_year INT AFTER student_id;

-- Add current_semester to users if not exists  
ALTER TABLE users
ADD COLUMN IF NOT EXISTS current_semester INT DEFAULT 1 AFTER enrollment_year;

-- Ensure subjects table has proper structure
CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    credits INT DEFAULT 3,
    semester INT DEFAULT 1,
    subject_type ENUM('Core', 'Elective', 'Lab', 'Project') DEFAULT 'Core',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_semester (semester),
    INDEX idx_type (subject_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert 5th semester subjects if they don't exist
INSERT IGNORE INTO subjects (code, name, semester, subject_type, credits) VALUES
('CPT', 'Core Programming Techniques', 5, 'Core', 4),
('NS', 'Network Security', 5, 'Core', 4),
('PHP-CGM', 'PHP with Computer Graphics', 5, 'Core', 4),
('JAVA', 'Java Programming', 5, 'Core', 4),
('PYTHON', 'Python Programming', 5, 'Core', 4),
('PRO', 'Project', 5, 'Project', 6),
('INE', 'Internet Engineering', 5, 'Core', 4);

-- Ensure programs table exists
CREATE TABLE IF NOT EXISTS programs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    duration_years INT DEFAULT 4,
    total_semesters INT DEFAULT 8,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default program if not exists
INSERT IGNORE INTO programs (code, name, duration_years, total_semesters) VALUES
('BCA', 'Bachelor of Computer Applications', 3, 6),
('MCA', 'Master of Computer Applications', 2, 4);

-- Add program_id to users if not exists
ALTER TABLE users
ADD COLUMN IF NOT EXISTS program_id INT AFTER student_id,
ADD FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL;

SELECT 'Schema updates completed successfully' as status;
