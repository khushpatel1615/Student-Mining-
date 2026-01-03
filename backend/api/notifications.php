<?php
/**
 * Notifications API
 * Handles fetching and updating user notifications
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

try {
    switch ($method) {
        case 'GET':
            handleGet($pdo);
            break;
        case 'PUT':
            handlePut($pdo);
            break;
        case 'OPTIONS':
            http_response_code(200);
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

/**
 * GET - Fetch notifications
 */
function handleGet($pdo)
{
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
    $unreadOnly = isset($_GET['unread']) && $_GET['unread'] === 'true';

    $sql = "
        SELECT id, type, title, message, related_id, is_read, created_at
        FROM notifications
        WHERE user_id = ?
    ";

    if ($unreadOnly) {
        $sql .= " AND is_read = FALSE";
    }

    $sql .= " ORDER BY created_at DESC LIMIT ?";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(1, $user['user_id'], PDO::PARAM_INT);
    $stmt->bindValue(2, $limit, PDO::PARAM_INT);
    $stmt->execute();

    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get unread count
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = FALSE");
    $countStmt->execute([$user['user_id']]);
    $unreadCount = $countStmt->fetchColumn();

    echo json_encode([
        'success' => true,
        'data' => $notifications,
        'unread_count' => intval($unreadCount)
    ]);
}

/**
 * PUT - Mark as read
 */
function handlePut($pdo)
{
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (isset($data['mark_all_read']) && $data['mark_all_read'] === true) {
        $stmt = $pdo->prepare("UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE");
        $stmt->execute([$user['user_id']]);

        echo json_encode(['success' => true, 'message' => 'All marked as read']);
        return;
    }

    if (isset($data['id'])) {
        $stmt = $pdo->prepare("UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?");
        $stmt->execute([$data['id'], $user['user_id']]);

        echo json_encode(['success' => true, 'message' => 'Marked as read']);
        return;
    }

    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
}
