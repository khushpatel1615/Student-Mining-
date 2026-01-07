<?php
/**
 * Quick Migration Script - Execute directly
 */

require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();

    echo "Creating enhanced analytics tables...\n\n";

    // Table 1: Student Analytics
    $pdo->exec("CREATE TABLE IF NOT EXISTS student_analytics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        semester INT NOT NULL,
        current_gpa DECIMAL(3,2),
        semester_gpa DECIMAL(3,2),
        cumulative_gpa DECIMAL(3,2),
        credits_completed INT DEFAULT 0,
        credits_registered INT DEFAULT 0,
        attendance_percentage DECIMAL(5,2),
        classes_attended INT DEFAULT 0,
        classes_total INT DEFAULT 0,
        performance_tier ENUM('excellent', 'good', 'average', 'below_average', 'at_risk') DEFAULT 'average',
        percentile_rank DECIMAL(5,2),
        calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_student_semester (student_id, semester),
        INDEX idx_performance_tier (performance_tier),
        INDEX idx_semester (semester)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ student_analytics table created\n";

    // Table 2: Program Analytics
    $pdo->exec("CREATE TABLE IF NOT EXISTS program_analytics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        program_id INT NOT NULL,
        semester INT NOT NULL,
        total_students INT DEFAULT 0,
        active_students INT DEFAULT 0,
        average_gpa DECIMAL(3,2),
        median_gpa DECIMAL(3,2),
        pass_rate DECIMAL(5,2),
        fail_rate DECIMAL(5,2),
        dropout_rate DECIMAL(5,2),
        excellent_count INT DEFAULT 0,
        good_count INT DEFAULT 0,
        average_count INT DEFAULT 0,
        below_average_count INT DEFAULT 0,
        at_risk_count INT DEFAULT 0,
        calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
        UNIQUE KEY unique_program_semester (program_id, semester),
        INDEX idx_semester (semester)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ program_analytics table created\n";

    // Table 3: Subject Analytics
    $pdo->exec("CREATE TABLE IF NOT EXISTS subject_analytics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subject_id INT NOT NULL,
        semester INT NOT NULL,
        enrolled_students INT DEFAULT 0,
        average_grade DECIMAL(5,2),
        median_grade DECIMAL(5,2),
        pass_rate DECIMAL(5,2),
        fail_rate DECIMAL(5,2),
        difficulty_level ENUM('easy', 'moderate', 'hard', 'very_hard') DEFAULT 'moderate',
        grade_a_count INT DEFAULT 0,
        grade_b_count INT DEFAULT 0,
        grade_c_count INT DEFAULT 0,
        grade_d_count INT DEFAULT 0,
        grade_f_count INT DEFAULT 0,
        calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        UNIQUE KEY unique_subject_semester (subject_id, semester),
        INDEX idx_difficulty (difficulty_level)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ subject_analytics table created\n";

    // Table 4: Predictions
    $pdo->exec("CREATE TABLE IF NOT EXISTS predictions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        prediction_type ENUM('final_gpa', 'subject_grade', 'dropout_risk', 'graduation_time') NOT NULL,
        predicted_value VARCHAR(50),
        confidence_score DECIMAL(5,2),
        subject_id INT NULL,
        semester INT NOT NULL,
        method VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
        INDEX idx_student_type (student_id, prediction_type),
        INDEX idx_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ predictions table created\n";

    // Table 5: Recommendations
    $pdo->exec("CREATE TABLE IF NOT EXISTS recommendations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        recommendation_type ENUM('study_focus', 'time_management', 'course_selection', 'improvement_area', 'positive_feedback') NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
        subject_id INT NULL,
        related_metric VARCHAR(100),
        is_read BOOLEAN DEFAULT FALSE,
        is_dismissed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
        INDEX idx_student_active (student_id, is_dismissed),
        INDEX idx_priority (priority)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ recommendations table created\n";

    // Table 6: Grade History
    $pdo->exec("CREATE TABLE IF NOT EXISTS grade_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        grade_id INT NOT NULL,
        student_id INT NOT NULL,
        subject_id INT NOT NULL,
        old_grade DECIMAL(5,2),
        new_grade DECIMAL(5,2),
        old_letter_grade VARCHAR(5),
        new_letter_grade VARCHAR(5),
        changed_by INT NOT NULL,
        change_reason TEXT,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (changed_by) REFERENCES users(id),
        INDEX idx_grade (grade_id),
        INDEX idx_student (student_id),
        INDEX idx_changed_at (changed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ grade_history table created\n";

    // Table 7: Import Logs
    $pdo->exec("CREATE TABLE IF NOT EXISTS import_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        import_type ENUM('grades', 'attendance', 'students', 'enrollments') NOT NULL,
        filename VARCHAR(255),
        total_rows INT DEFAULT 0,
        successful_rows INT DEFAULT 0,
        failed_rows INT DEFAULT 0,
        error_log TEXT,
        imported_by INT NOT NULL,
        imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (imported_by) REFERENCES users(id),
        INDEX idx_import_type (import_type),
        INDEX idx_imported_at (imported_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ import_logs table created\n";

    echo "\n✅ All analytics tables created successfully!\n";

} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>