<?php
require_once __DIR__ . '/../config/database.php';
try {
    $pdo = getDBConnection();
    echo "Checking view vw_student_performance...\n";
    $stmt = $pdo->query("SELECT * FROM vw_student_performance LIMIT 1");
    $row = $stmt->fetch();
    echo "View works! Row: " . json_encode($row) . "\n";
} catch (Exception $e) {
    echo "View Error: " . $e->getMessage() . "\n";
}
