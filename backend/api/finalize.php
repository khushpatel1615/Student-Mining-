<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/cache.php';
require_once __DIR__ . '/../includes/jwt.php';
require_once __DIR__ . '/../includes/api_helpers.php';
require_once __DIR__ . '/../includes/notifications.php';

error_reporting(E_ALL);
ini_set('display_errors', 0);
handleCORS();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

try {
    switch ($method) {
        case 'GET':
            handleGet($pdo);
            break;
        case 'POST':
            handlePost($pdo);
            break;
        case 'OPTIONS':
            exit(0);
        default:
            sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    error_log("Finalize API Error: " . $e->getMessage());
    sendError('Internal Server Error', 500, $e->getMessage());
}

function handleGet($pdo)
{
    $user = requireAuth();
    $subjectId = $_GET['subject_id'] ?? null;
    $checkFinalized = $_GET['check_finalized'] ?? null;

    if ($subjectId && $checkFinalized) {
        $stmt = $pdo->prepare("
SELECT se.is_finalized, se.finalized_at, u.full_name as finalized_by_name
FROM student_enrollments se
LEFT JOIN users u ON se.finalized_by = u.id
WHERE se.subject_id = ?
LIMIT 1
");
        $stmt->execute([$subjectId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            sendResponse([
                'is_finalized' => false,
                'finalized_at' => null,
                'finalized_by_name' => null
            ]);
        }

        sendResponse([
            'is_finalized' => (bool) $row['is_finalized'],
            'finalized_at' => $row['finalized_at'],
            'finalized_by_name' => $row['finalized_by_name']
        ]);
    }

    sendError('Invalid GET request parameters', 400);
}

function handlePost($pdo)
{
    $user = requireAuth();
    $data = getJsonInput();
    $action = $data['action'] ?? null;
    $subjectId = $data['subject_id'] ?? null;

    if (!$action || !$subjectId) {
        sendError('Action and subject_id are required', 400);
    }

    if ($action === 'finalize_subject') {
        if ($user['role'] !== 'admin' && $user['role'] !== 'teacher') {
            sendError('Unauthorized', 403);
        }

        // Validate all enrollments have final_percentage
        $stmt = $pdo->prepare("
SELECT COUNT(*) FROM student_enrollments
WHERE subject_id = ? AND status = 'active' AND final_percentage IS NULL
");
        $stmt->execute([$subjectId]);
        $missingCount = $stmt->fetchColumn();

        if ($missingCount > 0) {
            sendError("Cannot finalize: {$missingCount} students have incomplete grades.", 400);
        }

        $pdo->beginTransaction();

        try {
            // Get subject name
            $subStmt = $pdo->prepare("SELECT name FROM subjects WHERE id = ?");
            $subStmt->execute([$subjectId]);
            $subjectName = $subStmt->fetchColumn();

            // Set finalized
            $updStmt = $pdo->prepare("
UPDATE student_enrollments
SET is_finalized = 1, finalized_by = ?, finalized_at = NOW()
WHERE subject_id = ? AND status = 'active'
");
            $updStmt->execute([$user['user_id'], $subjectId]);
            $finalizedCount = $updStmt->rowCount();

            // Get affected students
            $studStmt = $pdo->prepare("
SELECT user_id, final_grade, final_percentage
FROM student_enrollments
WHERE subject_id = ? AND status = 'active'
");
            $studStmt->execute([$subjectId]);
            $students = $studStmt->fetchAll(PDO::FETCH_ASSOC);

            // Notify and email
            foreach ($students as $stu) {
                // In-app
                createNotification(
                    $pdo,
                    $stu['user_id'],
                    'grade_update',
                    'Grades Finalized',
                    "Your grades for {$subjectName} have been officially finalized."
                );

                // Queue Email
                queueEmail($pdo, $stu['user_id'], 'grade_finalized', [
                    'subject_name' => $subjectName,
                    'letter_grade' => $stu['final_grade'],
                    'final_percentage' => $stu['final_percentage']
                ]);
            }

            // Invalidate cache
            Cache::forgetPattern("grade_integrity_{$subjectId}");
            Cache::forgetPattern("grade_integrity_all");

            $pdo->commit();
            sendResponse([
                'finalized_count' => $finalizedCount,
                'subject_name' => $subjectName,
                'message' => "Successfully finalized grades for {$finalizedCount} students."
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }

    } elseif ($action === 'unfinalize_subject') {
        if ($user['role'] !== 'admin') {
            sendError('Unauthorized', 403);
        }

        $reason = $data['reason'] ?? 'Administrator overridden.';

        $pdo->beginTransaction();

        try {
            // Get subject name
            $subStmt = $pdo->prepare("SELECT name FROM subjects WHERE id = ?");
            $subStmt->execute([$subjectId]);
            $subjectName = $subStmt->fetchColumn();

            // To log in grade_edit_log, we need a criteria ID.
// We'll get just one criteria id per subject to use as reference.
            $critStmt = $pdo->prepare("SELECT id FROM evaluation_criteria WHERE subject_id = ? LIMIT 1");
            $critStmt->execute([$subjectId]);
            $critId = $critStmt->fetchColumn() ?: 0;

            // Get enrollments that are being unfinalized
            $enrollStmt = $pdo->prepare("SELECT id, user_id FROM student_enrollments WHERE subject_id = ? AND is_finalized = 1 AND
status = 'active'");
            $enrollStmt->execute([$subjectId]);
            $enrollments = $enrollStmt->fetchAll(PDO::FETCH_ASSOC);

            // Unfinalize
            $updStmt = $pdo->prepare("
UPDATE student_enrollments
SET is_finalized = 0, finalized_by = NULL, finalized_at = NULL
WHERE subject_id = ? AND is_finalized = 1 AND status = 'active'
");
            $updStmt->execute([$subjectId]);

            // Notifications & logs
            $logStmt = $pdo->prepare("
INSERT INTO grade_edit_log (enrollment_id, criteria_id, edited_by, edit_reason, override_approved_by)
VALUES (?, ?, ?, ?, ?)
");

            foreach ($enrollments as $e) {
                // In-app
                createNotification(
                    $pdo,
                    $e['user_id'],
                    'grade_update',
                    'Grades Reopened',
                    "Your grades for {$subjectName} have been reopened for correction by an administrator."
                );

                if ($critId) {
                    $logStmt->execute([$e['id'], $critId, $user['user_id'], "Unfinalize subject: " . $reason, $user['user_id']]);
                }
            }

            $pdo->commit();
            sendResponse([
                'message' => 'Subject has been successfully unfinalized.',
                'subject_name' => $subjectName
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }

    } else {
        sendError('Invalid action', 400);
    }
}