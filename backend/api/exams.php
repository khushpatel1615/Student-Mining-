<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

// All routes require auth
$user = requireAuth();
$userId = $user['user_id'];
$userRole = $user['role'];

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Removed ensureExamTables($pdo);

try {
    switch ($method) {
        case 'GET':
            handleGet($pdo, $userId, $userRole);
            break;
        case 'POST':
            handlePost($pdo, $userId, $userRole);
            break;
        case 'PUT':
            handlePut($pdo, $userId, $userRole);
            break;
        case 'DELETE':
            handleDelete($pdo, $userId, $userRole);
            break;
        case 'OPTIONS':
            exit(0);
        default:
            sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    sendError('An error occurred', 500, $e->getMessage());
}

function handleGet($pdo, $userId, $userRole)
{
    $subject_id = filter_input(INPUT_GET, 'subject_id', FILTER_SANITIZE_NUMBER_INT);
    $semester = filter_input(INPUT_GET, 'semester', FILTER_SANITIZE_NUMBER_INT);
    $exam_id = filter_input(INPUT_GET, 'id', FILTER_SANITIZE_NUMBER_INT);

    if ($exam_id) {
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
            $exam['exam_date'] = $exam['start_datetime'] ?? null;
            $exam['max_marks'] = $exam['total_marks'] ?? null;

            // Get results
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
        sendResponse(['success' => true, 'data' => $exam]);
    } else {
        // ... (List logic) ...
        // Simplification for brevity while maintaining logic

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

        if ($userRole === 'student') {
            // Students see exams for their enrolled subjects; fallback to program+current semester
            $studentStmt = $pdo->prepare("SELECT program_id, current_semester FROM users WHERE id = ?");
            $studentStmt->execute([$userId]);
            $student = $studentStmt->fetch(PDO::FETCH_ASSOC);

            $query .= " LEFT JOIN student_enrollments se ON e.subject_id = se.subject_id AND se.user_id = ?";
            $params[] = $userId;

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

            if ($userRole === 'student') {
                $stmt = $pdo->prepare("SELECT * FROM exam_results WHERE exam_id = ? AND student_id = ?");
                $stmt->execute([$exam['id'], $userId]);
                $exam['my_result'] = $stmt->fetch(PDO::FETCH_ASSOC);
            }
        }

        sendResponse(['success' => true, 'data' => $exams]);
    }
}

function handlePost($pdo, $userId, $userRole)
{
    requireRole(['admin', 'teacher']);

    $data = getJsonInput();
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
        $userId
    ]);

    sendResponse(['success' => true, 'id' => $pdo->lastInsertId()], 201);
}

function handlePut($pdo, $userId, $userRole)
{
    requireRole(['admin', 'teacher']);

    $data = getJsonInput();

    if (isset($data['exam_id']) && isset($data['student_id'])) {
        // Update Result
        $marks = (float) $data['marks_obtained'];
        if ($marks < 0)
            sendError('Marks cannot be negative');

        // Validate max marks
        $stmt = $pdo->prepare("SELECT total_marks FROM exams WHERE id = ?");
        $stmt->execute([$data['exam_id']]);
        $examRow = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$examRow)
            sendError('Exam not found', 404);

        $maxMarks = (float) ($examRow['total_marks'] ?? 0);
        if ($maxMarks > 0 && $marks > $maxMarks)
            sendError('Marks exceed max marks');

        // Update or Insert
        $stmt = $pdo->prepare("SELECT id FROM exam_results WHERE exam_id = ? AND student_id = ?");
        $stmt->execute([$data['exam_id'], $data['student_id']]);
        $existing = $stmt->fetch();

        if ($existing) {
            $stmt = $pdo->prepare("UPDATE exam_results SET marks_obtained = ?, remarks = ? WHERE id = ?");
            $stmt->execute([$marks, $data['remarks'] ?? null, $existing['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO exam_results (exam_id, student_id, marks_obtained, remarks) VALUES (?, ?, ?, ?)");
            $stmt->execute([$data['exam_id'], $data['student_id'], $marks, $data['remarks'] ?? null]);
        }

    } else {
        // Update Exam
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

    sendResponse(['success' => true]);
}

function handleDelete($pdo, $userId, $userRole)
{
    requireRole('admin');
    $id = filter_input(INPUT_GET, 'id', FILTER_SANITIZE_NUMBER_INT);
    if (!$id)
        sendError('Exam ID required');

    $stmt = $pdo->prepare("DELETE FROM exams WHERE id = ?");
    $stmt->execute([$id]);
    sendResponse(['success' => true, 'message' => 'Exam deleted']);
}
