<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();

    // Drop table if exists to reset schema (Dev only)
    $pdo->exec("DROP TABLE IF EXISTS academic_calendar");

    // Create academic_calendar table
    $sql = "CREATE TABLE IF NOT EXISTS academic_calendar (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        event_date DATE NOT NULL,
        type ENUM('exam', 'holiday', 'deadline', 'event', 'assignment') NOT NULL,
        description TEXT,
        target_audience ENUM('all', 'students', 'teachers', 'department', 'program', 'semester', 'subject') DEFAULT 'all',
        target_dept_id INT NULL,
        target_program_id INT NULL,
        target_semester INT NULL,
        target_subject_id INT NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";

    $pdo->exec($sql);
    echo "Table 'academic_calendar' created successfully.\n";

    // Insert some sample data if empty
    $stmt = $pdo->query("SELECT COUNT(*) FROM academic_calendar");
    if ($stmt->fetchColumn() == 0) {
        $sampleEvents = [
            ['Mid-Term Exams', date('Y-m-d', strtotime('+2 weeks')), 'exam', 'Mid-semester examinations', 'all', null, null, null, null, 1],
            ['Winter Break', date('Y-m-d', strtotime('+1 month')), 'holiday', 'University closed', 'all', null, null, null, null, 1],
            ['CS Project Due', date('Y-m-d', strtotime('+3 weeks')), 'deadline', 'Final year project submission', 'department', 1, null, null, null, 1], // Assuming Dept 1 is CS
            ['Guest Lecture', date('Y-m-d', strtotime('+1 week')), 'event', 'Guest lecture on AI', 'all', null, null, null, null, 1]
        ];

        $stmt = $pdo->prepare("INSERT INTO academic_calendar (title, event_date, type, description, target_audience, target_dept_id, target_program_id, target_semester, target_subject_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        foreach ($sampleEvents as $event) {
            $stmt->execute($event);
        }
        echo "Sample calendar data inserted.\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>