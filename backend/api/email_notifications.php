<?php

/**
 * Email Notifications API
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';
setCORSHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();
createEmailTables($pdo);
try {
    if ($method === 'GET') {
        $user = getAuthUser();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $action = $_GET['action'] ?? 'preferences';
        if ($action === 'preferences') {
            $stmt = $pdo->prepare("SELECT * FROM email_preferences WHERE user_id = ?");
            $stmt->execute([$user['user_id']]);
            $prefs = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$prefs) {
                $pdo->prepare("INSERT INTO email_preferences (user_id) VALUES (?)")->execute([$user['user_id']]);
                $prefs = ['email_grades' => 1, 'email_assignments' => 1, 'email_attendance' => 1, 'email_announcements' => 1];
            }
            echo json_encode(['success' => true, 'data' => $prefs]);
        }
    } elseif ($method === 'PUT') {
        $user = getAuthUser();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo->prepare("INSERT INTO email_preferences (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id=user_id")->execute([$user['user_id']]);
        $stmt = $pdo->prepare("UPDATE email_preferences SET email_grades=?, email_assignments=?, email_attendance=?, email_announcements=? WHERE user_id=?");
        $stmt->execute([$data['email_grades'] ?? 1, $data['email_assignments'] ?? 1, $data['email_attendance'] ?? 1, $data['email_announcements'] ?? 1, $user['user_id']]);
        echo json_encode(['success' => true, 'message' => 'Preferences updated']);
    } elseif ($method === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function createEmailTables($pdo)
{
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS email_preferences (id INT PRIMARY KEY AUTO_INCREMENT, user_id INT UNIQUE, email_grades BOOLEAN DEFAULT 1, email_assignments BOOLEAN DEFAULT 1, email_attendance BOOLEAN DEFAULT 1, email_announcements BOOLEAN DEFAULT 1)");
        $pdo->exec("CREATE TABLE IF NOT EXISTS email_queue (id INT PRIMARY KEY AUTO_INCREMENT, user_id INT, email_type VARCHAR(50), subject VARCHAR(255), body TEXT, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
    } catch (PDOException $e) {
    }
}
