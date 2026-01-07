<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();

    echo "=== USERS TABLE STRUCTURE ===\n";
    $stmt = $pdo->query("DESCRIBE users");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($columns as $col) {
        echo "{$col['Field']} - {$col['Type']}\n";
    }

    echo "\n\n=== SAMPLE USER DATA ===\n";
    $stmt = $pdo->query("SELECT * FROM users WHERE role = 'student' LIMIT 3");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($users as $user) {
        print_r($user);
        echo "\n---\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>