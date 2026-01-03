<?php
/**
 * Schema Update Script
 * Adds the notifications table to the database
 */

require_once __DIR__ . '/../config/database.php';

echo "<h2>🔧 Updating Database Schema</h2>";

try {
    $pdo = getDBConnection();

    echo "<p>Checking for notifications table...</p>";

    $sql = "
    CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('grade_update', 'attendance_warning', 'announcement', 'system') NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        related_id INT DEFAULT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_read (user_id, is_read),
        INDEX idx_created (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($sql);
    echo "<p style='color: green;'>✅ Notifications table created/verified successfully!</p>";

    echo "<h3>📊 Table Structure:</h3>";
    $stmt = $pdo->query("DESCRIBE notifications");
    echo "<table border='1' cellpadding='5'><tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th></tr>";
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "<tr>";
        foreach ($row as $val) {
            echo "<td>" . ($val ?? 'NULL') . "</td>";
        }
        echo "</tr>";
    }
    echo "</table>";

} catch (PDOException $e) {
    echo "<p style='color: red;'>❌ Error: " . $e->getMessage() . "</p>";
}
?>