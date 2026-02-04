<?php
// Test the send alert endpoint directly
header('Content-Type: application/json');

// Capture all output
ob_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    // Simulate admin access
    $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer test';

    // Load the risk alerts API
    require_once __DIR__ . '/../config/database.php';
    require_once __DIR__ . '/../includes/jwt.php';

    // Create a mock admin user in the request
    $pdo = getDBConnection();

    echo json_encode([
        'test' => 'starting',
        'database' => 'connected'
    ]);

    // Now try to include the send script
    echo "\n\nTrying to execute send_risk_alerts.php...\n\n";

    // Set CLI to false to simulate web request
    define('TESTING_MODE', true);

    require_once __DIR__ . '/../cron/send_risk_alerts.php';

} catch (Exception $e) {
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}

$output = ob_get_clean();
echo $output;
?>