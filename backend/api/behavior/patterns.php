<?php
/**
 * Learning Behavior Analysis - Get Behavior Patterns
 * GET /api/behavior/patterns.php?user_id=5&weeks=8
 * 
 * Retrieves pre-computed weekly behavior patterns for a student
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
$targetUserId = isset($_GET['user_id']) ? (int) $_GET['user_id'] : $userId;
$weeks = isset($_GET['weeks']) ? min((int) $_GET['weeks'], 52) : 8;

// Authorization check
if ($targetUserId != $userId && $userRole === 'student') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Forbidden']);
    exit;
}

try {
    $pdo = getDBConnection();

    // Get behavior patterns
    $stmt = $pdo->prepare('
        SELECT 
            bp.*,
            u.full_name as student_name,
            u.email as student_email
        FROM behavior_patterns bp
        JOIN users u ON bp.user_id = u.id
        WHERE bp.user_id = ? 
        AND bp.week_start >= DATE_SUB(CURDATE(), INTERVAL ? WEEK)
        ORDER BY bp.week_start DESC
    ');
    $stmt->execute([$targetUserId, $weeks]);
    $patterns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Parse JSON fields
    foreach ($patterns as &$pattern) {
        if (isset($pattern['risk_factors']) && $pattern['risk_factors']) {
            $pattern['risk_factors'] = json_decode($pattern['risk_factors'], true);
        }
    }

    // Calculate trend summary
    $trendSummary = null;
    if (count($patterns) >= 2) {
        $current = $patterns[0];
        $previous = $patterns[1];

        $trendSummary = [
            'engagement_trend' => calculateTrend($current['overall_engagement_score'], $previous['overall_engagement_score']),
            'activity_trend' => calculateTrend($current['total_logins'], $previous['total_logins']),
            'consistency_trend' => calculateTrend($current['study_consistency_score'], $previous['study_consistency_score']),
            'risk_trend' => calculateTrend($previous['risk_score'], $current['risk_score']) // Inverse for risk
        ];
    }

    echo json_encode([
        'success' => true,
        'patterns' => $patterns,
        'trend_summary' => $trendSummary,
        'weeks' => $weeks,
        'user_id' => $targetUserId
    ]);

} catch (Exception $e) {
    error_log('Get patterns error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to retrieve patterns']);
}

/**
 * Calculate trend direction
 */
function calculateTrend($current, $previous)
{
    if ($previous == 0)
        return 'stable';
    $change = (($current - $previous) / $previous) * 100;

    if ($change > 10)
        return 'improving';
    if ($change < -10)
        return 'declining';
    return 'stable';
}
