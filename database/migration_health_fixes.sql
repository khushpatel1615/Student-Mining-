-- ============================================
-- Add missing views for health dashboard
-- ============================================

USE student_data_mining;

CREATE OR REPLACE VIEW vw_ready_to_finalize AS
SELECT se.id as enrollment_id, se.subject_id
FROM student_enrollments se
JOIN student_grades sg ON se.id = sg.enrollment_id
JOIN evaluation_criteria ec ON sg.criteria_id = ec.id
WHERE se.is_finalized = 0 OR se.is_finalized IS NULL
GROUP BY se.id, se.subject_id
HAVING SUM(ec.weight_percentage) >= 99.99;
