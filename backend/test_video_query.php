<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();

$stmt = $pdo->prepare("
                    SELECT vl.*, p.name as program_name FROM video_lectures vl
                    LEFT JOIN programs p ON vl.program_id = p.id
                    WHERE vl.is_featured = 1 
                    OR vl.subject_id IN (SELECT subject_id FROM student_enrollments WHERE user_id = ?)
                    OR (vl.program_id, vl.semester) IN (
                        SELECT DISTINCT s.program_id, s.semester 
                        FROM subjects s 
                        JOIN student_enrollments e ON s.id = e.subject_id 
                        WHERE e.user_id = ?
                    )
                    GROUP BY vl.id
                    ORDER BY vl.created_at DESC
                ");
$stmt->execute([3, 3]);
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
