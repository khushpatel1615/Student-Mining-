<?php
/**
 * Video Lectures API
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

createVideoTables($pdo);

try {
    if ($method === 'GET') {
        $subjectId = $_GET['subject_id'] ?? null;
        $action = $_GET['action'] ?? 'list';

        if ($action === 'list' && $subjectId) {
            $stmt = $pdo->prepare("SELECT * FROM video_lectures WHERE subject_id = ? ORDER BY sequence_order, created_at");
            $stmt->execute([$subjectId]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } elseif ($action === 'progress') {
            $user = getAuthUser();
            $stmt = $pdo->prepare("SELECT vp.*, vl.title FROM video_progress vp 
                JOIN video_lectures vl ON vp.video_id = vl.id WHERE vp.user_id = ?");
            $stmt->execute([$user['user_id']]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } elseif ($action === 'featured') {
            $stmt = $pdo->query("SELECT vl.*, s.name as subject_name FROM video_lectures vl 
                JOIN subjects s ON vl.subject_id = s.id WHERE vl.is_featured = 1 ORDER BY vl.created_at DESC LIMIT 10");
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        }
    } elseif ($method === 'POST') {
        $user = getAuthUser();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? 'create';

        if ($action === 'create' && ($user['role'] === 'admin' || $user['role'] === 'teacher')) {
            $stmt = $pdo->prepare("INSERT INTO video_lectures (subject_id, title, description, video_url, 
                video_type, duration_minutes, sequence_order, thumbnail_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['subject_id'],
                $data['title'],
                $data['description'] ?? '',
                $data['video_url'],
                $data['video_type'] ?? 'youtube',
                $data['duration_minutes'] ?? 0,
                $data['sequence_order'] ?? 0,
                $data['thumbnail_url'] ?? ''
            ]);
            echo json_encode(['success' => true, 'message' => 'Video added', 'id' => $pdo->lastInsertId()]);
        } elseif ($action === 'update_progress') {
            $stmt = $pdo->prepare("INSERT INTO video_progress (video_id, user_id, watched_seconds, completed) 
                VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE watched_seconds = ?, completed = ?, updated_at = NOW()");
            $completed = $data['completed'] ?? 0;
            $stmt->execute([$data['video_id'], $user['user_id'], $data['watched_seconds'], $completed, $data['watched_seconds'], $completed]);
            echo json_encode(['success' => true]);
        }
    } elseif ($method === 'PUT') {
        $user = getAuthUser();
        if ($user['role'] !== 'admin' && $user['role'] !== 'teacher') {
            http_response_code(403);
            return;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("UPDATE video_lectures SET title=?, description=?, video_url=?, duration_minutes=?, sequence_order=? WHERE id=?");
        $stmt->execute([$data['title'], $data['description'], $data['video_url'], $data['duration_minutes'], $data['sequence_order'], $data['id']]);
        echo json_encode(['success' => true]);
    } elseif ($method === 'DELETE') {
        $user = getAuthUser();
        if ($user['role'] === 'admin' || $user['role'] === 'teacher') {
            $data = json_decode(file_get_contents('php://input'), true);
            $pdo->prepare("DELETE FROM video_lectures WHERE id = ?")->execute([$data['id']]);
            echo json_encode(['success' => true]);
        }
    } elseif ($method === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function createVideoTables($pdo)
{
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS video_lectures (
            id INT PRIMARY KEY AUTO_INCREMENT, subject_id INT NOT NULL, title VARCHAR(255) NOT NULL,
            description TEXT, video_url VARCHAR(500) NOT NULL, video_type VARCHAR(20) DEFAULT 'youtube',
            duration_minutes INT DEFAULT 0, sequence_order INT DEFAULT 0, thumbnail_url VARCHAR(500),
            is_featured BOOLEAN DEFAULT FALSE, views INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_subject (subject_id))");
        $pdo->exec("CREATE TABLE IF NOT EXISTS video_progress (
            id INT PRIMARY KEY AUTO_INCREMENT, video_id INT NOT NULL, user_id INT NOT NULL,
            watched_seconds INT DEFAULT 0, completed BOOLEAN DEFAULT FALSE,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_progress (video_id, user_id))");
    } catch (PDOException $e) {
    }
}
?>