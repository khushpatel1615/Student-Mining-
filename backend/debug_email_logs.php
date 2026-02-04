<?php
require_once __DIR__ . '/config/EnvLoader.php';
EnvLoader::load(__DIR__ . '/.env');

echo "=== CHECKING LOGS ===\n";
try {
    $dsn = "mysql:host=" . (getenv('DB_HOST') ?: 'localhost') . ";dbname=" . (getenv('DB_NAME') ?: 'student_data_mining') . ";charset=utf8mb4";
    $pdo = new PDO($dsn, getenv('DB_USER') ?: 'root', getenv('DB_PASS') ?: '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->query("SELECT id, sent_at, success, error_message FROM risk_alert_logs ORDER BY id DESC LIMIT 5");
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($logs as $log) {
        $status = $log['success'] ? "SUCCESS" : "FAILED";
        echo "[ID: {$log['id']}] {$log['sent_at']} - {$status}\n";
        if (!$log['success']) {
            echo "ERROR: {$log['error_message']}\n";
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>