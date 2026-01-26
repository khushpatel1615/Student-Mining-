<?php
require_once __DIR__ . '/backend/config/database.php';

try {
    $pdo = getDBConnection();

    echo "=== DATABASE TABLES ===\n";
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $table) {
        echo "  - $table\n";
    }
    echo "\nTotal tables: " . count($tables) . "\n\n";

    echo "=== USERS TABLE STRUCTURE ===\n";
    $stmt = $pdo->query("DESCRIBE users");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($columns as $col) {
        printf(
            "%-20s %-30s %-10s %-10s\n",
            $col['Field'],
            $col['Type'],
            $col['Null'],
            $col['Key']
        );
    }

    echo "\n=== USERS.ROLE ENUM VALUES ===\n";
    $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'role'");
    $roleCol = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Type: " . $roleCol['Type'] . "\n";

    echo "\n=== MIGRATION STATUS ===\n";
    // Check if all required tables exist
    $requiredTables = [
        'users',
        'subjects',
        'student_enrollments',
        'student_grades',
        'assignments',
        'assignment_submissions',
        'student_analytics',
        'attendance',
        'programs',
        'evaluation_criteria'
    ];

    foreach ($requiredTables as $reqTable) {
        $exists = in_array($reqTable, $tables) ? '✓' : '✗';
        echo "  $exists $reqTable\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
?>