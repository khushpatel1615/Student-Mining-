<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();

    echo "=== student_enrollments structure ===\n";
    $stmt = $pdo->query("DESCRIBE student_enrollments");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

    echo "\n=== student_attendance structure ===\n";
    $stmt = $pdo->query("DESCRIBE student_attendance");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
