<?php
require_once __DIR__ . '/../config/database.php';

$pdo = getDBConnection();

// Get khush's user ID
$stmt = $pdo->query("SELECT id, full_name, current_semester FROM users WHERE email LIKE '%khush%' OR full_name LIKE '%khush%' LIMIT 1");
$user = $stmt->fetch(PDO::FETCH_ASSOC);

echo "=== User Info ===\n";
print_r($user);

if ($user) {
    echo "\n=== Enrollments for User ID: {$user['id']} ===\n";

    $stmt = $pdo->prepare("
        SELECT 
            se.id as enrollment_id,
            se.subject_id,
            s.name as subject_name,
            s.code as subject_code,
            s.semester,
            s.subject_type,
            se.final_percentage,
            se.final_grade
        FROM student_enrollments se
        JOIN subjects s ON se.subject_id = s.id
        WHERE se.user_id = ?
        ORDER BY s.name, s.subject_type
    ");
    $stmt->execute([$user['id']]);
    $enrollments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Total enrollments: " . count($enrollments) . "\n\n";

    foreach ($enrollments as $e) {
        echo "ID: {$e['enrollment_id']} | Subject: {$e['subject_name']} ({$e['subject_code']}) | Semester: {$e['semester']} | Type: {$e['subject_type']} | Score: {$e['final_percentage']} | Grade: {$e['final_grade']}\n";
    }

    // Check for duplicates
    echo "\n=== Checking for Duplicate Enrollments ===\n";
    $stmt = $pdo->prepare("
        SELECT subject_id, COUNT(*) as count
        FROM student_enrollments
        WHERE user_id = ?
        GROUP BY subject_id
        HAVING COUNT(*) > 1
    ");
    $stmt->execute([$user['id']]);
    $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($duplicates) > 0) {
        echo "FOUND DUPLICATES:\n";
        print_r($duplicates);
    } else {
        echo "No duplicate enrollments found.\n";
    }
}
