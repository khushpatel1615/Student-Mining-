<?php
// Let's debug what analytics/admin.php is actually returning vs. what is in the DB
$pdo = new PDO('mysql:host=localhost;dbname=student_data_mining', 'root', '');

// 1. the PHP logic
$stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = 1");
$realStudents = $stmt->fetchColumn();

// 2. what if someone counts vw_student_performance?
$stmt = $pdo->query("SELECT COUNT(*) FROM vw_student_performance");
$rowsInView = $stmt->fetchColumn();

// 3. what if someone counts distinct users in the view?
$stmt = $pdo->query("SELECT COUNT(DISTINCT user_id) FROM vw_student_performance");
$distinctInView = $stmt->fetchColumn();

// Output comparison
echo "Real Active Students logic: " . $realStudents . "\n";
echo "Rows in view (enrollments): " . $rowsInView . "\n";
echo "Distinct users in view: " . $distinctInView . "\n";

// Let's test the actual HTTP API response to see what the frontend gets
$ch = curl_init('http://localhost/StudentDataMining/backend/api/analytics/admin.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
// We need an admin JWT token for this. We can generate one to bypass auth, or just read the code inside admin.php.
