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
            // Get assignments
            $subject_id = $_GET['subject_id'] ?? null;
            $student_id = $_GET['student_id'] ?? null;
            $assignment_id = $_GET['id'] ?? null;

            if ($assignment_id) {
                // Get single assignment
                $stmt = $pdo->prepare("
                    SELECT a.*, s.name as subject_name, s.code as subject_code,
                           u.full_name as teacher_name
                    FROM assignments a
                    LEFT JOIN subjects s ON a.subject_id = s.id
                    LEFT JOIN users u ON a.teacher_id = u.id
                    WHERE a.id = ?
                ");
                $stmt->execute([$assignment_id]);
                $assignment = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($assignment) {
                    // Get submissions for this assignment
                    $stmt = $pdo->prepare("
                        SELECT sub.*, u.full_name as student_name, u.student_id
                        FROM assignment_submissions sub
                        JOIN users u ON sub.student_id = u.id
                        WHERE sub.assignment_id = ?
                        ORDER BY sub.submitted_at DESC
                    ");
                    $stmt->execute([$assignment_id]);
                    $assignment['submissions'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
                }

                echo json_encode(['success' => true, 'data' => $assignment]);
            } else {
                // Get all assignments
                $query = "
                    SELECT DISTINCT a.*, s.name as subject_name, s.code as subject_code,
                           u.full_name as teacher_name
                    FROM assignments a
                    LEFT JOIN subjects s ON a.subject_id = s.id
                    LEFT JOIN users u ON a.teacher_id = u.id
                ";

                $conditions = [];
                $params = [];

                if ($subject_id) {
                    $conditions[] = "a.subject_id = ?";
                    $params[] = $subject_id;
                }

                if ($user_role === 'student') {
                    // Students see assignments for their enrolled subjects
                    $query .= " JOIN student_enrollments se ON a.subject_id = se.subject_id";
                    $conditions[] = "se.user_id = ?";
                    $params[] = $user_id;
                }

                if (!empty($conditions)) {
                    $query .= " WHERE " . implode(" AND ", $conditions);
                }

                $query .= " ORDER BY a.due_date DESC";

                $stmt = $pdo->prepare($query);
                $stmt->execute($params);
                $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // If student, fetch their submissions
                if ($user_role === 'student') {
                    foreach ($assignments as &$assignment) {
                        $stmt = $pdo->prepare("
                            SELECT * FROM assignment_submissions
                            WHERE assignment_id = ? AND student_id = ?
                        ");
                        $stmt->execute([$assignment['id'], $user_id]);
                        $submission = $stmt->fetch(PDO::FETCH_ASSOC);
                        $assignment['my_submission'] = $submission ?: null;
                    }
                }

                echo json_encode(['success' => true, 'data' => $assignments]);
            }
            break;

        case 'POST':
            // Create assignment (Admin/Teacher only)
            if ($user_role !== 'admin' && $user_role !== 'teacher') {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Unauthorized']);
                exit();
            }

            $data = json_decode(file_get_contents('php://input'), true);

            $stmt = $pdo->prepare("
                INSERT INTO assignments (subject_id, title, description, due_date, total_points, teacher_id, status)
                VALUES (?, ?, ?, ?, ?, ?, 'published')
            ");
            $stmt->execute([
                $data['subject_id'],
                $data['title'],
                $data['description'] ?? '',
                $data['due_date'],
                $data['max_marks'] ?? 100,
                $user_id
            ]);

            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            // Update assignment or grade submission
            $data = json_decode(file_get_contents('php://input'), true);

            if (isset($data['submission_id'])) {
                // Grade a submission (Admin/Teacher only)
                if ($user_role !== 'admin' && $user_role !== 'teacher') {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
                    exit();
                }

                $stmt = $pdo->prepare("
                    UPDATE assignment_submissions
                    SET marks_obtained = ?, feedback = ?, status = 'graded', graded_at = NOW()
                    WHERE id = ?
                ");
                $stmt->execute([
                    $data['marks_obtained'],
                    $data['feedback'] ?? null,
                    $data['submission_id']
                ]);
            } else {
                // Update assignment (Admin/Teacher only)
                if ($user_role !== 'admin' && $user_role !== 'teacher') {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
                    exit();
                }

                $stmt = $pdo->prepare("
                    UPDATE assignments
                    SET title = ?, description = ?, due_date = ?, total_points = ?
                    WHERE id = ?
                ");
                $stmt->execute([
                    $data['title'],
                    $data['description'],
                    $data['due_date'],
                    $data['max_marks'],
                    $data['id']
                ]);
            }

            echo json_encode(['success' => true]);
            break;

        case 'DELETE':
            // Delete assignment (Admin only)
            if ($user_role !== 'admin') {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Unauthorized']);
                exit();
            }

            $id = $_GET['id'] ?? null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Assignment ID required']);
                exit();
            }

            $stmt = $pdo->prepare("DELETE FROM assignments WHERE id = ?");
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