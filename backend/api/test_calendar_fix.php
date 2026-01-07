<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();

    // Simulate a student query (ID 3 is Khush Patel from our earlier debug)
    $userId = 3;
    $role = 'student';

    echo "=== Testing Calendar Query for Student ID: $userId ===\n\n";

    // Fetch student details
    $stmtUser = $pdo->prepare("SELECT program_id, current_semester FROM users WHERE id = ? AND role = 'student'");
    $stmtUser->execute([$userId]);
    $studentData = $stmtUser->fetch(PDO::FETCH_ASSOC);

    echo "Student Data:\n";
    print_r($studentData);
    echo "\n";

    // Build the query
    $sql = "SELECT ac.*, s.name as subject_name 
            FROM academic_calendar ac
            LEFT JOIN subjects s ON ac.target_subject_id = s.id 
            WHERE 1=1 ";
    $params = [];

    $sql .= " AND (ac.target_audience IN ('all', 'students') ";

    if ($studentData) {
        // Match department events if the student has a program_id
        if ($studentData['program_id']) {
            $sql .= " OR (ac.target_audience = 'department' AND ac.target_dept_id = ?) ";
            $params[] = $studentData['program_id'];

            $sql .= " OR (ac.target_audience = 'program' AND ac.target_program_id = ?) ";
            $params[] = $studentData['program_id'];
        }

        // Match semester-specific events
        if ($studentData['current_semester']) {
            $sql .= " OR (ac.target_audience = 'semester' AND ac.target_semester = ?) ";
            $params[] = $studentData['current_semester'];
        }
    }
    $sql .= ")";
    $sql .= " ORDER BY ac.event_date ASC";

    echo "SQL Query:\n$sql\n\n";
    echo "Parameters: " . json_encode($params) . "\n\n";

    // Execute query
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Events Returned: " . count($events) . "\n\n";

    foreach ($events as $event) {
        echo "---\n";
        echo "ID: {$event['id']}\n";
        echo "Title: {$event['title']}\n";
        echo "Date: {$event['event_date']}\n";
        echo "Type: {$event['type']}\n";
        echo "Target Audience: {$event['target_audience']}\n";
        if ($event['target_semester']) {
            echo "Target Semester: {$event['target_semester']}\n";
        }
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>