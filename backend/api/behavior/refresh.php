<?php
/**
 * Force Refresh Behavior Patterns API
 * Triggers re-calculation of risk scores for all students
 */

require_once __DIR__ . '/../../includes/jwt.php';
require_once __DIR__ . '/../../config/database.php';

setCORSHeaders();

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authenticate
$headers = getallheaders();
$token = null;
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $token = $matches[1];
}

$validation = verifyToken($token);
if (!$validation['valid']) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// Only admin/teachers can refresh
if (!in_array($validation['payload']['role'], ['admin', 'teacher'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Permission denied']);
    exit;
}

set_time_limit(300); // Allow 5 minutes for computation

try {
    $pdo = getDBConnection();

    // Run the computation in-process to avoid exec/CLI failures
    define('BEHAVIOR_COMPUTE_LIB', true);
    require_once __DIR__ . '/../../cron/compute_behavior_patterns.php';

    if (!function_exists('runBehaviorPatternComputation')) {
        throw new Exception('Computation function not available.');
    }

    $result = runBehaviorPatternComputation($pdo, 'all');

    echo json_encode([
        'success' => true,
        'message' => 'Analysis refreshed successfully',
        'details' => ($result['processed'] ?? 0) . ' students processed',
        'processed' => $result['processed'] ?? 0,
        'errors' => $result['errors'] ?? 0,
        'execution_time' => $result['execution_time'] ?? 0
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
