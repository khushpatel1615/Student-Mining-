<?php
/**
 * Discussion Forums API
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

createForumTables($pdo);

try {
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    if ($method === 'GET') {
        $action = $_GET['action'] ?? 'list';
        $subjectId = $_GET['subject_id'] ?? null;

        if ($action === 'list') {
            if ($subjectId) {
                $stmt = $pdo->prepare("SELECT d.*, u.full_name as author_name, u.avatar,
                    (SELECT COUNT(*) FROM discussion_replies WHERE discussion_id = d.id) as reply_count
                    FROM discussions d JOIN users u ON d.user_id = u.id 
                    WHERE d.subject_id = ? ORDER BY d.is_pinned DESC, d.created_at DESC");
                $stmt->execute([$subjectId]);
            } else {
                $stmt = $pdo->query("SELECT d.*, u.full_name as author_name, s.name as subject_name,
                    (SELECT COUNT(*) FROM discussion_replies WHERE discussion_id = d.id) as reply_count
                    FROM discussions d JOIN users u ON d.user_id = u.id JOIN subjects s ON d.subject_id = s.id
                    ORDER BY d.is_pinned DESC, d.created_at DESC LIMIT 50");
            }
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } elseif ($action === 'view') {
            $id = $_GET['id'];
            $stmt = $pdo->prepare("SELECT d.*, u.full_name as author_name, u.avatar FROM discussions d JOIN users u ON d.user_id = u.id WHERE d.id = ?");
            $stmt->execute([$id]);
            $discussion = $stmt->fetch(PDO::FETCH_ASSOC);

            $stmt = $pdo->prepare("SELECT r.*, u.full_name as author_name, u.avatar FROM discussion_replies r JOIN users u ON r.user_id = u.id WHERE r.discussion_id = ? ORDER BY r.created_at ASC");
            $stmt->execute([$id]);
            $discussion['replies'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $pdo->prepare("UPDATE discussions SET views = views + 1 WHERE id = ?")->execute([$id]);
            echo json_encode(['success' => true, 'data' => $discussion]);
        }
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? 'create';

        if ($action === 'create') {
            $stmt = $pdo->prepare("INSERT INTO discussions (subject_id, user_id, title, content, category) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$data['subject_id'], $user['user_id'], $data['title'], $data['content'], $data['category'] ?? 'general']);
            echo json_encode(['success' => true, 'message' => 'Discussion created', 'id' => $pdo->lastInsertId()]);
        } elseif ($action === 'reply') {
            $stmt = $pdo->prepare("INSERT INTO discussion_replies (discussion_id, user_id, content) VALUES (?, ?, ?)");
            $stmt->execute([$data['discussion_id'], $user['user_id'], $data['content']]);
            echo json_encode(['success' => true, 'message' => 'Reply added']);
        } elseif ($action === 'pin' && ($user['role'] === 'admin' || $user['role'] === 'teacher')) {
            $pdo->prepare("UPDATE discussions SET is_pinned = NOT is_pinned WHERE id = ?")->execute([$data['id']]);
            echo json_encode(['success' => true]);
        }
    } elseif ($method === 'DELETE') {
        $data = json_decode(file_get_contents('php://input'), true);
        if ($user['role'] === 'admin' || $user['role'] === 'teacher') {
            $pdo->prepare("DELETE FROM discussions WHERE id = ?")->execute([$data['id']]);
            echo json_encode(['success' => true, 'message' => 'Deleted']);
        }
    } elseif ($method === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function createForumTables($pdo)
{
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS discussions (
            id INT PRIMARY KEY AUTO_INCREMENT, subject_id INT, user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL, content TEXT, category VARCHAR(50) DEFAULT 'general',
            is_pinned BOOLEAN DEFAULT FALSE, views INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_subject (subject_id))");
        $pdo->exec("CREATE TABLE IF NOT EXISTS discussion_replies (
            id INT PRIMARY KEY AUTO_INCREMENT, discussion_id INT NOT NULL, user_id INT NOT NULL,
            content TEXT, is_best_answer BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_discussion (discussion_id))");
    } catch (PDOException $e) {
    }
}
?>