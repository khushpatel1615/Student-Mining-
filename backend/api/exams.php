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
            // Get exams

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               $subject_id = $_GET['subject_id'] ?? null;
            $exam_id = $_GET['id'] ?? null;
            if ($exam_id) {
                // Get single exam
                $stmt = $pdo->prepare("
                    SELECT e.*, s.name as subject_name, s.code as subject_code,
                           u.full_name as teacher_name
                    FROM exams e
                    LEFT JOIN subjects s ON e.subject_id = s.id
                    LEFT JOIN users u ON e.teacher_id = u.id
                    WHERE e.id = ?
                ");
                $stmt->execute([$exam_id]);
                $exam = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($exam) {
                        // Get results for this exam
                                    $stmt = $pdo->prepare("
                        SELECT er.*, u.full_name as student_name, u.student_id
                        FROM exam_results er
                        JOIN users u ON er.student_id = u.id
                        WHERE er.exam_id = ?
                        ORDER BY er.marks_obtained DESC
                    ");
                            $stmt->execute([$exam_id]);
                            $exam['results'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
                }

                echo json_encode(['success' => true, 'data' => $exam]);
            } else {
            // Get all exams
                $query = "
                    SELECT e.*, s.name as subject_name, s.code as subject_code,
                           u.full_name as teacher_name
                    FROM exams e
                    LEFT JOIN subjects s ON e.subject_id = s.id
                    LEFT JOIN users u ON e.teacher_id = u.id
                ";
                $conditions = [];
                $params = [];
                if ($subject_id) {
                    $conditions[] = "e.subject_id = ?";
                    $params[] = $subject_id;
                }

                if ($user_role === 'student') {
        // Students see exams for all subjects in their program
                    $progStmt = $pdo->prepare("SELECT program_id FROM users WHERE id = ?");
                    $progStmt->execute([$user_id]);
                    $programId = $progStmt->fetchColumn();
                    if ($programId) {
                        $conditions[] = "s.program_id = ?";
                        $params[] = $programId;
                    } else {
                        // Fallback to enrolled subjects if program_id is not set
                        $query .= " JOIN student_enrollments se ON e.subject_id = se.subject_id";
                        $conditions[] = "se.user_id = ?";
                        $params[] = $user_id;
                    }
                }

                if (!empty($conditions)) {
                    $query .= " WHERE " . implode(" AND ", $conditions);
                }

                $query .= " ORDER BY e.start_datetime DESC";
                $stmt = $pdo->prepare($query);
                $stmt->execute($params);
                $exams = $stmt->fetchAll(PDO::FETCH_ASSOC);
            // If student, get their result for each exam
                if ($user_role === 'student') {
                    foreach ($exams as &$exam) {
                        $stmt = $pdo->prepare("
                            SELECT * FROM exam_results
                            WHERE exam_id = ? AND student_id = ?
                        ");
                        $stmt->execute([$exam['id'], $user_id]);
                        $exam['my_result'] = $stmt->fetch(PDO::FETCH_ASSOC);
                    }
                }

                echo json_encode(['success' => true, 'data' => $exams]);
            }

            break;
        case 'POST':
            // Create exam (Admin/Teacher only)

            if ($user_role !== 'admin' && $user_role !== 'teacher') {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Unauthorized']);
                exit();
            }

            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("
                INSERT INTO exams (subject_id, title, duration_minutes, total_marks, start_datetime, teacher_id, is_published)
                VALUES (?, ?, ?, ?, ?, ?, 1)
            ");
            $stmt->execute([
                $data['subject_id'],
                $data['title'],
                $data['duration_minutes'] ?? 120,
                $data['max_marks'] ?? 100,
                $data['exam_date'],
                $user_id
            ]);
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);

            break;
        case 'PUT':
            // Update exam or enter result

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               $data = json_decode(file_get_contents('php://input'), true);
            if (isset($data['exam_id']) && isset($data['student_id'])) {
            // Enter/update exam result (Admin/Teacher only)
                if ($user_role !== 'admin' && $user_role !== 'teacher') {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
                    exit();
                }

                // Check if result exists
                $stmt = $pdo->prepare("
                    SELECT id FROM exam_results
                    WHERE exam_id = ? AND student_id = ?
                ");
                $stmt->execute([$data['exam_id'], $data['student_id']]);
                $existing = $stmt->fetch();
                if ($existing) {
                        // Update existing result
                                $stmt = $pdo->prepare("
                        UPDATE exam_results
                        SET marks_obtained = ?, remarks = ?
                        WHERE id = ?
                    ");
                                $stmt->execute([
                                    $data['marks_obtained'],
                                    $data['remarks'] ?? null,
                                    $existing['id']
                                ]);
                } else {
                    // Insert new result
                    $stmt = $pdo->prepare("
                        INSERT INTO exam_results (exam_id, student_id, marks_obtained, remarks)
                        VALUES (?, ?, ?, ?)
                    ");
                    $stmt->execute([
                        $data['exam_id'],
                        $data['student_id'],
                        $data['marks_obtained'],
                        $data['remarks'] ?? null
                    ]);
                }
            } else {
            // Update exam details (Admin/Teacher only)
                if ($user_role !== 'admin' && $user_role !== 'teacher') {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
                    exit();
                }

                $stmt = $pdo->prepare("
                    UPDATE exams
                    SET title = ?, duration_minutes = ?, total_marks = ?, start_datetime = ?
                    WHERE id = ?
                ");
                $stmt->execute([
                    $data['title'],
                    $data['duration_minutes'],
                    $data['max_marks'],
                    $data['exam_date'],
                    $data['id']
                ]);
            }

            echo json_encode(['success' => true]);

            break;
        case 'DELETE':
            // Delete exam (Admin only)

            if ($user_role !== 'admin') {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Unauthorized']);
                exit();
            }

            $id = $_GET['id'] ?? null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Exam ID required']);
                exit();
            }

            $stmt = $pdo->prepare("DELETE FROM exams WHERE id = ?");
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
