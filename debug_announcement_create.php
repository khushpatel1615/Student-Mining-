<?php
require_once __DIR__ . '/backend/config/database.php';
require_once __DIR__ . '/backend/includes/jwt.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "\n=== DEBUG ANNOUNCEMENT CREATION ===\n";

try {
    $pdo = getDBConnection();

    // 1. Get a valid teacher and subject
    $teacher = $pdo->query("SELECT id FROM users WHERE role = 'teacher' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
    $subject = $pdo->query("SELECT id FROM subjects LIMIT 1")->fetch(PDO::FETCH_ASSOC);

    if (!$teacher || !$subject) {
        die("Error: Need at least one teacher and one subject in DB to test.\n");
    }

    $teacherId = $teacher['id'];
    $subjectId = $subject['id'];

    echo "Testing with Teacher ID: $teacherId, Subject ID: $subjectId\n";

    // 2. Assign subject to teacher (if not already)
    $stmt = $pdo->prepare("INSERT IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)");
    $stmt->execute([$teacherId, $subjectId]);
    echo "Ensured teacher is assigned to subject.\n";

    // 3. Simulate API Token
    echo "Generating token...\n";
    // We need to bypass the actual HTTP request and test the logic directly or simulate it via curl
    // Let's test the INSERT logic directly first to rule out DB schema issues

    echo "Attempting Direct DB Insert...\n";
    $stmt = $pdo->prepare("
        INSERT INTO announcements (subject_id, teacher_id, title, content, is_pinned)
        VALUES (?, ?, ?, ?, ?)
    ");

    $title = "Debug Test Announcement " . time();
    $content = "This is a debug test content.";
    $isPinned = 0;

    if ($stmt->execute([$subjectId, $teacherId, $title, $content, $isPinned])) {
        echo "Direct Insert SUCCESS. ID: " . $pdo->lastInsertId() . "\n";
    } else {
        echo "Direct Insert FAILED.\n";
        print_r($stmt->errorInfo());
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
