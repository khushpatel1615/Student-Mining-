<?php

require_once __DIR__ . '/../../config/database.php';
echo "Setting up Analytics Tables...\n";
$pdo = getDBConnection();
try {
// 1. Activity Logs (Engagement)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            action VARCHAR(50) NOT NULL, -- 'login', 'submission', 'view_page'
            details TEXT,
            ip_address VARCHAR(45),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    ");
    echo "Table 'activity_logs' check/create done.\n";
// 2. Student Risk Scores (computed features + score)
    // Storing features as JSON for flexibility in Phase A/B
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS student_risk_scores (
            user_id INT PRIMARY KEY,
            risk_score DECIMAL(5, 2) DEFAULT 0, -- 0 to 100
            risk_level VARCHAR(20), -- 'safe', 'at_risk', 'critical'
            attendance_score DECIMAL(5, 2), -- 0-100
            grade_avg DECIMAL(5, 2), -- 0-100
            engagement_score DECIMAL(5, 2), -- 0-100
            features_json JSON, -- Stores full feature profile (trends, streaks, etc.)
            risk_factors JSON, -- Array of reasons like ['Low Attendance', 'Grade Drop']
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    ");
    echo "Table 'student_risk_scores' check/create done.\n";
// 3. Alerts (Phase C/D)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS analytics_alerts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            type VARCHAR(50), -- 'risk_threshold', 'attendance_drop'
            message TEXT,
            severity VARCHAR(20), -- 'low', 'medium', 'high'
            status VARCHAR(20) DEFAULT 'new', -- 'new', 'resolved', 'dismissed'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    ");
    echo "Table 'analytics_alerts' check/create done.\n";
// 4. Interventions (Phase D)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS interventions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            type VARCHAR(50), -- 'counseling', 'tutor', 'email'
            reason TEXT,
            status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_progress', 'completed'
            outcome TEXT,
            assigned_to INT, -- Staff ID
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB;
    ");
    echo "Table 'interventions' check/create done.\n";
// 5. Intervention Templates (Phase D)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS intervention_templates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(100),
            description TEXT,
            action_type VARCHAR(50)
        ) ENGINE=InnoDB;
    ");
    echo "Table 'intervention_templates' check/create done.\n";
// Pre-populate templates if empty
    $stmt = $pdo->query("SELECT COUNT(*) FROM intervention_templates");
    if ($stmt->fetchColumn() == 0) {
        $pdo->exec("
            INSERT INTO intervention_templates (title, description, action_type) VALUES 
            ('Academic Counseling', 'Schedule a 1-on-1 session to discuss grades.', 'meeting'),
            ('Attendance Warning', 'Send warning email about low attendance.', 'email'),
            ('Assign Tutor', 'Assign a peer tutor for the failing subject.', 'assignment')
        ");
        echo "Inserted default intervention templates.\n";
    }

    echo "Database setup completed successfully.\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
