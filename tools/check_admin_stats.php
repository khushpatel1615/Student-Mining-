<?php
$pdo = new PDO('mysql:host=localhost;dbname=student_data_mining', 'root', '');
// Check the stats the admin dashboard endpoint actually uses
echo "Total Students: " . $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = 1")->fetchColumn() . "\n";
echo "Total Programs: " . $pdo->query("SELECT COUNT(*) FROM programs")->fetchColumn() . "\n";
echo "Total Subjects: " . $pdo->query("SELECT COUNT(*) FROM subjects WHERE is_active = 1")->fetchColumn() . "\n";
echo "Total Teachers: " . $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'teacher' AND is_active = 1")->fetchColumn() . "\n";

// Emulate vw_student_performance to see what it returns
try {
    $res = $pdo->query("SELECT COUNT(*) as cnt FROM vw_student_performance")->fetch(PDO::FETCH_ASSOC);
    echo "Rows in vw_student_performance: " . $res['cnt'] . "\n";
    $res2 = $pdo->query("SELECT COUNT(DISTINCT user_id) as cnt FROM vw_student_performance")->fetch(PDO::FETCH_ASSOC);
    echo "Distinct users in vw_student_performance: " . $res2['cnt'] . "\n";
} catch (Exception $e) {
    echo "Error with view: " . $e->getMessage() . "\n";
}
