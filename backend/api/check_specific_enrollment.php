<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();
    $studentId = 21; // Khush Patel
    $subjectId = 2; // Subject from active sessions

    $stmt = $pdo->prepare("SELECT * FROM student_enrollments WHERE user_id = ? AND subject_id = ?");
    $stmt->execute([$studentId, $subjectId]);
    $enrollment = $stmt->fetch(PDO::FETCH_ASSOC);

    echo "=== ENROLLMENT STATUS ===\n";
    if ($enrollment) {
        echo "Student 21 is ENROLLED in subject 2.\n";
        print_r($enrollment);
    } else {
        echo "Student 21 is NOT ENROLLED in subject 2.\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
