<?php
/**
 * Learning Behavior Analysis - Get Learning Sessions
 * GET /api/behavior/sessions.php?user_id=5&weeks=4
 * 
 * Retrieves learning session history for a user
 */

require_once __DIR__ . '/../../includes/jwt.php';
require_once __DIR__ . '/../../config/database.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
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
$userRole = $validation['payload']['role'];

// Get query parameters
$weeks = isset($_GET['weeks']) ? (int) $_GET['weeks'] : 4;
$limit = isset($_GET['limit']) ? min((int) $_GET['limit'], 500) : 100;
$offset = isset($_GET['offset']) ? (int) $_GET['offset'] : 0;
$targetUserId = isset($_GET['user_id']) ? (int) $_GET['user_id'] : $userId;

// Authorization check: Only admins/teachers can view other users' sessions
if ($targetUserId != $userId && $userRole === 'student') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Forbidden']);
    exit;
}

try {
    $pdo = getDBConnection();

    // Get total count
    $countStmt = $pdo->prepare('
        SELECT COUNT(*) as total FROM learning_sessions 
        WHERE user_id = ? 
        AND session_start >= DATE_SUB(NOW(), INTERVAL ? WEEK)
    ');
    $countStmt->execute([$targetUserId, $weeks]);
    $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Get sessions
    $stmt = $pdo->prepare('
        SELECT 
            ls.*,
            s.name as subject_name,
            s.code as subject_code
        FROM learning_sessions ls
        LEFT JOIN subjects s ON ls.subject_id = s.id
        WHERE ls.user_id = ? 
        AND ls.session_start >= DATE_SUB(NOW(), INTERVAL ? WEEK)
        ORDER BY ls.session_start DESC 
        LIMIT ? OFFSET ?
    ');
    $stmt->execute([$targetUserId, $weeks, $limit, $offset]);
    $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Calculate summary statistics
    $summaryStmt = $pdo->prepare('
        SELECT 
            COUNT(*) as total_sessions,
            SUM(duration_seconds) as total_duration_seconds,
            AVG(duration_seconds) as avg_duration_seconds,
            COUNT(DISTINCT DATE(session_start)) as unique_days,
            COUNT(CASE WHEN content_type = "video" THEN 1 END) as video_sessions,
            COUNT(CASE WHEN content_type = "assignment" THEN 1 END) as assignment_sessions,
            COUNT(CASE WHEN content_type = "quiz" THEN 1 END) as quiz_sessions,
            COUNT(CASE WHEN content_type = "discussion" THEN 1 END) as discussion_sessions
        FROM learning_sessions 
        WHERE user_id = ? 
        AND session_start >= DATE_SUB(NOW(), INTERVAL ? WEEK)
    ');
    $summaryStmt->execute([$targetUserId, $weeks]);
    $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'sessions' => $sessions,
        'summary' => $summary,
        'pagination' => [
            'total' => (int) $total,
            'limit' => $limit,
            'offset' => $offset,
            'weeks' => $weeks
        ]
    ]);

} catch (Exception $e) {
    error_log('Get sessions error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to retrieve sessions']);
}
