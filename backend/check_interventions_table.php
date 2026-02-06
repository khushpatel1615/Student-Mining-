<?php
require_once __DIR__ . '/config/database.php';

try {
    $pdo = getDBConnection();
    echo "Database connection successful.\n";

    // DROP TABLE to ensure we have the correct schema
    $pdo->exec("DROP TABLE IF EXISTS interventions");
    echo "Dropped existing 'interventions' table.\n";

    // Check if table exists (it won't)
    $stmt = $pdo->query("SHOW TABLES LIKE 'interventions'");
    $tableExists = $stmt->fetch();

    if ($tableExists) {
        echo "Table 'interventions' ALREADY EXISTS.\n";

        // Describe table to check columns
        echo "Table columns: ";
        $stmt = $pdo->query("DESCRIBE interventions");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo implode(", ", $columns) . "\n";
    } else {
        echo "Table 'interventions' DOES NOT exist. Creating it now...\n";

        $sql = "
        CREATE TABLE IF NOT EXISTS interventions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            created_by INT DEFAULT NULL,
            
            -- Intervention Details
            intervention_type ENUM(
                'email', 'message', 'meeting', 'call', 'warning',
                'support_referral', 'grade_recovery', 'schedule_change', 'other'
            ) NOT NULL,
            
            title VARCHAR(255) NOT NULL,
            description TEXT,
            notes TEXT,
            
            -- Status & Outcome
            status ENUM('pending', 'in_progress', 'successful', 'unsuccessful', 'closed') DEFAULT 'pending',
            outcome_description TEXT,
            
            -- Follow-up
            effectiveness_rating INT DEFAULT NULL,
            follow_up_date DATE DEFAULT NULL,
            follow_up_required BOOLEAN DEFAULT 0,
            
            -- Risk Context
            triggered_by_risk_score DECIMAL(5,2) DEFAULT NULL,
            risk_factors_identified JSON DEFAULT NULL,
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            closed_at TIMESTAMP NULL,
            
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
            
            INDEX idx_student (student_id),
            INDEX idx_creator (created_by),
            INDEX idx_status (status),
            INDEX idx_type (intervention_type),
            INDEX idx_created (created_at),
            INDEX idx_follow_up (follow_up_date),
            INDEX idx_student_status (student_id, status),
            INDEX idx_open_interventions (status, follow_up_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";

        $pdo->exec($sql);
        echo "Table 'interventions' successfully created.\n";
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
