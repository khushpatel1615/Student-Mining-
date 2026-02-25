<?php

/**
 * Assignment Submissions API
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';
require_once __DIR__ . '/../includes/api_helpers.php';

handleCORS();

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') {
    exit(0);
}

$pdo = getDBConnection();
$user = requireAuth();
$authUserId = (int) $user['user_id'];
$authRole = $user['role'];

try {
    switch ($method) {
        case 'GET':
            handleGet($pdo, $authUserId, $authRole);
            break;
        case 'POST':
            handlePost($pdo, $authUserId, $authRole);
            break;
        case 'DELETE':
            handleDelete($pdo, $authUserId, $authRole);
            break;
        default:
            sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    sendError('Internal Server Error', 500, $e->getMessage());
}

function handleGet(PDO $pdo, int $authUserId, string $authRole)
{
    $action = $_GET['action'] ?? 'view';
    $assignmentId = filter_input(INPUT_GET, 'assignment_id', FILTER_SANITIZE_NUMBER_INT);
    $studentIdParam = filter_input(INPUT_GET, 'student_id', FILTER_SANITIZE_NUMBER_INT)
        ?: filter_input(INPUT_GET, 'user_id', FILTER_SANITIZE_NUMBER_INT)
        ?: filter_input(INPUT_GET, 'studentId', FILTER_SANITIZE_NUMBER_INT);

    if ($studentIdParam && !in_array($authRole, ['admin', 'teacher']) && (int) $studentIdParam !== $authUserId) {
        sendError('Access denied', 403);
    }

    if ($action === 'list' && in_array($authRole, ['admin', 'teacher'])) {
        if (!$assignmentId) {
            sendError('Assignment ID required', 400);
        }

        $sql = "
            SELECT s.*, u.full_name, u.student_id as student_code, u.avatar_url
            FROM assignment_submissions s
            JOIN users u ON s.student_id = u.id
            WHERE s.assignment_id = ?
        ";
        $params = [$assignmentId];

        if ($studentIdParam) {
            $sql .= " AND s.student_id = ?";
            $params[] = (int) $studentIdParam;
        }

        $sql .= " ORDER BY s.submitted_at DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        sendResponse(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // Single assignment submission view
    if ($assignmentId) {
        $targetStudentId = $authRole === 'student' ? $authUserId : ((int) ($studentIdParam ?: $authUserId));

        $stmt = $pdo->prepare("
            SELECT *
            FROM assignment_submissions
            WHERE assignment_id = ? AND student_id = ?
            LIMIT 1
        ");
        $stmt->execute([$assignmentId, $targetStudentId]);
        $submission = $stmt->fetch(PDO::FETCH_ASSOC);
        sendResponse(['success' => true, 'data' => $submission ?: null]);
    }

    // List all submissions for a student (used by student dashboard submissions tab)
    $targetStudentId = $authRole === 'student' ? $authUserId : ((int) ($studentIdParam ?: $authUserId));
    $stmt = $pdo->prepare("
        SELECT
            sub.*,
            a.title as assignment_title,
            a.due_date,
            a.total_points,
            s.id as subject_id,
            s.name as subject_name,
            s.code as subject_code
        FROM assignment_submissions sub
        JOIN assignments a ON sub.assignment_id = a.id
        LEFT JOIN subjects s ON a.subject_id = s.id
        WHERE sub.student_id = ?
        ORDER BY sub.submitted_at DESC
    ");
    $stmt->execute([$targetStudentId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    sendResponse(['success' => true, 'data' => $rows]);
}

function handlePost(PDO $pdo, int $authUserId, string $authRole)
{
    if ($authRole !== 'student') {
        sendError('Only students can submit assignments', 403);
    }

    $assignmentId = $_POST['assignment_id'] ?? null;
    $submissionText = $_POST['submission_text'] ?? null;

    if (!$assignmentId) {
        sendError('Assignment ID required', 400);
    }

    // Ensure assignment exists and student is enrolled in subject
    $stmt = $pdo->prepare("
        SELECT a.id, a.subject_id, a.due_date
        FROM assignments a
        LEFT JOIN student_enrollments se ON se.subject_id = a.subject_id AND se.user_id = ?
        WHERE a.id = ? AND (se.user_id IS NOT NULL OR a.subject_id IS NULL)
        LIMIT 1
    ");
    $stmt->execute([$authUserId, $assignmentId]);
    $assignment = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$assignment) {
        sendError('Assignment not found or not accessible', 404);
    }

    $dueDate = new DateTime($assignment['due_date']);
    $now = new DateTime();
    $status = ($now > $dueDate) ? 'late' : 'submitted';

    $filePath = null;
    $fileName = null;
    $fileSize = null;

    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = __DIR__ . '/../uploads/assignments/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'zip', 'rar', 'jpg', 'jpeg', 'png'];
        $maxSize = 10 * 1024 * 1024; // 10MB

        $fileInfo = pathinfo($_FILES['file']['name']);
        $fileExt = strtolower($fileInfo['extension'] ?? '');
        if (!in_array($fileExt, $allowedTypes)) {
            sendError('Invalid file type. Allowed: ' . implode(', ', $allowedTypes), 400);
        }

        if ($_FILES['file']['size'] > $maxSize) {
            sendError('File too large. Maximum size: 10MB', 400);
        }

        $existingStmt = $pdo->prepare("
            SELECT file_path
            FROM assignment_submissions
            WHERE assignment_id = ? AND student_id = ?
            LIMIT 1
        ");
        $existingStmt->execute([$assignmentId, $authUserId]);
        $existingSubmission = $existingStmt->fetch(PDO::FETCH_ASSOC);

        if (!empty($existingSubmission['file_path'])) {
            $oldFilePath = __DIR__ . '/../uploads/' . $existingSubmission['file_path'];
            if (file_exists($oldFilePath)) {
                unlink($oldFilePath);
            }
        }

        $storedFileName = $authUserId . '_' . $assignmentId . '_' . time() . '.' . $fileExt;
        $storedPath = $uploadDir . $storedFileName;

        if (!move_uploaded_file($_FILES['file']['tmp_name'], $storedPath)) {
            sendError('Failed to upload file', 500);
        }

        $filePath = 'assignments/' . $storedFileName;
        $fileName = $_FILES['file']['name'];
        $fileSize = $_FILES['file']['size'];
    }

    $stmt = $pdo->prepare("
        INSERT INTO assignment_submissions
        (assignment_id, student_id, submission_text, file_path, file_name, file_size, status, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
            submission_text = VALUES(submission_text),
            file_path = VALUES(file_path),
            file_name = VALUES(file_name),
            file_size = VALUES(file_size),
            status = VALUES(status),
            submitted_at = NOW(),
            marks_obtained = NULL,
            feedback = NULL,
            graded_at = NULL,
            graded_by = NULL
    ");
    $stmt->execute([
        $assignmentId,
        $authUserId,
        $submissionText,
        $filePath,
        $fileName,
        $fileSize,
        $status
    ]);

    sendResponse([
        'success' => true,
        'data' => [
            'message' => 'Assignment submitted successfully',
            'status' => $status
        ]
    ]);
}

function handleDelete(PDO $pdo, int $authUserId, string $authRole)
{
    if ($authRole !== 'student') {
        sendError('Unauthorized', 403);
    }

    $assignmentId = filter_input(INPUT_GET, 'assignment_id', FILTER_SANITIZE_NUMBER_INT);
    if (!$assignmentId) {
        sendError('Assignment ID required', 400);
    }

    $stmt = $pdo->prepare("
        SELECT a.due_date, s.file_path
        FROM assignments a
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.student_id = ?
        WHERE a.id = ?
        LIMIT 1
    ");
    $stmt->execute([$authUserId, $assignmentId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        sendError('Assignment not found', 404);
    }

    $dueDate = new DateTime($row['due_date']);
    if (new DateTime() > $dueDate) {
        sendError('Cannot delete submission after due date', 403);
    }

    if (!empty($row['file_path'])) {
        $path = __DIR__ . '/../uploads/' . $row['file_path'];
        if (file_exists($path)) {
            unlink($path);
        }
    }

    $deleteStmt = $pdo->prepare("
        DELETE FROM assignment_submissions
        WHERE assignment_id = ? AND student_id = ?
    ");
    $deleteStmt->execute([$assignmentId, $authUserId]);

    sendResponse(['success' => true, 'data' => ['message' => 'Submission deleted']]);
}
