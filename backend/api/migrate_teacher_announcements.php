<?php
/**
 * Migration script to add teacher role and announcements functionality
 * Run this once to update the database schema
 */

require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $pdo = getDBConnection();

    // 1. Update users table to include teacher role
    $pdo->exec("ALTER TABLE users MODIFY COLUMN role ENUM('student', 'admin', 'teacher') NOT NULL DEFAULT 'student'");
    echo "✓ Updated users table to include teacher role\n";

    // 2. Create teacher_subjects table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS teacher_subjects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            teacher_id INT NOT NULL,
            subject_id INT NOT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
            UNIQUE KEY unique_assignment (teacher_id, subject_id),
            INDEX idx_teacher (teacher_id),
            INDEX idx_subject (subject_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✓ Created teacher_subjects table\n";

    // 3. Create announcements table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS announcements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            subject_id INT NOT NULL,
            teacher_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            is_pinned BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
            FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_subject (subject_id),
            INDEX idx_teacher (teacher_id),
            INDEX idx_created (created_at DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✓ Created announcements table\n";

    // 4. Insert a sample teacher for testing (password: password123)
    $stmt = $pdo->prepare("
        INSERT INTO users (email, student_id, password_hash, full_name, role) 
        VALUES ('teacher@college.edu', 'TCH001', :password, 'Jane Smith', 'teacher')
        ON DUPLICATE KEY UPDATE role = 'teacher'
    ");
    $stmt->execute(['password' => password_hash('password123', PASSWORD_DEFAULT)]);
    echo "✓ Created sample teacher (teacher@college.edu / password123)\n";

    echo "\n✅ Migration completed successfully!\n";

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Migration failed: ' . $e->getMessage()
    ]);
}
