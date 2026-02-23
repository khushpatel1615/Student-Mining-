-- =======================================================
-- test_seed.sql
-- Seed data for testing Student Data Mining Dashboard
-- Covers specific test cases outlined in the QA strategy
-- =======================================================

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE grade_edit_log;
TRUNCATE TABLE student_grades;
TRUNCATE TABLE student_attendance;
TRUNCATE TABLE student_enrollments;
TRUNCATE TABLE evaluation_criteria;
TRUNCATE TABLE teacher_subjects;
TRUNCATE TABLE assignments;
TRUNCATE TABLE subjects;
TRUNCATE TABLE program_analytics;
TRUNCATE TABLE student_analytics;
TRUNCATE TABLE users;
TRUNCATE TABLE programs;
SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================
-- 1. BASE PROGRAMS
-- ==========================================
INSERT INTO programs (id, name, code, duration_years, total_semesters, is_active) VALUES
(1, 'Test Engineering', 'TE', 4, 8, 1);

-- ==========================================
-- 2. USERS
-- ==========================================

-- Admin User
INSERT INTO users (id, email, full_name, role, program_id, is_active) VALUES
(1, 'admin@college.edu', 'Test Admin', 'admin', NULL, 1);

-- Teacher Users
INSERT INTO users (id, email, full_name, role, program_id, is_active) VALUES
(2, 'teacher1@college.edu', 'Teacher One', 'teacher', NULL, 1),
(3, 'teacher2@college.edu', 'Teacher Two', 'teacher', NULL, 1),
(4, 'teacher3@college.edu', 'Teacher Three', 'teacher', NULL, 1);

-- Student Users
INSERT INTO users (id, email, student_id, full_name, role, program_id, current_semester, is_active) VALUES
(10, 'complete1@college.edu', 'STU10', 'Complete Grades One', 'student', 1, 1, 1),
(11, 'complete2@college.edu', 'STU11', 'Complete Grades Two', 'student', 1, 1, 1),
(12, 'partial1@college.edu', 'STU12', 'Partial Grades One', 'student', 1, 1, 1),
(13, 'partial2@college.edu', 'STU13', 'Partial Grades Two', 'student', 1, 1, 1),
(14, 'partial3@college.edu', 'STU14', 'Partial Grades Three', 'student', 1, 1, 1),
(15, 'zero1@college.edu', 'STU15', 'Zero Grades One', 'student', 1, 1, 1),
(16, 'zero2@college.edu', 'STU16', 'Zero Grades Two', 'student', 1, 1, 1),
(17, 'nogrades1@college.edu', 'STU17', 'No Grades One', 'student', 1, 1, 1),
(18, 'poor_att@college.edu', 'STU18', 'Poor Attendance Student', 'student', 1, 1, 1),
(19, 'perfect_att@college.edu', 'STU19', 'Perfect Attendance Student', 'student', 1, 1, 1);

-- ==========================================
-- 3. SUBJECTS
-- ==========================================
INSERT INTO subjects (id, program_id, semester, name, code, credits, is_active) VALUES
(1, 1, 1, 'Software Testing', 'CS101', 3, 1),
(2, 1, 1, 'Data Structures', 'CS102', 3, 1),
(3, 1, 1, 'Algorithms', 'CS103', 3, 1),
(4, 1, 2, 'Operating Systems', 'CS201', 3, 1),
(5, 1, 2, 'Database Management', 'CS202', 3, 1),
(6, 1, 2, 'Advanced Computing', 'CS203', 3, 1), -- Edge Case: No enrolled students
(99, 1, 1, 'Broken Weight Subject', 'BAD99', 3, 1); -- Edge Case: Weight summing to < 100%

-- ==========================================
-- 4. TEACHER ASSIGNMENTS
-- ==========================================
INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES
(2, 1), (2, 2),
(3, 3), (3, 4),
(4, 5);

-- ==========================================
-- 5. EVALUATION CRITERIA
-- ==========================================
-- Sum to 100% for Subjects 1-5
INSERT INTO evaluation_criteria (id, subject_id, component_name, weight_percentage, max_marks) VALUES
(1, 1, 'Midterm', 30.00, 30), (2, 1, 'Final', 50.00, 100), (3, 1, 'Assignments', 20.00, 20),
(4, 2, 'Midterm', 30.00, 30), (5, 2, 'Final', 50.00, 100), (6, 2, 'Assignments', 20.00, 20),
(7, 3, 'Midterm', 30.00, 30), (8, 3, 'Final', 50.00, 100), (9, 3, 'Assignments', 20.00, 20),
(10, 4, 'Midterm', 30.00, 30), (11, 4, 'Final', 50.00, 100), (12, 4, 'Assignments', 20.00, 20),
(13, 5, 'Midterm', 30.00, 30), (14, 5, 'Final', 50.00, 100), (15, 5, 'Assignments', 20.00, 20);

