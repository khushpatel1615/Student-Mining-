<?php
/**
 * Announcements API (formerly Discussions)
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

createForumTables($pdo);

// Ensure columns exist (Migration)
try {
    $columns = $pdo->query("SHOW COLUMNS FROM discussions")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('program_id', $columns)) {
        $pdo->exec("ALTER TABLE discussions ADD COLUMN program_id INT DEFAULT NULL");
    }
    if (!in_array('semester', $columns)) {
        $pdo->exec("ALTER TABLE discussions ADD COLUMN semester INT DEFAULT NULL");
    }
} catch (PDOException $e) {
    // Ignore if already exists or other minor schema issues
}

try {
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    if ($method === 'GET') {
        $action = $_GET['action'] ?? 'list';

        if ($action === 'list') {
            // Query for announcements only
            // Query for announcements only - Simplified for robustness
            $baseQuery = "SELECT d.id, d.title, d.content, d.category, d.program_id, d.semester, d.is_pinned, d.views, d.created_at, d.user_id,
                COALESCE(u.full_name, 'Unknown') as author_name, u.avatar_url
                FROM discussions d 
                LEFT JOIN users u ON d.user_id = u.id 
                WHERE LOWER(d.category) = 'announcement'";

            $params = [];

            if ($user['role'] === 'student') {
                // Get student details for filtering
                $stuStmt = $pdo->prepare("SELECT program_id, current_semester FROM users WHERE id = ?");
                $stuStmt->execute([$user['user_id']]);
                $student = $stuStmt->fetch();

                if ($student) {
                    // Logic: 
                    // 1. Global (no program, no semester)
                    // 2. Program wide (program match, no semester)
                    // 3. Semester specific (program match, semester match)
                    $baseQuery .= " AND (
                        (d.program_id IS NULL AND d.semester IS NULL) OR 
                        (d.program_id = ? AND d.semester IS NULL) OR 
                        (d.program_id = ? AND d.semester = ?)
                    )";
                    $params[] = $student['program_id'];
                    $params[] = $student['program_id'];
                    $params[] = $student['current_semester'];
                } else {
                    // Fallback for student with no program data: show only global announcements
                    $baseQuery .= " AND (d.program_id IS NULL AND d.semester IS NULL)";
                }
            }
            // Admins/Teachers see all announcements

            $baseQuery .= " ORDER BY d.is_pinned DESC, d.created_at DESC LIMIT 50";

            $stmt = $pdo->prepare($baseQuery);
            $stmt->execute($params);

            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);

        } elseif ($action === 'view') {
            $id = $_GET['id'];
            $stmt = $pdo->prepare("SELECT d.*, COALESCE(u.full_name, 'Unknown') as author_name, u.avatar_url FROM discussions d LEFT JOIN users u ON d.user_id = u.id WHERE d.id = ?");
            $stmt->execute([$id]);
            $discussion = $stmt->fetch(PDO::FETCH_ASSOC);

            // Fetch replies if any (optional feature)
            $stmt = $pdo->prepare("SELECT r.*, COALESCE(u.full_name, 'Unknown') as author_name, u.avatar_url FROM discussion_replies r LEFT JOIN users u ON r.user_id = u.id WHERE r.discussion_id = ? ORDER BY r.created_at ASC");
            $stmt->execute([$id]);
            $discussion['replies'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $pdo->prepare("UPDATE discussions SET views = views + 1 WHERE id = ?")->execute([$id]);
            echo json_encode(['success' => true, 'data' => $discussion]);
        }
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? 'create';

        if ($action === 'create' && ($user['role'] === 'admin' || $user['role'] === 'teacher')) {
            // Only admin/teacher can create announcements
            $stmt = $pdo->prepare("INSERT INTO discussions (user_id, title, content, category, program_id, semester) VALUES (?, ?, ?, 'announcement', ?, ?)");
            $programId = !empty($data['program_id']) ? $data['program_id'] : null;
            $semester = !empty($data['semester']) ? $data['semester'] : null;

            $stmt->execute([
                $user['user_id'],
                $data['title'],
                $data['content'],
                $programId,
                $semester
            ]);
            echo json_encode(['success' => true, 'message' => 'Announcement published', 'id' => $pdo->lastInsertId()]);
        } elseif ($action === 'pin' && ($user['role'] === 'admin' || $user['role'] === 'teacher')) {
            $pdo->prepare("UPDATE discussions SET is_pinned = NOT is_pinned WHERE id = ?")->execute([$data['id']]);
            echo json_encode(['success' => true]);
        } elseif ($action === 'update' && ($user['role'] === 'admin' || $user['role'] === 'teacher')) {
            $stmt = $pdo->prepare("UPDATE discussions SET title = ?, content = ?, program_id = ?, semester = ? WHERE id = ?");
            $programId = !empty($data['program_id']) ? $data['program_id'] : null;
            $semester = !empty($data['semester']) ? $data['semester'] : null;

            $stmt->execute([
                $data['title'],
                $data['content'],
                $programId,
                $semester,
                $data['id']
            ]);
            echo json_encode(['success' => true, 'message' => 'Announcement updated']);
        }
    } elseif ($method === 'DELETE') {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? $_GET['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID required']);
            return;
        }

        if ($user['role'] === 'admin' || $user['role'] === 'teacher') {
            $pdo->prepare("DELETE FROM discussions WHERE id = ?")->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Deleted']);
        } else {
            http_response_code(403);
            echo json_encode(['error' => 'Unauthorized']);
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
            program_id INT DEFAULT NULL, semester INT DEFAULT NULL,
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