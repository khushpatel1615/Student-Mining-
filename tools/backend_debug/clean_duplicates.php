<?php
/**
 * Script to clean duplicate student enrollments
 * Keeps the enrollment with the higher final_percentage
 */
require_once __DIR__ . '/../config/database.php';

$pdo = getDBConnection();

echo "=== Cleaning Duplicate Enrollments ===\n\n";

// Find all duplicates
$stmt = $pdo->query("
    SELECT user_id, subject_id, COUNT(*) as count
    FROM student_enrollments
    GROUP BY user_id, subject_id
    HAVING COUNT(*) > 1
");
$duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($duplicates) . " user-subject combinations with duplicates.\n\n";

$deletedCount = 0;

foreach ($duplicates as $dup) {
    echo "Processing User ID: {$dup['user_id']}, Subject ID: {$dup['subject_id']}...\n";

    // Get all enrollments for this user-subject pair, ordered by final_percentage DESC
    $stmt = $pdo->prepare("
        SELECT id, final_percentage, final_grade
        FROM student_enrollments
        WHERE user_id = ? AND subject_id = ?
        ORDER BY COALESCE(final_percentage, 0) DESC, id DESC
    ");
    $stmt->execute([$dup['user_id'], $dup['subject_id']]);
    $enrollments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Keep the first one (highest score), delete the rest
    $keepId = $enrollments[0]['id'];
    echo "  Keeping enrollment ID: {$keepId} (Score: {$enrollments[0]['final_percentage']})\n";

    for ($i = 1; $i < count($enrollments); $i++) {
        $deleteId = $enrollments[$i]['id'];
        echo "  Deleting enrollment ID: {$deleteId} (Score: {$enrollments[$i]['final_percentage']})\n";

        // First delete any related grades
        $pdo->prepare("DELETE FROM student_grades WHERE enrollment_id = ?")->execute([$deleteId]);

        // Then delete the enrollment
        $pdo->prepare("DELETE FROM student_enrollments WHERE id = ?")->execute([$deleteId]);
        $deletedCount++;
    }
    echo "\n";
}

echo "=== Cleanup Complete ===\n";
echo "Deleted {$deletedCount} duplicate enrollment records.\n";

// Verify
echo "\n=== Verification ===\n";
$stmt = $pdo->query("
    SELECT user_id, subject_id, COUNT(*) as count
    FROM student_enrollments
    GROUP BY user_id, subject_id
    HAVING COUNT(*) > 1
");
$remaining = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Remaining duplicates: " . count($remaining) . "\n";
