-- ============================================
-- Default Evaluation Criteria for All Subjects
-- Run this script to set up standard grading
-- ============================================

USE student_data_mining;

-- First, clear existing criteria (optional - comment out if you want to keep custom ones)
-- DELETE FROM evaluation_criteria;

-- Create a procedure to add default criteria to all subjects
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS sp_add_default_criteria()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_subject_id INT;
    DECLARE v_existing INT;
    
    -- Cursor for all active subjects
    DECLARE subject_cursor CURSOR FOR 
        SELECT id FROM subjects WHERE is_active = TRUE;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN subject_cursor;
    
    subject_loop: LOOP
        FETCH subject_cursor INTO v_subject_id;
        IF done THEN
            LEAVE subject_loop;
        END IF;
        
        -- Check if this subject already has criteria
        SELECT COUNT(*) INTO v_existing FROM evaluation_criteria WHERE subject_id = v_subject_id;
        
        -- Only add default criteria if none exist
        IF v_existing = 0 THEN
            -- Final Exam: 35 marks
            INSERT INTO evaluation_criteria (subject_id, component_name, weight_percentage, max_marks, description)
            VALUES (v_subject_id, 'Final Exam', 35.00, 35, 'End semester examination');
            
            -- Mid Semester: 25 marks
            INSERT INTO evaluation_criteria (subject_id, component_name, weight_percentage, max_marks, description)
            VALUES (v_subject_id, 'Mid Semester', 25.00, 25, 'Mid semester examination');
            
            -- Lab/Practicals: 20 marks
            INSERT INTO evaluation_criteria (subject_id, component_name, weight_percentage, max_marks, description)
            VALUES (v_subject_id, 'Lab Practicals', 20.00, 20, 'Laboratory practical work');
            
            -- Assignments: 20 marks
            INSERT INTO evaluation_criteria (subject_id, component_name, weight_percentage, max_marks, description)
            VALUES (v_subject_id, 'Assignments', 20.00, 20, 'Assignments and homework');
        END IF;
    END LOOP;
    
    CLOSE subject_cursor;
END //

DELIMITER ;

-- Execute the procedure
CALL sp_add_default_criteria();

-- Verify the results
SELECT 
    s.name AS subject_name,
    s.code AS subject_code,
    s.semester,
    GROUP_CONCAT(
        CONCAT(ec.component_name, ': ', ec.max_marks, ' marks') 
        ORDER BY ec.weight_percentage DESC 
        SEPARATOR ', '
    ) AS criteria
FROM subjects s
LEFT JOIN evaluation_criteria ec ON s.id = ec.subject_id
WHERE s.is_active = TRUE
GROUP BY s.id
ORDER BY s.semester, s.name;
