<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();

    // Show columns in assignments table
    $stmt = $pdo->query("SHOW COLUMNS FROM assignments");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Assignments table columns:\n";
    foreach ($columns as $col) {
        echo "- {$col['Field']} ({$col['Type']})\n";
    }

    echo "\n";

    // Show columns in exams table
    $stmt = $pdo->query("SHOW COLUMNS FROM exams");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Exams table columns:\n";
    foreach ($columns as $col) {
        echo "- {$col['Field']} ({$col['Type']})\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>