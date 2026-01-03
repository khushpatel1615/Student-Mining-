<?php
/**
 * Academic Calendar API
 * Fetches upcoming academic events
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

try {
    if ($method === 'GET') {
        handleGet($pdo);
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function handleGet($pdo)
{
    // 1. Verify User
    $token = getTokenFromHeader();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'No token provided']);
        return;
    }

    $result = verifyToken($token);
    if (!$result['valid']) {
        http_response_code(401);
        echo json_encode(['error' => $result['error']]);
        return;
    }

    $user = $result['payload'];
    if ($user['role'] !== 'student') {
        http_response_code(403);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    // 2. Fetch Events (Upcoming first)
    // We filter to show events from today onwards, or recently passed (e.g. last 7 days)
    $stmt = $pdo->prepare("
        SELECT * FROM academic_calendar 
        WHERE event_date >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)
        ORDER BY event_date ASC
        LIMIT 20
    ");
    $stmt->execute();
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $events
    ]);
}
?>