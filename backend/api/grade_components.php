<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

header('Content-Type: application/json');

$headers = getallheaders();
$token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

if (!$token) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No token provided']);
    exit();
}

$result = verifyToken($token);
if (!$result['valid']) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => $result['error']]);
    exit();
}

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];
$decoded = (object) $result['payload'];
$user_id = $decoded->user_id;
$user_role = $decoded->role;

try {
    switch ($method) {
        case 'GET':
            // Get grade components for a subject
            $subject_id = $_GET['subject_id'] ?? null;

            if (!$subject_id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Subject ID required']);
                exit();
            }

            $stmt = $pdo->prepare("
                SELECT id, name, weightage, max_marks, component_type
                FROM grade_components
                WHERE subject_id = ?
                ORDER BY component_type, name
            ");
            $stmt->execute([$subject_id]);
            $components = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $components]);
            break;

        case 'POST':
            // Create grade component (Admin only)
            if ($user_role !== 'admin') {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Unauthorized']);
                exit();
            }

            $data = json_decode(file_get_contents('php://input'), true);

            $stmt = $pdo->prepare("
                INSERT INTO grade_components (subject_id, name, weightage, max_marks, component_type)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['subject_id'],
                $data['name'],
                $data['weightage'],
                $data['max_marks'],
                $data['component_type'] ?? 'assessment'
            ]);

            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            // Update grade component (Admin only)
            if ($user_role !== 'admin') {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Unauthorized']);
                exit();
            }

            $data = json_decode(file_get_contents('php://input'), true);

            $stmt = $pdo->prepare("
                UPDATE grade_components
                SET name = ?, weightage = ?, max_marks = ?, component_type = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $data['name'],
                $data['weightage'],
                $data['max_marks'],
                $data['component_type'],
                $data['id']
            ]);

            echo json_encode(['success' => true]);
            break;

        case 'DELETE':
            // Delete grade component (Admin only)
            if ($user_role !== 'admin') {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Unauthorized']);
                exit();
            }

            $id = $_GET['id'] ?? null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Component ID required']);
                exit();
            }

            $stmt = $pdo->prepare("DELETE FROM grade_components WHERE id = ?");
            $stmt->execute([$id]);

            echo json_encode(['success' => true]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>