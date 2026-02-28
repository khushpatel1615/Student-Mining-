<?php
$pdo = new PDO('mysql:host=localhost;dbname=student_data_mining', 'root', '');

echo "Activity Logs check:\n";
$sql = "SELECT user_id, action, COUNT(*) as c FROM activity_logs GROUP BY user_id, action HAVING c > 1";
$res = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
print_r($res);

echo "\nActivity Logs details for user 1 login:\n";
$sql = "SELECT id, user_id, action, created_at FROM activity_logs WHERE user_id = 1 AND action = 'login' ORDER BY created_at LIMIT 10";
$res = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
print_r($res);

echo "\nAcademic Calendar check:\n";
$sql = "SELECT title, event_date, type, COUNT(*) as c FROM academic_calendar GROUP BY title, event_date, type HAVING c > 1";
$res = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
print_r($res);
