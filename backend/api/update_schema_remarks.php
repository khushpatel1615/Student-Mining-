<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();

    // Check if remarks column exists in student_grades
    $stmt = $pdo->query("SHOW COLUMNS FROM student_grades LIKE 'remarks'");
    $exists = $stmt->fetch();

    if (!$exists) {
        $pdo->exec("ALTER TABLE student_grades ADD COLUMN remarks TEXT DEFAULT NULL");
        echo "Column 'remarks' added to 'student_grades' table.\n";
    } else {
        echo "Column 'remarks' already exists in 'student_grades' table.\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>