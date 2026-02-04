<?php

/**
 * Health Check Endpoint
 * Non-authenticated endpoint to verify backend is reachable
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// Load database config to test connection
require_once __DIR__ . '/../config/database.php';

$response = [
    'status' => 'healthy',
    'timestamp' => date('Y-m-d H:i:s'),
    'php_version' => phpversion(),
    'database' => 'disconnected'
];

// Try database connection
try {
    $pdo = getDBConnection();
    $stmt = $pdo->query("SELECT 1");
    if ($stmt) {
        $response['database'] = 'connected';

        // Count tables
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $response['tables_count'] = count($tables);
    }
} catch (Exception $e) {
    $response['database'] = 'error';
    $response['error'] = $e->getMessage();
}

echo json_encode($response, JSON_PRETTY_PRINT);
