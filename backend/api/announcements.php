<?php

/**
 * Announcements API - Create, read, update, delete announcements
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';
require_once __DIR__ . '/../includes/api_helpers.php';

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);

handleCORS();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

try {
    $user = requireAuth();
    $userId = $user['user_id'];
    $userRole = $user['role'];

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
    error_log("Announcements API Error: " . $e->getMessage());
    sendError('Internal Server Error', 500, $e->getMessage());
}

function handleGet($pdo, $userId, $userRole)
{
    $subjectId = $_GET['subject_id'] ?? null;
    $teacherId = $_GET['teacher_id'] ?? null;

    if ($subjectId) {
        $stmt = $pdo->prepare("
            SELECT a.id, a.title, a.content, a.is_pinned, a.created_at, a.updated_at,
                   u.full_name as teacher_name, u.avatar_url as teacher_avatar,
                   s.name as subject_name, s.code as subject_code
            FROM announcements a
            JOIN users u ON a.teacher_id = u.id
            JOIN subjects s ON a.subject_id = s.id
            WHERE a.subject_id = ?
            ORDER BY a.is_pinned DESC, a.created_at DESC
        ");
        $stmt->execute([$subjectId]);
        $announcements = $stmt->fetchAll(PDO::FETCH_ASSOC);
        attachAttachments($pdo, $announcements);
        sendResponse($announcements);
    } elseif ($teacherId) {
        if ($userRole !== 'admin' && $userId != $teacherId) {
            sendError('Access denied', 403);
        }

        $stmt = $pdo->prepare("
            SELECT a.id, a.title, a.content, a.is_pinned, a.created_at, a.updated_at,
                   s.id as subject_id, s.name as subject_name, s.code as subject_code
            FROM announcements a
            JOIN subjects s ON a.subject_id = s.id
            WHERE a.teacher_id = ?
            ORDER BY a.created_at DESC
        ");
        $stmt->execute([$teacherId]);
        $announcements = $stmt->fetchAll(PDO::FETCH_ASSOC);
        attachAttachments($pdo, $announcements);
        sendResponse($announcements);
    } else {
        if ($userRole !== 'admin') {
            sendError('Admin access required', 403);
        }

        $stmt = $pdo->query("
            SELECT a.id, a.title, a.content, a.is_pinned, a.created_at, a.updated_at,
                   u.full_name as teacher_name,
                   s.name as subject_name, s.code as subject_code
            FROM announcements a
            JOIN users u ON a.teacher_id = u.id
            JOIN subjects s ON a.subject_id = s.id
            ORDER BY a.created_at DESC
            LIMIT 100
        ");
        $announcements = $stmt->fetchAll(PDO::FETCH_ASSOC);
        attachAttachments($pdo, $announcements);
        sendResponse($announcements);
    }
}

function handlePost($pdo, $userId, $userRole)
{
    if ($userRole === 'student') {
        sendError('Only teachers can create/update announcements', 403);
    }

    // Check for "method spoofing" via action parameter for file uploads
    if (isset($_POST['action']) && $_POST['action'] === 'update') {
        updateAnnouncement($pdo, $userId, $userRole);
        return;
    }

    $subjectId = $_POST['subject_id'] ?? null;
    $title = trim($_POST['title'] ?? '');
    $content = trim($_POST['content'] ?? '');
    $isPinned = isset($_POST['is_pinned']) ? filter_var($_POST['is_pinned'], FILTER_VALIDATE_BOOLEAN) : false;

    if (!$subjectId || !$title || !$content) {
        sendError('subject_id, title, and content are required', 400);
    }

    if ($userRole === 'teacher') {
        $stmt = $pdo->prepare("SELECT id FROM teacher_subjects WHERE teacher_id = ? AND subject_id = ?");
        $stmt->execute([$userId, $subjectId]);
        if (!$stmt->fetch()) {
            sendError('You are not assigned to this subject', 403);
        }
    }

    $attachmentUrl = handleFileUpload();

    $stmt = $pdo->prepare("
        INSERT INTO announcements (subject_id, teacher_id, title, content, is_pinned, attachment_url)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$subjectId, $userId, $title, $content, $isPinned ? 1 : 0, $attachmentUrl]);
    $announcementId = $pdo->lastInsertId();

    $stmt = $pdo->prepare("
        SELECT a.id, a.title, a.content, a.is_pinned, a.attachment_url, a.created_at, a.updated_at,
               u.full_name as teacher_name, u.avatar_url as teacher_avatar,
               s.name as subject_name, s.code as subject_code
        FROM announcements a
        JOIN users u ON a.teacher_id = u.id
        JOIN subjects s ON a.subject_id = s.id
        WHERE a.id = ?
    ");
    $stmt->execute([$announcementId]);
    $announcement = $stmt->fetch(PDO::FETCH_ASSOC);

    sendResponse(['message' => 'Announcement created successfully', 'data' => $announcement]);
}

function handlePut($pdo, $userId, $userRole)
{
    $data = getJsonInput();
    $_POST = array_merge($_POST, $data); // Merge JSON data into POST for unified handling
    updateAnnouncement($pdo, $userId, $userRole, true);
}

function updateAnnouncement($pdo, $userId, $userRole, $isJson = false)
{
    $announcementId = $_POST['id'] ?? null;
    if (!$announcementId)
        sendError('ID required', 400);

    $stmt = $pdo->prepare("SELECT teacher_id FROM announcements WHERE id = ?");
    $stmt->execute([$announcementId]);
    $ann = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$ann)
        sendError('Not found', 404);
    if ($userRole !== 'admin' && $ann['teacher_id'] != $userId) {
        sendError('Access denied', 403);
    }

    $updates = [];
    $params = [];

    if (isset($_POST['title'])) {
        $updates[] = "title = ?";
        $params[] = trim($_POST['title']);
    }
    if (isset($_POST['content'])) {
        $updates[] = "content = ?";
        $params[] = trim($_POST['content']);
    }
    if (isset($_POST['is_pinned'])) {
        $updates[] = "is_pinned = ?";
        $params[] = filter_var($_POST['is_pinned'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
    }

    if (!empty($updates)) {
        $params[] = $announcementId;
        $stmt = $pdo->prepare("UPDATE announcements SET " . implode(", ", $updates) . " WHERE id = ?");
        $stmt->execute($params);
    }

    // File Uploads (Only possible via POST)
    if (!$isJson) {
        $attachmentUrl = handleFileUpload();
        if ($attachmentUrl) {
            // Handle legacy attachment_url or new attachment table?
            // Original code inserted into `announcement_attachments` AND updated `attachment_url`?
            // Original code for POST Create used `attachment_url` in main table.
            // Original code for POST Update inserted into `announcement_attachments`.
            // Let's support `announcement_attachments`.
        }

        // Handling multiple attachments via helper if needed, but original code had specific logic
        // Original update logic:
        $uploadDir = __DIR__ . '/../uploads/announcements/';
        if (!is_dir($uploadDir))
            mkdir($uploadDir, 0755, true);

        // Process attachments array
        $processFile = function ($file) use ($pdo, $announcementId, $uploadDir) {
            if ($file['error'] === UPLOAD_ERR_OK) {
                $fileName = basename($file['name']);
                $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
                if ($ext === 'pdf' && $file['size'] <= 5 * 1024 * 1024) {
                    $newFileName = md5(time() . $fileName . uniqid()) . '.' . $ext;
                    if (move_uploaded_file($file['tmp_name'], $uploadDir . $newFileName)) {
                        $stmtAtt = $pdo->prepare("INSERT INTO announcement_attachments (announcement_id, file_name, file_path) VALUES (?, ?, ?)");
                        $stmtAtt->execute([$announcementId, $fileName, 'backend/uploads/announcements/' . $newFileName]);
                    }
                }
            }
        };

        // Parse attachments
        $files = $_FILES['attachments'] ?? $_FILES['attachment'] ?? null;
        if ($files) {
            if (is_array($files['name'])) {
                for ($i = 0; $i < count($files['name']); $i++) {
                    $processFile([
                        'name' => $files['name'][$i],
                        'type' => $files['type'][$i],
                        'tmp_name' => $files['tmp_name'][$i],
                        'error' => $files['error'][$i],
                        'size' => $files['size'][$i]
                    ]);
                }
            } else {
                $processFile($files);
            }
        }
    }

    sendResponse(['message' => 'Announcement updated successfully']);
}

function handleDelete($pdo, $userId, $userRole)
{
    $announcementId = $_GET['id'] ?? null;
    if (!$announcementId)
        sendError('Announcement ID is required', 400);

    $stmt = $pdo->prepare("SELECT teacher_id FROM announcements WHERE id = ?");
    $stmt->execute([$announcementId]);
    $announcement = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$announcement)
        sendError('Announcement not found', 404);

    if ($userRole !== 'admin' && $announcement['teacher_id'] != $userId) {
        sendError('You can only delete your own announcements', 403);
    }

    $stmt = $pdo->prepare("DELETE FROM announcements WHERE id = ?");
    $stmt->execute([$announcementId]);
    sendResponse(['message' => 'Announcement deleted successfully']);
}

function handleFileUpload()
{
    if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['attachment'];
        $fileName = basename($file['name']);
        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        if ($ext !== 'pdf')
            sendError('Only PDF files are allowed', 400);
        if ($file['size'] > 5 * 1024 * 1024)
            sendError('File size exceeds 5MB limit', 400);

        $uploadDir = __DIR__ . '/../uploads/announcements/';
        if (!is_dir($uploadDir))
            mkdir($uploadDir, 0755, true);

        $newFileName = md5(time() . $fileName . uniqid()) . '.' . $ext;
        if (move_uploaded_file($file['tmp_name'], $uploadDir . $newFileName)) {
            return 'backend/uploads/announcements/' . $newFileName;
        } else {
            sendError('Failed to move uploaded file', 500);
        }
    }
    return null;
}

function attachAttachments($pdo, &$announcements)
{
    if (empty($announcements))
        return;

    $ids = array_column($announcements, 'id');
    $placeholders = str_repeat('?,', count($ids) - 1) . '?';
    $stmtAtt = $pdo->prepare("SELECT * FROM announcement_attachments WHERE announcement_id IN ($placeholders)");
    $stmtAtt->execute($ids);
    $allAttachments = $stmtAtt->fetchAll(PDO::FETCH_ASSOC);

    $attachmentsMap = [];
    foreach ($allAttachments as $att) {
        $attachmentsMap[$att['announcement_id']][] = $att;
    }

    foreach ($announcements as &$ann) {
        $ann['attachments'] = $attachmentsMap[$ann['id']] ?? [];
        $ann['attachment_url'] = !empty($ann['attachments']) ? $ann['attachments'][0]['file_path'] : ($ann['attachment_url'] ?? null);
    }
}
