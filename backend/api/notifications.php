<?php
/**
 * Notifications API
 * Manages in-app notifications for students
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
            http_response_code(200);
            exit();
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function handleGet($pdo)
{
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $userId = $user['user_id'];
    $unreadOnly = isset($_GET['unread']) && $_GET['unread'] === 'true';

    // Create notifications table if it doesn't exist
    createNotificationsTable($pdo);

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

    echo json_encode([
        'success' => true,
        'data' => [
            'notifications' => $notifications,
            'unread_count' => (int) $unreadCount
        ]
    ]);
}

function handlePost($pdo)
{
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    createNotificationsTable($pdo);

    $data = json_decode(file_get_contents('php://input'), true);

    // Create notification
    $stmt = $pdo->prepare("
        INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, 0, NOW())
    ");

    $stmt->execute([
        $data['user_id'] ?? $user['user_id'],
        $data['type'] ?? 'info',
        $data['title'],
        $data['message'],
        $data['link'] ?? null
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Notification created',
        'id' => $pdo->lastInsertId()
    ]);
}

function handlePut($pdo)
{
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);
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

        echo json_encode(['success' => true, 'message' => 'Marked as read']);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
    }
}

function handleDelete($pdo)
{
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $notificationId = $_GET['id'] ?? null;

    if ($notificationId) {
        $stmt = $pdo->prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?");
        $stmt->execute([$notificationId, $user['user_id']]);
    }

    echo json_encode(['success' => true, 'message' => 'Notification deleted']);
}

function createNotificationsTable($pdo)
{
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS notifications (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                type VARCHAR(50) DEFAULT 'info',
                title VARCHAR(255) NOT NULL,
                message TEXT,
                link VARCHAR(255),
                is_read TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_read (user_id, is_read),
                INDEX idx_created (created_at)
            )
        ");
    } catch (PDOException $e) {
        // Table might already exist
    }
}

// Helper function to create notifications (can be called from other APIs)
function createNotification($pdo, $userId, $type, $title, $message, $link = null)
{
    try {
        createNotificationsTable($pdo);

        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
            VALUES (?, ?, ?, ?, ?, 0, NOW())
        ");

        $stmt->execute([$userId, $type, $title, $message, $link]);
        return $pdo->lastInsertId();
    } catch (PDOException $e) {
        return false;
    }
}
?>