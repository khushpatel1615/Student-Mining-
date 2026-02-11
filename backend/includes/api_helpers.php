<?php

/**
 * API Helper Functions
 * Standardized response formatting and validation
 */

// Generate a unique request ID if not already set
if (!defined('REQUEST_ID')) {
    define('REQUEST_ID', uniqid('req_', true));
}

/**
 * Send JSON Response
 *
 * @param array $data Data to send
 * @param int $statusCode HTTP status code (default: 200)
 */
function sendResponse($data, $statusCode = 200)
{
    // Clear buffer
    while (ob_get_level()) {
        ob_end_clean();
    }

    // Add Request ID to response
    if (is_array($data)) {
        $data['requestId'] = REQUEST_ID;
    }

    // Log the response
    logRequest($statusCode, null);

    header('Content-Type: application/json; charset=utf-8');
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

/**
 * Send Error Response
 *
 * @param string $message Error message
 * @param int $statusCode HTTP status code (default: 400)
 * @param mixed $details Optional debug details
 * @param string $errorCode Optional specific error code
 */
function sendError($message, $statusCode = 400, $details = null, $errorCode = null)
{
    $response = [
        'success' => false,
        'status' => 'error',
        'error' => $message,
        'requestId' => REQUEST_ID
    ];

    if ($errorCode) {
        $response['code'] = $errorCode;
    }

    // Only show details in development environment
    if ($details && (getenv('APP_ENV') === 'dev' || getenv('APP_ENV') === 'development')) {
        $response['details'] = $details;
    }

    // Log the error
    logRequest($statusCode, $message);

    // Clear buffer
    while (ob_get_level()) {
        ob_end_clean();
    }

    header('Content-Type: application/json; charset=utf-8');
    http_response_code($statusCode);
    echo json_encode($response);
    exit;
}

/**
 * Log Request details
 */
function logRequest($statusCode, $error = null)
{
    if (php_sapi_name() === 'cli')
        return;

    $logData = [
        'requestId' => REQUEST_ID,
        'timestamp' => date('c'),
        'method' => $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN',
        'uri' => $_SERVER['REQUEST_URI'] ?? 'UNKNOWN',
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN',
        'statusCode' => $statusCode,
        'durationMs' => (microtime(true) - $_SERVER['REQUEST_TIME_FLOAT']) * 1000,
    ];

    if ($error) {
        $logData['error'] = $error;
    }

    // Check for user ID in session or token if available (simple check)
    // This assumes auth middleware might have run and set something, but we can't be sure here.
    // If we have a global constant or variable for user, we could log it.

    // Write to a structured log file (e.g., daily json log)
    // Ensure logs directory exists
    $logDir = __DIR__ . '/../logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }

    $logFile = $logDir . '/api_requests_' . date('Y-m-d') . '.log';
    @file_put_contents($logFile, json_encode($logData) . "\n", FILE_APPEND);
}

/**
 * Get Parsed JSON Input
 *
 * @return array|null Parsed JSON or null on error
 */
function getJsonInput()
{
    $content = file_get_contents('php://input');
    $data = json_decode($content, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return null;
    }
    return $data;
}

/**
 * Ensure Request Method
 *
 * @param string|array $allowedMethods e.g. 'POST' or ['POST', 'PUT']
 */
function requireMethod($allowedMethods)
{
    $method = $_SERVER['REQUEST_METHOD'];
    $allowed = (array) $allowedMethods;
    if (!in_array($method, $allowed)) {
        // Special handling for OPTIONS handled by cors.php, but if we get here
        if ($method === 'OPTIONS') {
            exit;
        }

        sendError("Method $method Not Allowed", 405);
    }
}
