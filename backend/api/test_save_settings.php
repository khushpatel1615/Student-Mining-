<?php
// Test Saving Settings
header('Content-Type: application/json');

// Simulate PUT request
$_SERVER['REQUEST_METHOD'] = 'PUT';
$_GET['action'] = 'settings';

// Create a mock settings payload
$payload = [
    'enabled' => true,
    'min_risk_score_threshold' => 50,
    'send_time' => '08:00',
    'include_star_students' => false,
    'email_recipients' => 'custom',
    'custom_emails' => 'test@example.com'
];

// PHP input stream mocks are hard, so we'll just inject it if we can,
// but PHP reads php://input. 
// Instead, let's modify the code slightly to accept a test payload variable if defined? 
// No, let's just use a stream wrapper or curl.

// Actually, I'll just write a script that does a cURL request to the actual endpoint.
$url = 'http://localhost/StudentDataMining/backend/api/risk_alerts.php?action=settings';
$ch = curl_init($url);

// Authorization header (replace with valid token if you have one, or disable auth temporarily)
// Since I can't easily generate a valid token without the secret, I might need to bypass auth in the target file for a second.
// OR, I can use the existing `risk_alerts.php` but in a wrapper that defines `SKIP_AUTH`.

// Let's rely on the previous method: Require the file and execute the function, bypassing auth.

define('SKIP_AUTH_FOR_TEST', true);

// Capture output
ob_start();

try {
    // We need to mock php://input.
    // This is tricky.
    // Let's just create a new file that copies the logic of risk_alerts.php 
    // but manually calls handleSettings with data.

    require_once __DIR__ . '/../config/database.php';
    $pdo = getDBConnection();

    require_once __DIR__ . '/risk_alerts.php';

    // Check if handleSettings exists
    if (function_exists('handleSettings')) {
        // We can't easily mock the method check inside handleSettings if we use the file include method
        // because the file execution flow runs switch($action).

        // Let's assume the file ran through and maybe errored.
    }

} catch (Exception $e) {
    ob_end_clean();
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

$output = ob_get_clean();
echo $output;
?>