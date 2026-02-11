<?php

/**
 * Notifications API
 * Manages in-app notifications for students
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

try {
    switch ($method) {
        case 'GET':
            handleGet($pdo);
            break;
        case 'POST':
            handlePost($pdo);
            break;
        case 'PUT':
            handlePut($pdo);
            break;
        case 'DELETE':
            handleDelete($pdo);
            break;
        case 'OPTIONS':
            exit(0);
        default:
            sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    sendError('An error occurred', 500, $e->getMessage());
}

function handleGet($pdo)
{
    $user = requireAuth();
    $userId = $user['user_id'];
    $unreadOnly = isset($_GET['unread']) && $_GET['unread'] === 'true';

    // Removed createNotificationsTable($pdo);

    $sql = "SELECT * FROM notifications WHERE user_id = ?";
    $params = [$userId];
    if ($unreadOnly) {
        $sql .= " AND is_read = 0";
    }

    $sql .= " ORDER BY created_at DESC LIMIT 50";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get unread count
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0");
    $stmt->execute([$userId]);
    $unreadCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    sendResponse([
        'success' => true,
        'data' => [
            'notifications' => $notifications,
            'unread_count' => (int) $unreadCount
        ]
    ]);
}

function handlePost($pdo)
{
    // Usually notifications are created by system/teachers/admins for users
    requireAuth(); // Assuming any logged in user can create a notification? Or restricted?
    // Let's assume restricted to admin/teacher or system logic.
    // The original code allowed any auth user to post notifications (maybe self notifications?).
    // I'll keep it requireAuth() but ideally should be stricter if it's broadcasting.
    // But the code says: `user_id` from input OR current user. 
    // If input has `user_id`, we should check permission if it's different.

    $user = getAuthUser();
    $data = getJsonInput();

    $targetUserId = $data['user_id'] ?? $user['user_id'];

    // If targeting someone else, must be admin/teacher
    if ($targetUserId != $user['user_id']) {
        requireRole(['admin', 'teacher']);
    }

    $stmt = $pdo->prepare("
        INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, 0, NOW())
    ");
    $stmt->execute([
        $targetUserId,
        $data['type'] ?? 'info',
        $data['title'],
        $data['message'],
        $data['link'] ?? null
    ]);

    sendResponse([
        'success' => true,
        'message' => 'Notification created',
        'id' => $pdo->lastInsertId()
    ], 201);
}

function handlePut($pdo)
{
    $user = requireAuth();
    $data = getJsonInput();
    $action = $data['action'] ?? null;

    if ($action === 'mark_read') {
        $notificationId = $data['notification_id'] ?? null;
        if ($notificationId) {
            // Mark single notification as read
            $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?");
            $stmt->execute([$notificationId, $user['user_id']]);
        } else {
            // Mark all as read
            $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?");
            $stmt->execute([$user['user_id']]);
        }

        sendResponse(['success' => true, 'message' => 'Marked as read']);
    } else {
        sendError('Invalid action');
    }
}

function handleDelete($pdo)
{
    $user = requireAuth();
    $notificationId = filter_input(INPUT_GET, 'id', FILTER_SANITIZE_NUMBER_INT);

    if ($notificationId) {
        $stmt = $pdo->prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?");
        $stmt->execute([$notificationId, $user['user_id']]);
        sendResponse(['success' => true, 'message' => 'Notification deleted']);
    } else {
        sendError('Notification ID required');
    }
}
