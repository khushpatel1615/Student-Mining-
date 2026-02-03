<?php
/**
 * Assignment Submissions API
 * Handles file uploads and submission management
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Verify authentication
$user = getAuthUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$pdo = getDBConnection();
$userId = $user['user_id'];
$userRole = $user['role'];

try {
    switch ($method) {
        case 'GET':
            // Get student's submission for an assignment
            $action = $_GET['action'] ?? 'view';
            $assignmentId = $_GET['assignment_id'] ?? null;

            if ($action === 'list' && ($userRole === 'admin' || $userRole === 'teacher')) {
                if (!$assignmentId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Assignment ID required']);
                    exit();
                }

                $stmt = $pdo->prepare("
                    SELECT s.*, u.full_name, u.student_id as student_code, u.avatar_url
                    FROM assignment_submissions s
                    JOIN users u ON s.student_id = u.id
                    WHERE s.assignment_id = ?
                    ORDER BY s.submitted_at DESC
                ");
                $stmt->execute([$assignmentId]);
                $submissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode(['success' => true, 'data' => $submissions]);
                exit();
            }

            if (!$assignmentId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Assignment ID required']);
                exit();
            }

            $stmt = $pdo->prepare("
                SELECT * FROM assignment_submissions
                WHERE assignment_id = ? AND student_id = ?
            ");
            $stmt->execute([$assignmentId, $userId]);
            $submission = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $submission]);
            break;

        case 'POST':
            // Submit or resubmit assignment
            if ($userRole !== 'student') {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Only students can submit assignments']);
                exit();
            }

            $assignmentId = $_POST['assignment_id'] ?? null;
            $submissionText = $_POST['submission_text'] ?? null;

            if (!$assignmentId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Assignment ID required']);
                exit();
            }

            // Check if assignment exists and get due date
            $stmt = $pdo->prepare("SELECT due_date FROM assignments WHERE id = ?");
            $stmt->execute([$assignmentId]);
            $assignment = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$assignment) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Assignment not found']);
                exit();
            }

            $dueDate = new DateTime($assignment['due_date']);
            $now = new DateTime();
            $status = ($now > $dueDate) ? 'late' : 'submitted';

            // Handle file upload
            $filePath = null;
            $fileName = null;
            $fileSize = null;

            if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = __DIR__ . '/../uploads/assignments/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }

                // Validate file
                $allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'zip', 'rar', 'jpg', 'jpeg', 'png'];
                $maxSize = 10 * 1024 * 1024; // 10MB

                $fileInfo = pathinfo($_FILES['file']['name']);
                $fileExt = strtolower($fileInfo['extension'] ?? '');

                if (!in_array($fileExt, $allowedTypes)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Invalid file type. Allowed: ' . implode(', ', $allowedTypes)]);
                    exit();
                }

                if ($_FILES['file']['size'] > $maxSize) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'File too large. Maximum size: 10MB']);
                    exit();
                }

                // Check if student already has a submission
                $stmt = $pdo->prepare("
                    SELECT file_path FROM assignment_submissions
                    WHERE assignment_id = ? AND student_id = ?
                ");
                $stmt->execute([$assignmentId, $userId]);
                $existingSubmission = $stmt->fetch(PDO::FETCH_ASSOC);

                // Delete old file if exists
                if ($existingSubmission && $existingSubmission['file_path']) {
                    $oldFilePath = __DIR__ . '/../uploads/assignments/' . basename($existingSubmission['file_path']);
                    if (file_exists($oldFilePath)) {
                        unlink($oldFilePath);
                    }
                }

                // Generate unique filename
                $fileName = $userId . '_' . $assignmentId . '_' . time() . '.' . $fileExt;
                $filePath = $uploadDir . $fileName;

                if (!move_uploaded_file($_FILES['file']['tmp_name'], $filePath)) {
                    http_response_code(500);
                    echo json_encode(['success' => false, 'error' => 'Failed to upload file']);
                    exit();
                }

                $fileSize = $_FILES['file']['size'];
                $filePath = 'assignments/' . $fileName; // Store relative path
                $fileName = $_FILES['file']['name']; // Original filename
            }

            // Insert or update submission
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
                $userId,
                $submissionText,
                $filePath,
                $fileName,
                $fileSize,
                $status
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Assignment submitted successfully',
                'status' => $status
            ]);
            break;

        case 'DELETE':
            // Delete submission (before due date only)
            if ($userRole !== 'student') {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Unauthorized']);
                exit();
            }

            $assignmentId = $_GET['assignment_id'] ?? null;

            if (!$assignmentId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Assignment ID required']);
                exit();
            }

            // Check due date
            $stmt = $pdo->prepare("
                SELECT a.due_date, s.file_path
                FROM assignments a
                LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.student_id = ?
                WHERE a.id = ?
            ");
            $stmt->execute([$userId, $assignmentId]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$data) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Assignment not found']);
                exit();
            }

            $dueDate = new DateTime($data['due_date']);
            $now = new DateTime();

            if ($now > $dueDate) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Cannot delete submission after due date']);
                exit();
            }

            // Delete file if exists
            if ($data['file_path']) {
                $filePath = __DIR__ . '/../uploads/' . $data['file_path'];
                if (file_exists($filePath)) {
                    unlink($filePath);
                }
            }

            // Delete submission record
            $stmt = $pdo->prepare("
                DELETE FROM assignment_submissions
                WHERE assignment_id = ? AND student_id = ?
            ");
            $stmt->execute([$assignmentId, $userId]);

            echo json_encode(['success' => true, 'message' => 'Submission deleted']);
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
