<?php
/**
 * Learning Behavior Analysis - Log Activity Endpoint
 * POST /api/behavior/log_activity.php
 * 
 * Logs user learning activities (page views, video interactions, etc.)
 */

require_once __DIR__ . '/../../includes/jwt.php';
require_once __DIR__ . '/../../config/database.php';

setCORSHeaders();

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Authenticate user
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

$userId = $validation['payload']['user_id'];

// Get input
$input = json_decode(file_get_contents('php://input'), true);

if (empty($input['action']) || empty($input['content_type'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields: action, content_type']);
    exit;
}

// Validate content_type
$validContentTypes = ['video', 'reading', 'assignment', 'quiz', 'discussion', 'page_view', 'other'];
$contentType = in_array($input['content_type'], $validContentTypes) ? $input['content_type'] : 'other';

try {
    $pdo = getDBConnection();
    
    // Calculate session times
    $durationSeconds = isset($input['duration_seconds']) ? (int)$input['duration_seconds'] : 0;
    $sessionStart = isset($input['session_start']) ? $input['session_start'] : date('Y-m-d H:i:s');
    
    $stmt = $pdo->prepare('
        INSERT INTO learning_sessions 
        (user_id, subject_id, content_type, content_id, content_title, 
         session_start, session_end, duration_seconds, is_completed, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 
                DATE_ADD(?, INTERVAL ? SECOND), ?, ?, ?, NOW())
    ');
    
    $stmt->execute([
        $userId,
        $input['subject_id'] ?? null,
        $contentType,
        $input['content_id'] ?? null,
        $input['content_title'] ?? $input['action'] ?? null,
        $sessionStart,
        $sessionStart,
        $durationSeconds,
        isset($input['is_completed']) ? (int)$input['is_completed'] : 0,
        isset($input['metadata']) ? json_encode($input['metadata']) : null
    ]);
    
    $sessionId = $pdo->lastInsertId();
    
    echo json_encode([
        'success' => true, 
        'session_id' => $sessionId,
        'message' => 'Activity logged successfully'
    ]);
    
} catch (Exception $e) {
    error_log('Activity logging error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to log activity']);
}
