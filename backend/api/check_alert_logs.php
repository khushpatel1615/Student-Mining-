<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../config/database.php';

$pdo = getDBConnection();
$stmt = $pdo->query("SELECT id, sent_at, students_count, admins_notified, success, error_message FROM risk_alert_logs ORDER BY id DESC LIMIT 10");
$logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(['success' => true, 'logs' => $logs], JSON_PRETTY_PRINT);
?>