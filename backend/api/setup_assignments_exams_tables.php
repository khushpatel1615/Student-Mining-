<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();

    // Create assignments table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS assignments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            subject_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            due_date DATETIME NOT NULL,
            max_marks INT DEFAULT 100,
            created_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    // Create assignment_submissions table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS assignment_submissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            assignment_id INT NOT NULL,
            student_id INT NOT NULL,
            submission_text TEXT,
            file_path VARCHAR(500),
            marks_obtained INT,
            feedback TEXT,
            status ENUM('pending', 'submitted', 'graded') DEFAULT 'pending',
            submitted_at TIMESTAMP NULL,
            graded_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY unique_submission (assignment_id, student_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    // Create exams table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS exams (
            id INT AUTO_INCREMENT PRIMARY KEY,
            subject_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            exam_type ENUM('quiz', 'midterm', 'final', 'practical', 'other') DEFAULT 'midterm',
            start_datetime DATETIME NOT NULL,
            duration_minutes INT DEFAULT 120,
            max_marks INT DEFAULT 100,
            created_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    // Create exam_results table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS exam_results (
            id INT AUTO_INCREMENT PRIMARY KEY,
            exam_id INT NOT NULL,
            student_id INT NOT NULL,
            marks_obtained DECIMAL(5,2) NOT NULL,
            remarks TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY unique_result (exam_id, student_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    echo "✅ All tables created successfully!\n";
    echo "- assignments\n";
    echo "- assignment_submissions\n";
    echo "- exams\n";
    echo "- exam_results\n";

} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>