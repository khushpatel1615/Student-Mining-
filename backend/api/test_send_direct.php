<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

// Simulate the API call that happens when you click "Send Alert Now"
$_GET['action'] = 'send';
$_SERVER['REQUEST_METHOD'] = 'POST';

// Create a fake admin token (you'll need to replace this with a real one)
// For now, let's bypass auth for testing
define('SKIP_AUTH_FOR_TEST', true);

// Capture any errors
ob_start();

try {
    require_once __DIR__ . '/risk_alerts.php';
} catch (Exception $e) {
    ob_end_clean();
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], JSON_PRETTY_PRINT);
}

$output = ob_get_clean();
echo $output;
?>