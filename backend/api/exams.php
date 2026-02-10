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

// Ensure required tables exist (for older installs)
ensureExamTables($pdo);
try {
    switch ($method) {
        case 'GET':
            // Get exams

                $subject_id = $_GET['subject_id'] ?? null;
                $semester = $_GET['semester'] ?? null;
            $exam_id = $_GET['id'] ?? null;
            if ($exam_id) {
                // Get single exam
                $stmt = $pdo->prepare("
                    SELECT e.*, s.name as subject_name, s.code as subject_code, s.semester as subject_semester,
                           u.full_name as teacher_name,
                           COALESCE(er.result_count, 0) as result_count,
                           er.average_marks
                    FROM exams e
                    LEFT JOIN subjects s ON e.subject_id = s.id
                    LEFT JOIN users u ON e.teacher_id = u.id
                    LEFT JOIN (
                        SELECT exam_id, COUNT(*) as result_count, AVG(marks_obtained) as average_marks
                        FROM exam_results
                        GROUP BY exam_id
                    ) er ON er.exam_id = e.id
                    WHERE e.id = ?
                ");
                $stmt->execute([$exam_id]);
                $exam = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($exam) {
                    // Backward-compatible aliases
                    $exam['exam_date'] = $exam['start_datetime'] ?? null;
                    $exam['max_marks'] = $exam['total_marks'] ?? null;

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
                    SELECT DISTINCT e.*, s.name as subject_name, s.code as subject_code, s.semester as subject_semester,
                           u.full_name as teacher_name,
                           COALESCE(er.result_count, 0) as result_count,
                           er.average_marks
                    FROM exams e
                    LEFT JOIN subjects s ON e.subject_id = s.id
                    LEFT JOIN users u ON e.teacher_id = u.id
                    LEFT JOIN (
                        SELECT exam_id, COUNT(*) as result_count, AVG(marks_obtained) as average_marks
                        FROM exam_results
                        GROUP BY exam_id
                    ) er ON er.exam_id = e.id
                ";
                $conditions = [];
                $params = [];
                if ($subject_id) {
                    $conditions[] = "e.subject_id = ?";
                    $params[] = $subject_id;
                }
                if ($semester) {
                    $conditions[] = "s.semester = ?";
                    $params[] = $semester;
                }

                if ($user_role === 'student') {
                    // Students see exams for their enrolled subjects; fallback to program+current semester
                    $studentStmt = $pdo->prepare("SELECT program_id, current_semester FROM users WHERE id = ?");
                    $studentStmt->execute([$user_id]);
                    $student = $studentStmt->fetch(PDO::FETCH_ASSOC);

                    $query .= " LEFT JOIN student_enrollments se ON e.subject_id = se.subject_id AND se.user_id = ?";
                    $params[] = $user_id;

                    $enrolledClause = "(se.user_id IS NOT NULL AND se.status IN ('active', 'completed'))";
                    $fallbackClause = "";
                    if ($student && $student['program_id'] && $student['current_semester']) {
                        $fallbackClause = "(s.program_id = ? AND s.semester = ?)";
                        $params[] = (int) $student['program_id'];
                        $params[] = (int) $student['current_semester'];
                    }

                    if ($fallbackClause) {
                        $conditions[] = "(" . $enrolledClause . " OR " . $fallbackClause . ")";
                    } else {
                        $conditions[] = $enrolledClause;
                    }
                }

                if (!empty($conditions)) {
                    $query .= " WHERE " . implode(" AND ", $conditions);
                }

                $query .= " ORDER BY e.start_datetime DESC";
                $stmt = $pdo->prepare($query);
                $stmt->execute($params);
                $exams = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($exams as &$exam) {
                    $exam['exam_date'] = $exam['start_datetime'] ?? null;
                    $exam['max_marks'] = $exam['total_marks'] ?? null;
                }
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
                $data['total_marks'] ?? $data['max_marks'] ?? 100,
                $data['start_datetime'] ?? $data['exam_date'],
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

                if (!isset($data['marks_obtained']) || !is_numeric($data['marks_obtained'])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Marks are required and must be numeric.']);
                    exit();
                }

                $marks = (float) $data['marks_obtained'];
                if ($marks < 0) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Marks cannot be negative.']);
                    exit();
                }

                $stmt = $pdo->prepare("SELECT total_marks FROM exams WHERE id = ?");
                $stmt->execute([$data['exam_id']]);
                $examRow = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$examRow) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Exam not found.']);
                    exit();
                }
                $maxMarks = (float) ($examRow['total_marks'] ?? 0);
                if ($maxMarks > 0 && $marks > $maxMarks) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Marks exceed max marks for this exam.']);
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
                                    $marks,
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
                        $marks,
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
                    $data['total_marks'] ?? $data['max_marks'] ?? 100,
                    $data['start_datetime'] ?? $data['exam_date'],
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

function ensureExamTables($pdo)
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS exam_results (
            id INT AUTO_INCREMENT PRIMARY KEY,
            exam_id INT NOT NULL,
            student_id INT NOT NULL,
            marks_obtained DECIMAL(5,2) DEFAULT NULL,
            remarks VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_exam_result (exam_id, student_id),
            INDEX idx_exam (exam_id),
            INDEX idx_student (student_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
}
