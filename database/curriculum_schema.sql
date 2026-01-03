-- ============================================
-- StudentDataMining - Curriculum Schema
-- Ganpat University Diploma in Computer Engineering
-- ============================================

USE student_data_mining;

-- =============================================
-- PROGRAMS TABLE
-- =============================================
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

-- =============================================
-- SUBJECTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    program_id INT NOT NULL,
    semester INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL,
    subject_type ENUM('Open', 'Core', 'Elective') DEFAULT 'Open',
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

-- =============================================
-- EVALUATION CRITERIA TABLE (Dynamic weights per subject)
-- =============================================
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

-- =============================================
-- STUDENT ENROLLMENTS TABLE
-- =============================================
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

-- =============================================
-- STUDENT GRADES TABLE (Per evaluation component)
-- =============================================
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

-- =============================================
-- ATTENDANCE TABLE (Separate for detailed tracking)
-- =============================================
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

-- =============================================
-- UPDATE USERS TABLE (Add program and semester fields)
-- =============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS program_id INT DEFAULT NULL AFTER role,
ADD COLUMN IF NOT EXISTS current_semester INT DEFAULT 1 AFTER program_id,
ADD COLUMN IF NOT EXISTS enrollment_year YEAR DEFAULT NULL AFTER current_semester;

-- Add foreign key if not exists (wrapped in procedure for safety)
-- Note: Run this separately if needed
-- ALTER TABLE users ADD FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL;

-- =============================================
-- INSERT PROGRAM DATA
-- =============================================
INSERT INTO programs (name, code, duration_years, total_semesters, description) VALUES
('Diploma in Computer Engineering', 'DCE', 3, 6, 'Diploma program in Computer Engineering from Ganpat University');

-- =============================================
-- INSERT SEMESTER 1 SUBJECTS
-- =============================================
INSERT INTO subjects (program_id, semester, name, code, subject_type, credits) VALUES
(1, 1, 'Mathematics-I', '1BS1101', 'Open', 2),
(1, 1, 'Programming in C', '1ES1108', 'Core', 5),
(1, 1, 'Communication Skills in English', '1HS1101', 'Open', 3),
(1, 1, 'Applied Chemistry', '1BS1103', 'Open', 2),
(1, 1, 'Basic Electrical and Electronics', '1ES1107', 'Open', 4),
(1, 1, 'Web Development', '1CEIT1101', 'Open', 3),
(1, 1, 'Computer Fundamental and Applications', '1ES1106', 'Open', 2);

-- =============================================
-- INSERT SEMESTER 2 SUBJECTS
-- =============================================
INSERT INTO subjects (program_id, semester, name, code, subject_type, credits) VALUES
(1, 2, 'Mathematics-II', '1BS2101', 'Open', 2),
(1, 2, 'Applied Physics', '1BS1102', 'Open', 2),
(1, 2, 'Object Oriented Programming with JAVA', '1CEIT2101', 'Core', 5),
(1, 2, 'Version Control System & JavaScript', '1CEIT2102', 'Core', 3),
(1, 2, 'Emerging Trends in Computer Engineering', '1CEIT2103', 'Core', 2),
(1, 2, 'Digital Electronics', '1ES2107', 'Open', 4),
(1, 2, 'Environmental Studies and Disaster Management', '1VE2102', 'Open', 2);

-- =============================================
-- INSERT SEMESTER 3 SUBJECTS
-- =============================================
INSERT INTO subjects (program_id, semester, name, code, subject_type, credits) VALUES
(1, 3, 'Operating System', '1CE2301', 'Open', 4),
(1, 3, 'Programming in C++', '1CE2302', 'Core', 5),
(1, 3, 'Data Structure', '1CE2303', 'Open', 4),
(1, 3, 'Database Management System', '1CE2304', 'Open', 4),
(1, 3, 'Microprocessor Assembly Language Programming', '1CE2305', 'Open', 4);

-- =============================================
-- INSERT SEMESTER 4 SUBJECTS
-- =============================================
INSERT INTO subjects (program_id, semester, name, code, subject_type, credits) VALUES
(1, 4, 'Advanced Database Management System', '1CE2401', 'Open', 4),
(1, 4, 'Computer Network', '1CE2402', 'Open', 4),
(1, 4, 'Fundamental of Software Design', '1CE2403', 'Open', 4),
(1, 4, 'GUI Base Application Development', '1CE2404', 'Core', 5),
(1, 4, 'Computer System Architecture', '1CE2405', 'Open', 3),
(1, 4, 'Web Designing With CSS Framework', '1CE2406', 'Core', 1);

