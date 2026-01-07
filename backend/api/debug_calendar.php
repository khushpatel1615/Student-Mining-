<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();

    echo "=== CALENDAR EVENTS IN DATABASE ===\n";
    $stmt = $pdo->query("SELECT id, title, event_date, type, target_audience, target_dept_id, target_semester, created_by FROM academic_calendar ORDER BY event_date");
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($events as $event) {
        echo "\nEvent ID: {$event['id']}\n";
        echo "Title: {$event['title']}\n";
        echo "Date: {$event['event_date']}\n";
        echo "Type: {$event['type']}\n";
        echo "Target Audience: {$event['target_audience']}\n";
        echo "Target Dept ID: " . ($event['target_dept_id'] ?? 'NULL') . "\n";
        echo "Target Semester: " . ($event['target_semester'] ?? 'NULL') . "\n";
        echo "Created By: {$event['created_by']}\n";
        echo "---\n";
    }

    echo "\n\n=== SAMPLE STUDENT DATA ===\n";
    $stmt = $pdo->query("SELECT id, first_name, last_name, department_id, semester FROM students LIMIT 3");
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($students as $student) {
        echo "\nStudent ID: {$student['id']}\n";
        echo "Name: {$student['first_name']} {$student['last_name']}\n";
        echo "Department ID: " . ($student['department_id'] ?? 'NULL') . "\n";
        echo "Semester: " . ($student['semester'] ?? 'NULL') . "\n";
        echo "---\n";
    }

    // Test the query for a specific student
    echo "\n\n=== TESTING STUDENT QUERY ===\n";
    if (!empty($students)) {
        $testStudentId = $students[0]['id'];
        $testDept = $students[0]['department_id'];
        $testSem = $students[0]['semester'];

        echo "Testing for Student ID: $testStudentId (Dept: $testDept, Sem: $testSem)\n\n";

        $sql = "SELECT ac.*, s.name as subject_name 
                FROM academic_calendar ac
                LEFT JOIN subjects s ON ac.target_subject_id = s.id 
                WHERE (ac.target_audience IN ('all', 'students') ";

        $params = [];
        if ($testDept !== null) {
            $sql .= " OR (ac.target_audience = 'department' AND ac.target_dept_id = ?) ";
            $params[] = $testDept;
        }
        if ($testSem !== null) {
            $sql .= " OR (ac.target_audience = 'semester' AND ac.target_semester = ?) ";
            $params[] = $testSem;
        }
        $sql .= ") ORDER BY ac.event_date ASC";

        echo "SQL: $sql\n";
        echo "Params: " . json_encode($params) . "\n\n";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $studentEvents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo "Events returned for this student: " . count($studentEvents) . "\n";
        foreach ($studentEvents as $event) {
            echo "- {$event['title']} ({$event['event_date']})\n";
        }
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>