<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();
    $studentId = 21; // Khush Patel
    $subjectId = 2; // Programming in C

    // 1. Enroll the student
    $stmt = $pdo->prepare("INSERT IGNORE INTO student_enrollments (user_id, subject_id, status) VALUES (?, ?, 'active')");
    $stmt->execute([$studentId, $subjectId]);

    echo "=== ENROLLMENT COMPLETED ===\n";
    echo "Student 21 has been enrolled in Subject 2.\n";

    // 2. Setup today's attendance record
    $today = date('Y-m-d');
    $stmt = $pdo->prepare("
        INSERT IGNORE INTO student_attendance (enrollment_id, attendance_date, status, marked_by) 
        SELECT id, ?, 'absent', 1 
        FROM student_enrollments 
        WHERE user_id = ? AND subject_id = ?
    ");
    $stmt->execute([$today, $studentId, $subjectId]);
    echo "Initial attendance record (absent) checked/created for today.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
