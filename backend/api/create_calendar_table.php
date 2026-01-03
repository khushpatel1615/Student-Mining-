<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();

    // Create academic_calendar table
    $sql = "CREATE TABLE IF NOT EXISTS academic_calendar (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        event_date DATE NOT NULL,
        type ENUM('exam', 'holiday', 'deadline', 'event') NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";

    $pdo->exec($sql);
    echo "Table 'academic_calendar' created successfully.\n";

    // Insert some sample data if empty
    $stmt = $pdo->query("SELECT COUNT(*) FROM academic_calendar");
    if ($stmt->fetchColumn() == 0) {
        $sampleEvents = [
            ['Mid-Term Exams', date('Y-m-d', strtotime('+2 weeks')), 'exam', 'Mid-semester examinations for all programs'],
            ['Winter Break', date('Y-m-d', strtotime('+1 month')), 'holiday', 'University closed for winter break'],
            ['Project Submission', date('Y-m-d', strtotime('+3 weeks')), 'deadline', 'Final year project submission deadline'],
            ['Guest Lecture', date('Y-m-d', strtotime('+1 week')), 'event', 'Guest lecture on Data Science']
        ];

        $stmt = $pdo->prepare("INSERT INTO academic_calendar (title, event_date, type, description) VALUES (?, ?, ?, ?)");
        foreach ($sampleEvents as $event) {
            $stmt->execute($event);
        }
        echo "Sample calendar data inserted.\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>