-- Broken criteria for Subject 99 (Only 90%)
INSERT INTO evaluation_criteria (id, subject_id, component_name, weight_percentage, max_marks) VALUES
(99, 99, 'Broken Exam', 90.00, 100);

-- ==========================================
-- 6. ENROLLMENTS
-- ==========================================
-- Student 10 & 11 get all subjects (1 to 5)
-- Everyone gets Subject 1 (enrollment IDs are user_id*10 + subject_id to easily locate)
INSERT INTO student_enrollments (id, user_id, subject_id, status) VALUES
(101, 10, 1, 'active'), (102, 10, 2, 'active'), (103, 10, 3, 'active'), (104, 10, 4, 'active'), (105, 10, 5, 'active'),
(111, 11, 1, 'active'), (112, 11, 2, 'active'), (113, 11, 3, 'active'), (114, 11, 4, 'active'), (115, 11, 5, 'active'),
(121, 12, 1, 'active'),
(131, 13, 1, 'active'),
(141, 14, 1, 'active'),
(151, 15, 1, 'active'),
(161, 16, 1, 'active'),
(171, 17, 1, 'active'),
(181, 18, 1, 'active'),
(191, 19, 1, 'active'),
(50, 10, 99, 'active'); -- specific enrollment in broken weight subject for testing

-- ==========================================
-- 7. GRADES
-- ==========================================
-- 10 & 11: Complete grades in subject 1 (Subj 1 criteria: 1=Midterm, 2=Final, 3=Assignments)
INSERT INTO student_grades (enrollment_id, criteria_id, marks_obtained, graded_by) VALUES
(101, 1, 28, 2), (101, 2, 95, 2), (101, 3, 18, 2), -- 93.5% Overall
(111, 1, 25, 2), (111, 2, 80, 2), (111, 3, 20, 2); -- 85% Overall

-- 12, 13, 14: Partial grades in subject 1
INSERT INTO student_grades (enrollment_id, criteria_id, marks_obtained, graded_by) VALUES
(121, 1, 20, 2), (121, 3, 15, 2), -- Missing Final
(131, 1, 15, 2), (131, 2, 60, 2), -- Missing Assignments
(141, 2, 55, 2), (141, 3, 18, 2); -- Missing Midterm

-- 15 & 16: Zero grades in subject 1 (Zeros, not NULLs)
INSERT INTO student_grades (enrollment_id, criteria_id, marks_obtained, graded_by) VALUES
(151, 1, 0, 2), (151, 2, 0, 2), (151, 3, 0, 2),
(161, 1, 0, 2), (161, 2, 0, 2), (161, 3, 0, 2);

-- 17, 18, 19: No grades at all (Empty table rows or NULL)
-- (No inserts necessary for 17, 18, 19, they simply won't have records)

-- ==========================================
-- 8. ATTENDANCE
-- ==========================================
-- Student 19 (Perfect Attendance) - 5 days present
INSERT INTO student_attendance (enrollment_id, attendance_date, status) VALUES
(191, '2025-01-01', 'present'), (191, '2025-01-02', 'present'), (191, '2025-01-03', 'present'), 
(191, '2025-01-04', 'present'), (191, '2025-01-05', 'present');

-- Student 18 (Poor Attendance - < 50%) - 1 present, 4 absent
INSERT INTO student_attendance (enrollment_id, attendance_date, status) VALUES
(181, '2025-01-01', 'present'), (181, '2025-01-02', 'absent'), (181, '2025-01-03', 'absent'), 
(181, '2025-01-04', 'absent'), (181, '2025-01-05', 'absent');

-- Update Final Percentage explicitly for the test cases where possible
UPDATE student_enrollments SET final_percentage = 93.5, final_grade = 'A+' WHERE id = 101;
UPDATE student_enrollments SET final_percentage = 85.0, final_grade = 'A' WHERE id = 111;
UPDATE student_enrollments SET final_percentage = 0, final_grade = 'F' WHERE id = 151;
UPDATE student_enrollments SET final_percentage = 0, final_grade = 'F' WHERE id = 161;
