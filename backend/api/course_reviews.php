<?php
/**
 * Course Reviews/Ratings API
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

createReviewTables($pdo);

try {
    if ($method === 'GET') {
        $subjectId = $_GET['subject_id'] ?? null;
        $action = $_GET['action'] ?? 'list';

        if ($action === 'list' && $subjectId) {
            $stmt = $pdo->prepare("SELECT r.*, u.full_name as reviewer_name FROM course_reviews r 
                JOIN users u ON r.user_id = u.id WHERE r.subject_id = ? AND r.is_approved = 1 ORDER BY r.created_at DESC");
            $stmt->execute([$subjectId]);
            $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $stmt = $pdo->prepare("SELECT AVG(overall_rating) as avg_rating, AVG(difficulty_rating) as avg_difficulty,
                AVG(workload_rating) as avg_workload, COUNT(*) as total_reviews FROM course_reviews WHERE subject_id = ? AND is_approved = 1");
            $stmt->execute([$subjectId]);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => ['reviews' => $reviews, 'stats' => $stats]]);
        } elseif ($action === 'my_reviews') {
            $user = getAuthUser();
            $stmt = $pdo->prepare("SELECT r.*, s.name as subject_name FROM course_reviews r JOIN subjects s ON r.subject_id = s.id WHERE r.user_id = ?");
            $stmt->execute([$user['user_id']]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } elseif ($action === 'top_rated') {
            $stmt = $pdo->query("SELECT s.id, s.name, s.code, AVG(r.overall_rating) as avg_rating, COUNT(r.id) as review_count
                FROM subjects s LEFT JOIN course_reviews r ON s.id = r.subject_id AND r.is_approved = 1
                GROUP BY s.id ORDER BY avg_rating DESC, review_count DESC LIMIT 10");
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } elseif ($action === 'pending') {
            $user = getAuthUser();
            if ($user['role'] === 'admin') {
                $stmt = $pdo->query("SELECT r.*, u.full_name, s.name as subject_name FROM course_reviews r 
                    JOIN users u ON r.user_id = u.id JOIN subjects s ON r.subject_id = s.id WHERE r.is_approved = 0");
                echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            }
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

        if ($action === 'create') {
            // Check if already reviewed
            $stmt = $pdo->prepare("SELECT id FROM course_reviews WHERE user_id = ? AND subject_id = ?");
            $stmt->execute([$user['user_id'], $data['subject_id']]);
            if ($stmt->fetch()) {
                echo json_encode(['error' => 'You have already reviewed this course']);
                return;
            }

            $stmt = $pdo->prepare("INSERT INTO course_reviews (subject_id, user_id, overall_rating, difficulty_rating, 
                workload_rating, would_recommend, review_text, pros, cons) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['subject_id'],
                $user['user_id'],
                $data['overall_rating'],
                $data['difficulty_rating'] ?? null,
                $data['workload_rating'] ?? null,
                $data['would_recommend'] ?? 1,
                $data['review_text'] ?? '',
                $data['pros'] ?? '',
                $data['cons'] ?? ''
            ]);
            echo json_encode(['success' => true, 'message' => 'Review submitted for approval']);
        } elseif ($action === 'approve' && $user['role'] === 'admin') {
            $pdo->prepare("UPDATE course_reviews SET is_approved = 1 WHERE id = ?")->execute([$data['id']]);
            echo json_encode(['success' => true]);
        } elseif ($action === 'helpful') {
            $pdo->prepare("UPDATE course_reviews SET helpful_count = helpful_count + 1 WHERE id = ?")->execute([$data['id']]);
            echo json_encode(['success' => true]);
        }
    } elseif ($method === 'DELETE') {
        $user = getAuthUser();
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("DELETE FROM course_reviews WHERE id = ? AND (user_id = ? OR ? = 'admin')");
        $stmt->execute([$data['id'], $user['user_id'], $user['role']]);
        echo json_encode(['success' => true]);
    } elseif ($method === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function createReviewTables($pdo)
{
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS course_reviews (
            id INT PRIMARY KEY AUTO_INCREMENT, subject_id INT NOT NULL, user_id INT NOT NULL,
            overall_rating TINYINT NOT NULL, difficulty_rating TINYINT, workload_rating TINYINT,
            would_recommend BOOLEAN DEFAULT TRUE, review_text TEXT, pros TEXT, cons TEXT,
            helpful_count INT DEFAULT 0, is_approved BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_review (subject_id, user_id))");
    } catch (PDOException $e) {
    }
}
?>