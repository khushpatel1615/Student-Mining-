-- ============================================
-- Populate Random Grades for All Students
-- Ensures total marks per subject = 100
-- ============================================

USE student_data_mining;

-- Temporary procedure to generate realistic random grades
DELIMITER //

DROP PROCEDURE IF EXISTS sp_populate_random_grades//

CREATE PROCEDURE sp_populate_random_grades()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_enrollment_id INT;
    DECLARE v_criteria_id INT;
    DECLARE v_max_marks INT;
    DECLARE v_random_marks DECIMAL(5,2);
    DECLARE v_performance_factor DECIMAL(3,2);
    
    -- Cursor for all active enrollments
    DECLARE enrollment_cursor CURSOR FOR 
        SELECT id FROM student_enrollments WHERE status = 'active';
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Open enrollment cursor
    OPEN enrollment_cursor;
    
    enrollment_loop: LOOP
        FETCH enrollment_cursor INTO v_enrollment_id;
        IF done THEN
            LEAVE enrollment_loop;
        END IF;
        
        -- Generate a random performance factor for this student (0.50 to 0.95)
        -- This creates variation: some students perform better overall
        SET v_performance_factor = 0.50 + (RAND() * 0.45);
        
        -- Update grades for each evaluation criteria in this enrollment
        BEGIN
            DECLARE done_criteria INT DEFAULT FALSE;
            DECLARE criteria_cursor CURSOR FOR
                SELECT ec.id, ec.max_marks
                FROM evaluation_criteria ec
                JOIN student_enrollments se ON se.subject_id = ec.subject_id
                WHERE se.id = v_enrollment_id;
            
            DECLARE CONTINUE HANDLER FOR NOT FOUND SET done_criteria = TRUE;
            
            OPEN criteria_cursor;
            
            criteria_loop: LOOP
                FETCH criteria_cursor INTO v_criteria_id, v_max_marks;
                IF done_criteria THEN
                    LEAVE criteria_loop;
                END IF;
                
                -- Generate random marks based on max_marks and performance factor
                -- Add some randomness (±15%) to make it realistic
                SET v_random_marks = ROUND(
                    v_max_marks * v_performance_factor * (0.85 + (RAND() * 0.30)),
                    2
                );
                
                -- Ensure marks don't exceed max_marks
                IF v_random_marks > v_max_marks THEN
                    SET v_random_marks = v_max_marks;
                END IF;
                
                -- Ensure marks are at least 30% of max (to avoid too many failures)
                IF v_random_marks < (v_max_marks * 0.30) THEN
                    SET v_random_marks = ROUND(v_max_marks * 0.30, 2);
                END IF;
                
                -- Update the grade
                UPDATE student_grades
                SET marks_obtained = v_random_marks,
                    graded_at = NOW(),
                    graded_by = 1  -- Admin user
                WHERE enrollment_id = v_enrollment_id 
                AND criteria_id = v_criteria_id;
                
            END LOOP criteria_loop;
            
            CLOSE criteria_cursor;
        END;
        
        -- Calculate final percentage for this enrollment
        UPDATE student_enrollments se
        SET final_percentage = (
            SELECT ROUND(SUM(sg.marks_obtained), 2)
            FROM student_grades sg
            WHERE sg.enrollment_id = se.id
        ),
        final_grade = (
            SELECT CASE
                WHEN SUM(sg.marks_obtained) >= 90 THEN 'A+'
                WHEN SUM(sg.marks_obtained) >= 80 THEN 'A'
                WHEN SUM(sg.marks_obtained) >= 70 THEN 'B+'
                WHEN SUM(sg.marks_obtained) >= 60 THEN 'B'
                WHEN SUM(sg.marks_obtained) >= 50 THEN 'C'
                WHEN SUM(sg.marks_obtained) >= 40 THEN 'D'
                ELSE 'F'
            END
            FROM student_grades sg
            WHERE sg.enrollment_id = se.id
        ),
        status = (
            SELECT CASE
                WHEN SUM(sg.marks_obtained) >= 40 THEN 'completed'
                ELSE 'failed'
            END
            FROM student_grades sg
            WHERE sg.enrollment_id = se.id
        )
        WHERE se.id = v_enrollment_id;
        
    END LOOP enrollment_loop;
    
    CLOSE enrollment_cursor;
    
    SELECT 'Grades populated successfully!' AS message,
           COUNT(*) AS total_enrollments_updated
    FROM student_enrollments
    WHERE final_percentage IS NOT NULL;
    
END//

DELIMITER ;

-- Execute the procedure to populate grades
CALL sp_populate_random_grades();

-- Verify the results
SELECT 
    u.full_name AS student_name,
    s.name AS subject_name,
    s.semester,
    se.final_percentage AS total_marks,
    se.final_grade AS grade,
    se.status
FROM student_enrollments se
JOIN users u ON se.user_id = u.id
JOIN subjects s ON se.subject_id = s.id
WHERE u.role = 'student'
ORDER BY u.full_name, s.semester, s.name;

-- Show detailed breakdown for verification
SELECT 
    u.full_name AS student,
    s.name AS subject,
    ec.component_name,
    ec.max_marks,
    sg.marks_obtained,
    ROUND((sg.marks_obtained / ec.max_marks) * 100, 2) AS percentage
FROM student_grades sg
JOIN student_enrollments se ON sg.enrollment_id = se.id
JOIN users u ON se.user_id = u.id
JOIN subjects s ON se.subject_id = s.id
JOIN evaluation_criteria ec ON sg.criteria_id = ec.id
WHERE u.role = 'student'
ORDER BY u.full_name, s.name, ec.component_name;

-- Summary statistics
SELECT 
    'Total Students' AS metric,
    COUNT(DISTINCT u.id) AS value
FROM users u
WHERE u.role = 'student'
UNION ALL
SELECT 
    'Total Enrollments' AS metric,
    COUNT(*) AS value
FROM student_enrollments
UNION ALL
SELECT 
    'Graded Enrollments' AS metric,
    COUNT(*) AS value
FROM student_enrollments
WHERE final_percentage IS NOT NULL
UNION ALL
SELECT 
    'Average Score' AS metric,
    ROUND(AVG(final_percentage), 2) AS value
FROM student_enrollments
WHERE final_percentage IS NOT NULL;
