<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();

    // Check if column exists
    $stmt = $pdo->prepare("SHOW COLUMNS FROM users LIKE 'avatar_url'");
    $stmt->execute();

    if ($stmt->rowCount() == 0) {
        // Add column if it doesn't exist
        $pdo->exec("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) DEFAULT NULL AFTER email");
        echo "Column 'avatar_url' added successfully.\n";
    } else {
        echo "Column 'avatar_url' already exists.\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>