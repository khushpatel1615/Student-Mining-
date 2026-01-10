<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();
    $studentId = 21; // Khush Patel

    echo "=== ENROLLED SUBJECTS FOR STUDENT 21 ===\n";
    $stmt = $pdo->prepare("
        SELECT s.id, s.name, p.name as program_name, s.semester
        FROM student_enrollments e 
        JOIN subjects s ON e.subject_id = s.id 
        JOIN programs p ON s.program_id = p.id
        WHERE e.user_id = ?
    ");
    $stmt->execute([$studentId]);
    $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($subjects);

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
