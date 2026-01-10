<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();

    echo "=== ACTIVE ATTENDANCE SESSIONS ===\n";
    $stmt = $pdo->query("SELECT * FROM attendance_sessions WHERE expires_at > NOW()");
    $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($sessions);

    echo "\n=== STUDENT DATA (khushpatel1615@gmail.com) ===\n";
    $stmt = $pdo->prepare("SELECT id, email, full_name, program_id, current_semester FROM users WHERE email = ?");
    $stmt->execute(['khushpatel1615@gmail.com']);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);
    print_r($student);

    if ($student) {
        echo "\n=== STUDENT ENROLLMENTS ===\n";
        $stmt = $pdo->prepare("SELECT e.*, s.name as subject_name FROM student_enrollments e JOIN subjects s ON e.subject_id = s.id WHERE e.user_id = ?");
        $stmt->execute([$student['id']]);
        $enrollments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        print_r($enrollments);
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
