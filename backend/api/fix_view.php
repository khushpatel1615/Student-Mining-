<?php
/**
 * Database View Maintenance Script
 * Creates/Updates the vw_student_performance view
 * 
 * SECURITY: Requires admin authentication
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

// Require admin role
requireRole('admin');

$pdo = getDBConnection();

$sql = "CREATE OR REPLACE VIEW vw_student_performance AS
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
    IFNULL((
        SELECT SUM(ec.weight_percentage) 
        FROM student_grades sg 
        JOIN evaluation_criteria ec ON sg.criteria_id = ec.id 
        WHERE sg.enrollment_id = se.id AND sg.marks_obtained IS NOT NULL
    ), 0) AS attempted_weight,
    CASE 
        WHEN IFNULL((
            SELECT SUM(ec.weight_percentage) 
            FROM student_grades sg 
            JOIN evaluation_criteria ec ON sg.criteria_id = ec.id 
            WHERE sg.enrollment_id = se.id AND sg.marks_obtained IS NOT NULL
        ), 0) > 0 
        THEN LEAST(100, (se.final_percentage / (
            SELECT SUM(ec.weight_percentage) 
            FROM student_grades sg 
            JOIN evaluation_criteria ec ON sg.criteria_id = ec.id 
            WHERE sg.enrollment_id = se.id AND sg.marks_obtained IS NOT NULL
        )) * 100) 
        ELSE se.final_percentage 
    END AS scaled_percentage,
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
WHERE u.role = 'student' AND u.is_active = 1";

try {
    $pdo->exec($sql);
    sendResponse(['success' => true, 'message' => 'View updated successfully']);
} catch (PDOException $e) {
    sendError('Failed to update view', 500, $e->getMessage());
}