-- =============================================
-- INSERT SEMESTER 5 SUBJECTS
-- =============================================
INSERT INTO subjects (program_id, semester, name, code, subject_type, credits) VALUES
(1, 5, 'Computer Peripherals & Troubleshooting', '1CE2501', 'Open', 4),
(1, 5, 'BIG DATA ANALYTICS', '1CE2507', 'Elective', 5),
(1, 5, 'Network Security', '1IT2501', 'Open', 4),
(1, 5, 'Python Programming', '1IT2502', 'Core', 2),
(1, 5, 'Web Programming Using PHP', '1CE2502', 'Core', 4),
(1, 5, 'Java Programming', '1CE2503', 'Elective', 5),
(1, 5, 'Data Mining & Warehousing', '1CE2504', 'Elective', 5),
(1, 5, 'Network Management & Administration', '1CE2505', 'Elective', 5),
(1, 5, 'Project-I', '1CE2506', 'Open', 2);

-- =============================================
-- INSERT DEFAULT EVALUATION CRITERIA
-- Standard pattern: Mid-Term 20%, Final 40%, Practicals 25%, Assignments 15%
-- =============================================

-- Programming in C (Subject ID: 2)
INSERT INTO evaluation_criteria (subject_id, component_name, weight_percentage, max_marks) VALUES
(2, 'Mid-Term Exam', 20.00, 20),
(2, 'Final Exam', 40.00, 40),
(2, 'Lab Practicals', 25.00, 25),
(2, 'Assignments', 15.00, 15);

-- Object Oriented Programming with JAVA (Subject ID: 10)
INSERT INTO evaluation_criteria (subject_id, component_name, weight_percentage, max_marks) VALUES
(10, 'Mid-Term Exam', 20.00, 20),
(10, 'Final Exam', 40.00, 40),
(10, 'Lab Practicals', 25.00, 25),
(10, 'Assignments', 15.00, 15);

-- Data Structure (Subject ID: 16)
INSERT INTO evaluation_criteria (subject_id, component_name, weight_percentage, max_marks) VALUES
(16, 'Mid-Term Exam', 20.00, 20),
(16, 'Final Exam', 35.00, 35),
(16, 'Lab Practicals', 25.00, 25),
(16, 'Viva', 10.00, 10),
(16, 'Assignments', 10.00, 10);

-- Database Management System (Subject ID: 17)
INSERT INTO evaluation_criteria (subject_id, component_name, weight_percentage, max_marks) VALUES
(17, 'Mid-Term Exam', 20.00, 20),
(17, 'Final Exam', 40.00, 40),
(17, 'Lab Practicals', 25.00, 25),
(17, 'Assignments', 15.00, 15);

-- Python Programming (Subject ID: 27)
INSERT INTO evaluation_criteria (subject_id, component_name, weight_percentage, max_marks) VALUES
(27, 'Mid-Term Exam', 15.00, 15),
(27, 'Final Exam', 35.00, 35),
(27, 'Lab Practicals', 30.00, 30),
(27, 'Project', 20.00, 20);

-- Web Programming Using PHP (Subject ID: 28)
INSERT INTO evaluation_criteria (subject_id, component_name, weight_percentage, max_marks) VALUES
(28, 'Mid-Term Exam', 15.00, 15),
(28, 'Final Exam', 35.00, 35),
(28, 'Lab Practicals', 30.00, 30),
(28, 'Project', 20.00, 20);

-- =============================================
-- STORED PROCEDURE: Auto-enroll student in subjects
-- =============================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS sp_enroll_student_in_semester(
    IN p_user_id INT,
    IN p_program_id INT,
    IN p_semester INT,
    IN p_academic_year VARCHAR(20)
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_subject_id INT;
    DECLARE v_enrollment_id INT;
    DECLARE v_criteria_id INT;
    
    -- Cursor for subjects in the program/semester
    DECLARE subject_cursor CURSOR FOR 
        SELECT id FROM subjects 
        WHERE program_id = p_program_id 
        AND semester = p_semester 
        AND is_active = TRUE;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Open cursor and iterate through subjects
    OPEN subject_cursor;
    
    subject_loop: LOOP
        FETCH subject_cursor INTO v_subject_id;
        IF done THEN
            LEAVE subject_loop;
        END IF;
        
        -- Create enrollment record
        INSERT IGNORE INTO student_enrollments (user_id, subject_id, academic_year, status)
        VALUES (p_user_id, v_subject_id, p_academic_year, 'active');
        
        -- Get the enrollment ID
        SET v_enrollment_id = LAST_INSERT_ID();
        
        -- Create blank grade records for each evaluation criteria
        IF v_enrollment_id > 0 THEN
            INSERT IGNORE INTO student_grades (enrollment_id, criteria_id)
            SELECT v_enrollment_id, ec.id
            FROM evaluation_criteria ec
            WHERE ec.subject_id = v_subject_id;
        END IF;
    END LOOP;
    
    CLOSE subject_cursor;
    
    -- Update user's current semester and program
    UPDATE users 
    SET program_id = p_program_id, 
        current_semester = p_semester
    WHERE id = p_user_id;
    
END //

DELIMITER ;

-- =============================================
-- VIEW: Student Performance Summary
-- =============================================
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
