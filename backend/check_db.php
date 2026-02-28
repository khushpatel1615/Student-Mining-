<?php
require_once 'config/database.php';
$pdo = getDBConnection();

$queries = [
    'teacher_subjects' => "SELECT ts.*, s.name, u.email 
                           FROM teacher_subjects ts 
                           JOIN subjects s ON ts.subject_id = s.id 
                           JOIN users u ON ts.teacher_id = u.id 
                           WHERE u.email = 'teacher@college.edu'",
    'student_enrollments' => "SELECT se.*, s.name as subject_name, u.full_name as student_name
                             FROM student_enrollments se
                             JOIN subjects s ON se.subject_id = s.id
                             JOIN users u ON se.user_id = u.id
                             WHERE u.email = 'student@college.edu' AND se.status = 'active'"
];

foreach ($queries as $label => $sql) {
    echo "--- $label ---\n";
    $stmt = $pdo->query($sql);
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
}
