<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';
require_once __DIR__ . '/../includes/api_helpers.php';

handleCORS();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();
$user = requireAuth();

try {
    switch ($method) {
        case 'GET':
            handleGet($pdo, $user);
            break;
        case 'POST':
            handlePost($pdo, $user);
            break;
        case 'PUT':
            handlePut($pdo, $user);
            break;
        case 'DELETE':
            handleDelete($pdo, $user);
            break;
        case 'OPTIONS':
            exit(0);
        default:
            sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    sendError('Internal Server Error', 500, $e->getMessage());
}

function handleGet(PDO $pdo, array $user)
{
    $assignmentId = filter_input(INPUT_GET, 'id', FILTER_SANITIZE_NUMBER_INT);
    $subjectId = filter_input(INPUT_GET, 'subject_id', FILTER_SANITIZE_NUMBER_INT);
    $studentIdParam = filter_input(INPUT_GET, 'student_id', FILTER_SANITIZE_NUMBER_INT)
        ?: filter_input(INPUT_GET, 'user_id', FILTER_SANITIZE_NUMBER_INT)
        ?: filter_input(INPUT_GET, 'studentId', FILTER_SANITIZE_NUMBER_INT);

    $authUserId = (int) $user['user_id'];
    $role = $user['role'];

    if ($studentIdParam && !in_array($role, ['admin', 'teacher']) && (int) $studentIdParam !== $authUserId) {
        sendError('Access denied', 403);
    }

    $targetStudentId = null;
    if ($role === 'student') {
        $targetStudentId = $authUserId;
    } elseif ($studentIdParam) {
        $targetStudentId = (int) $studentIdParam;
    }

    if ($assignmentId) {
        $sql = "
            SELECT a.*, s.name as subject_name, s.code as subject_code, u.full_name as teacher_name
            FROM assignments a
            LEFT JOIN subjects s ON a.subject_id = s.id
            LEFT JOIN users u ON a.teacher_id = u.id
        ";
        $params = [];

        if ($role === 'student') {
            $sql .= " JOIN student_enrollments se ON se.subject_id = a.subject_id";
            $sql .= " WHERE a.id = ? AND se.user_id = ? AND se.status IN ('active', 'completed')";
            $params = [$assignmentId, $authUserId];
        } else {
            $sql .= " WHERE a.id = ?";
            $params = [$assignmentId];
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $assignment = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$assignment) {
            sendError('Assignment not found', 404);
        }

        if (!isset($assignment['max_marks']) || $assignment['max_marks'] === null) {
            $assignment['max_marks'] = $assignment['total_points'] ?? null;
        }

        if ($targetStudentId) {
            $submissionStmt = $pdo->prepare("
                SELECT *
                FROM assignment_submissions
                WHERE assignment_id = ? AND student_id = ?
                LIMIT 1
            ");
            $submissionStmt->execute([$assignmentId, $targetStudentId]);
            $assignment['my_submission'] = $submissionStmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } else {
            $submissionsStmt = $pdo->prepare("
                SELECT sub.*, u.full_name as student_name, u.student_id
                FROM assignment_submissions sub
                JOIN users u ON sub.student_id = u.id
                WHERE sub.assignment_id = ?
                ORDER BY sub.submitted_at DESC
            ");
            $submissionsStmt->execute([$assignmentId]);
            $assignment['submissions'] = $submissionsStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        sendResponse(['success' => true, 'data' => $assignment]);
    }

    $query = "
        SELECT DISTINCT a.*, s.name as subject_name, s.code as subject_code, u.full_name as teacher_name
        FROM assignments a
        LEFT JOIN subjects s ON a.subject_id = s.id
        LEFT JOIN users u ON a.teacher_id = u.id
    ";
    $joins = [];
    $conditions = [];
    $params = [];

    if ($targetStudentId) {
        $joins[] = "JOIN student_enrollments se ON se.subject_id = a.subject_id";
        $conditions[] = "se.user_id = ?";
        $params[] = $targetStudentId;
        $conditions[] = "se.status IN ('active', 'completed')";
    }

    if ($subjectId) {
        $conditions[] = "a.subject_id = ?";
        $params[] = $subjectId;
    }

    if (!empty($joins)) {
        $query .= " " . implode(' ', $joins);
    }

    if (!empty($conditions)) {
        $query .= " WHERE " . implode(' AND ', $conditions);
    }

    $query .= " ORDER BY a.due_date DESC";
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($assignments as &$assignment) {
        if (!isset($assignment['max_marks']) || $assignment['max_marks'] === null) {
            $assignment['max_marks'] = $assignment['total_points'] ?? null;
        }
    }

    if ($targetStudentId && !empty($assignments)) {
        $assignmentIds = array_column($assignments, 'id');
        $placeholders = implode(',', array_fill(0, count($assignmentIds), '?'));
        $submissionSql = "
            SELECT *
            FROM assignment_submissions
            WHERE student_id = ? AND assignment_id IN ($placeholders)
        ";
        $submissionStmt = $pdo->prepare($submissionSql);
        $submissionStmt->execute(array_merge([$targetStudentId], $assignmentIds));
        $rows = $submissionStmt->fetchAll(PDO::FETCH_ASSOC);
        $submissionsByAssignment = [];
        foreach ($rows as $row) {
            $submissionsByAssignment[(int) $row['assignment_id']] = $row;
        }

        foreach ($assignments as &$assignment) {
            $assignment['my_submission'] = $submissionsByAssignment[(int) $assignment['id']] ?? null;
        }
    }

    sendResponse(['success' => true, 'data' => $assignments]);
}

function handlePost(PDO $pdo, array $user)
{
    if (!in_array($user['role'], ['admin', 'teacher'])) {
        sendError('Unauthorized', 403);
    }

    $data = getJsonInput();
    if (
        empty($data['subject_id']) ||
        empty($data['title']) ||
        empty($data['due_date'])
    ) {
        sendError('subject_id, title, and due_date are required', 400);
    }

    $stmt = $pdo->prepare("
        INSERT INTO assignments (subject_id, title, description, due_date, total_points, teacher_id, status)
        VALUES (?, ?, ?, ?, ?, ?, 'published')
    ");
    $stmt->execute([
        $data['subject_id'],
        $data['title'],
        $data['description'] ?? '',
        $data['due_date'],
        $data['max_marks'] ?? $data['total_points'] ?? 100,
        $user['user_id']
    ]);

    sendResponse([
        'success' => true,
        'data' => [
            'id' => (int) $pdo->lastInsertId(),
            'message' => 'Assignment created successfully'
        ]
    ], 201);
}

function handlePut(PDO $pdo, array $user)
{
    if (!in_array($user['role'], ['admin', 'teacher'])) {
        sendError('Unauthorized', 403);
    }

    $data = getJsonInput();
    if (!$data) {
        sendError('Invalid payload', 400);
    }

    if (!empty($data['submission_id'])) {
        $stmt = $pdo->prepare("
            UPDATE assignment_submissions
            SET marks_obtained = ?, feedback = ?, status = 'graded', graded_at = NOW(), graded_by = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $data['marks_obtained'] ?? null,
            $data['feedback'] ?? null,
            $user['user_id'],
            $data['submission_id']
        ]);

        sendResponse(['success' => true, 'data' => ['message' => 'Submission graded successfully']]);
    }

    if (empty($data['id'])) {
        sendError('Assignment id is required', 400);
    }

    $stmt = $pdo->prepare("
        UPDATE assignments
        SET title = ?, description = ?, due_date = ?, total_points = ?
        WHERE id = ?
    ");
    $stmt->execute([
        $data['title'] ?? '',
        $data['description'] ?? '',
        $data['due_date'] ?? null,
        $data['max_marks'] ?? $data['total_points'] ?? 100,
        $data['id']
    ]);

    sendResponse(['success' => true, 'data' => ['message' => 'Assignment updated successfully']]);
}

function handleDelete(PDO $pdo, array $user)
{
    if ($user['role'] !== 'admin') {
        sendError('Unauthorized', 403);
    }

    $id = filter_input(INPUT_GET, 'id', FILTER_SANITIZE_NUMBER_INT);
    if (!$id) {
        sendError('Assignment ID required', 400);
    }

    $stmt = $pdo->prepare("DELETE FROM assignments WHERE id = ?");
    $stmt->execute([$id]);

    sendResponse(['success' => true, 'data' => ['message' => 'Assignment deleted']]);
}
