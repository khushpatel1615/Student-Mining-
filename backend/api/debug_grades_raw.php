<?php
require_once __DIR__ . '/../config/database.php';
$pdo = getDBConnection();

// Get the subject ID for "Programming in C" to match user's screenshot
$stmt = $pdo->prepare("SELECT id FROM subjects WHERE name LIKE '%Programming in C%' LIMIT 1");
$stmt->execute();
$subject = $stmt->fetch();

if (!$subject) {
    die("Subject not found");
}

$subjectId = $subject['id'];
echo "Subject ID: " . $subjectId . "\n\n";

// Get Criteria
$criteriaStmt = $pdo->prepare("SELECT id, component_name FROM evaluation_criteria WHERE subject_id = ?");
$criteriaStmt->execute([$subjectId]);
$criteria = $criteriaStmt->fetchAll(PDO::FETCH_ASSOC);

echo "Criteria:\n";
print_r($criteria);

// Get Enrollments
$enrollStmt = $pdo->prepare("SELECT id, user_id FROM student_enrollments WHERE subject_id = ? LIMIT 5");
$enrollStmt->execute([$subjectId]);
$enrollments = $enrollStmt->fetchAll(PDO::FETCH_ASSOC);

echo "\nEnrollments (First 5):\n";
print_r($enrollments);

if (!empty($enrollments)) {
    $eIds = array_column($enrollments, 'id');
    $placeholders = str_repeat('?,', count($eIds) - 1) . '?';

    // Get Grades
    $gradeStmt = $pdo->prepare("SELECT * FROM student_grades WHERE enrollment_id IN ($placeholders)");
    $gradeStmt->execute($eIds);
    $grades = $gradeStmt->fetchAll(PDO::FETCH_ASSOC);

    echo "\nGrades Found:\n";
    print_r($grades);
}
?>