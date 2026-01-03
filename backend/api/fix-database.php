<?php
/**
 * Database Fix Script
 * Adds missing columns to users table for enrollment tracking
 * Run this once to fix the "Not Yet Enrolled" issue
 */

require_once __DIR__ . '/../config/database.php';

header('Content-Type: text/html; charset=utf-8');

echo "<h2>🔧 Database Fix Script</h2>";

try {
    $pdo = getDBConnection();

    // Check if columns exist
    $stmt = $pdo->query("DESCRIBE users");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $fixes = [];

    // Add program_id if not exists
    if (!in_array('program_id', $columns)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN program_id INT DEFAULT NULL AFTER role");
        $fixes[] = "✅ Added 'program_id' column to users table";
    } else {
        $fixes[] = "ℹ️ 'program_id' column already exists";
    }

    // Add current_semester if not exists
    if (!in_array('current_semester', $columns)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN current_semester INT DEFAULT 1 AFTER program_id");
        $fixes[] = "✅ Added 'current_semester' column to users table";
    } else {
        $fixes[] = "ℹ️ 'current_semester' column already exists";
    }

    // Add enrollment_year if not exists
    if (!in_array('enrollment_year', $columns)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN enrollment_year YEAR DEFAULT NULL AFTER current_semester");
        $fixes[] = "✅ Added 'enrollment_year' column to users table";
    } else {
        $fixes[] = "ℹ️ 'enrollment_year' column already exists";
    }

    echo "<ul>";
    foreach ($fixes as $fix) {
        echo "<li>$fix</li>";
    }
    echo "</ul>";

    echo "<hr>";
    echo "<h3>✅ Database fix complete!</h3>";
    echo "<p>You can now try bulk enrollment again. After enrolling, the student dashboard should show the enrolled subjects.</p>";

} catch (PDOException $e) {
    echo "<h3 style='color: red;'>❌ Error:</h3>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
}
?>