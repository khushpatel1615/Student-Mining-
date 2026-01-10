<?php
/**
 * Database Migration: Smart Attendance System
 * Creates necessary tables and columns for QR/WiFi-based attendance
 */

require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "Starting migration...<br>";

    // 1. Create attendance_sessions table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS attendance_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            subject_id INT NOT NULL,
            teacher_id INT NOT NULL,
            authorized_ip VARCHAR(45) NOT NULL,
            session_code VARCHAR(6) NOT NULL,
            is_active TINYINT(1) DEFAULT 1,
            expires_at DATETIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX (session_code),
            INDEX (subject_id),
            INDEX (teacher_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "✔ Table 'attendance_sessions' created or already exists.<br>";

    // 2. Add columns to student_attendance if they don't exist
    $cols = $pdo->query("SHOW COLUMNS FROM student_attendance")->fetchAll(PDO::FETCH_COLUMN);

    if (!in_array('session_id', $cols)) {
        $pdo->exec("ALTER TABLE student_attendance ADD COLUMN session_id INT DEFAULT NULL AFTER marked_by");
        echo "✔ Column 'session_id' added to 'student_attendance'.<br>";
    }

    if (!in_array('ip_address', $cols)) {
        $pdo->exec("ALTER TABLE student_attendance ADD COLUMN ip_address VARCHAR(45) DEFAULT NULL AFTER session_id");
        echo "✔ Column 'ip_address' added to 'student_attendance'.<br>";
    }

    echo "<h3>Migration Successful!</h3>";
    echo "The Smart Attendance system is now ready for use.";

} catch (Exception $e) {
    http_response_code(500);
    echo "<h3>Migration Failed!</h3>";
    echo "Error: " . $e->getMessage();
}
