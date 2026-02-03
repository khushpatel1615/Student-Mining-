<?php
/**
 * Announcements API - Create, read, update, delete announcements
 * 
 * GET    /announcements.php?subject_id=X  - Get announcements for a subject
 * GET    /announcements.php?teacher_id=X  - Get announcements by teacher (for teacher dashboard)
 * POST   /announcements.php               - Create announcement (teacher/admin)
 * PUT    /announcements.php               - Update announcement
 * DELETE /announcements.php?id=X          - Delete announcement
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Verify authentication
$user = requireAuth();
$userId = $user['user_id'];
$userRole = $user['role'];

try {
    $pdo = getDBConnection();

    switch ($_SERVER['REQUEST_METHOD']) {
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
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function handleGet($pdo, $userId, $userRole)
{
    $subjectId = $_GET['subject_id'] ?? null;
    $teacherId = $_GET['teacher_id'] ?? null;

    if ($subjectId) {
        // Get announcements for a specific subject (for students viewing subject)
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

        // Fetch attachments
        attachAttachments($pdo, $announcements);

        echo json_encode(['success' => true, 'data' => $announcements]);

    } elseif ($teacherId) {
        // Get announcements by a teacher (for teacher dashboard)
        // Teachers can only see their own, admin can see any
        if ($userRole !== 'admin' && $userId != $teacherId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Access denied']);
            return;
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

        // Fetch attachments
        if (!empty($announcements)) {
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
                // Backward compatibility
                $ann['attachment_url'] = !empty($ann['attachments']) ? $ann['attachments'][0]['file_path'] : null;
            }
        }

        echo json_encode(['success' => true, 'data' => $announcements]);

    } else {
        // Get all announcements (admin only)
        if ($userRole !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin access required']);
            return;
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

        // Fetch attachments
        if (!empty($announcements)) {
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
                // Backward compatibility
                $ann['attachment_url'] = !empty($ann['attachments']) ? $ann['attachments'][0]['file_path'] : null;
            }
        }

        echo json_encode(['success' => true, 'data' => $announcements]);
    }
}

function handlePost($pdo, $userId, $userRole)
{
    // Only teachers and admins can create announcements
    if ($userRole === 'student') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Only teachers can create/update announcements']);
        return;
    }

    // Check if this is an update request (POST override)
    if (isset($_POST['action']) && $_POST['action'] === 'update') {
        $announcementId = $_POST['id'] ?? null;
        if (!$announcementId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ID required']);
            return;
        }

        // Verify Owner
        $stmt = $pdo->prepare("SELECT teacher_id FROM announcements WHERE id = ?");
        $stmt->execute([$announcementId]);
        $ann = $stmt->fetch();
        if (!$ann) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Not found']);
            return;
        }
        if ($userRole !== 'admin' && $ann['teacher_id'] != $userId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Access denied']);
            return;
        }

        // Update Text Fields
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

        // Handle File Additions (same logic as create)
        $uploadedFiles = [];
        $uploadDir = __DIR__ . '/../uploads/announcements/';
        if (!is_dir($uploadDir))
            mkdir($uploadDir, 0755, true);

        // Normalize and loop files
        $normalizeFiles = function ($files) {
            $normalized = [];
            if (isset($files['name']) && is_array($files['name'])) {
                foreach ($files['name'] as $idx => $name)
                    $normalized[] = ['name' => $name, 'type' => $files['type'][$idx], 'tmp_name' => $files['tmp_name'][$idx], 'error' => $files['error'][$idx], 'size' => $files['size'][$idx]];
            } else {
                $normalized[] = $files;
            }
            return $normalized;
        };

        $filesToProcess = [];
        if (isset($_FILES['attachments']))
            $filesToProcess = $normalizeFiles($_FILES['attachments']);
        elseif (isset($_FILES['attachment']))
            $filesToProcess = $normalizeFiles($_FILES['attachment']);

        foreach ($filesToProcess as $file) {
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
        }

        echo json_encode(['success' => true, 'message' => 'Announcement updated successfully']);
        return;
    }

    // Handle multipart/form-data
    $subjectId = $_POST['subject_id'] ?? null;
    $title = trim($_POST['title'] ?? '');
    $content = trim($_POST['content'] ?? '');
    $isPinned = isset($_POST['is_pinned']) ? filter_var($_POST['is_pinned'], FILTER_VALIDATE_BOOLEAN) : false;

    if (!$subjectId || !$title || !$content) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'subject_id, title, and content are required']);
        return;
    }

    // Verification logic
    if ($userRole === 'teacher') {
        $stmt = $pdo->prepare("SELECT id FROM teacher_subjects WHERE teacher_id = ? AND subject_id = ?");
        $stmt->execute([$userId, $subjectId]);
        if (!$stmt->fetch()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'You are not assigned to this subject']);
            return;
        }
    }

    // Handle File Upload
    $attachmentUrl = null;
    if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['attachment']['tmp_name'];
        $fileName = $_FILES['attachment']['name'];
        $fileSize = $_FILES['attachment']['size'];
        $fileType = $_FILES['attachment']['type'];
        $fileNameCmps = explode(".", $fileName);
        $fileExtension = strtolower(end($fileNameCmps));

        // Allowed extensions
        if ($fileExtension !== 'pdf') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Only PDF files are allowed']);
            return;
        }

        // Limit size (e.g. 5MB)
        if ($fileSize > 5 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'File size exceeds 5MB limit']);
            return;
        }

        // Create upload directory if not exists
        $uploadDir = __DIR__ . '/../uploads/announcements/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $newFileName = md5(time() . $fileName) . '.' . $fileExtension;
        $destPath = $uploadDir . $newFileName;

        if (move_uploaded_file($fileTmpPath, $destPath)) {
            // Save relative path for frontend access
            $attachmentUrl = 'backend/uploads/announcements/' . $newFileName;
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to move uploaded file']);
            return;
        }
    }

    // Create announcement
    $stmt = $pdo->prepare("
        INSERT INTO announcements (subject_id, teacher_id, title, content, is_pinned, attachment_url)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$subjectId, $userId, $title, $content, $isPinned ? 1 : 0, $attachmentUrl]);

    $announcementId = $pdo->lastInsertId();

    // Fetch the created announcement
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

    echo json_encode([
        'success' => true,
        'message' => 'Announcement created successfully',
        'data' => $announcement
    ]);
}

function handlePut($pdo, $userId, $userRole)
{
    $data = json_decode(file_get_contents('php://input'), true);
    $announcementId = $data['id'] ?? null;
    $title = trim($data['title'] ?? '');
    $content = trim($data['content'] ?? '');
    $isPinned = $data['is_pinned'] ?? null;

    if (!$announcementId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Announcement ID is required']);
        return;
    }

    // Verify ownership (teacher can only edit their own, admin can edit any)
    $stmt = $pdo->prepare("SELECT teacher_id FROM announcements WHERE id = ?");
    $stmt->execute([$announcementId]);
    $announcement = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$announcement) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Announcement not found']);
        return;
    }

    if ($userRole !== 'admin' && $announcement['teacher_id'] != $userId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'You can only edit your own announcements']);
        return;
    }

    // Build update query
    $updates = [];
    $params = [];

    if ($title) {
        $updates[] = "title = ?";
        $params[] = $title;
    }
    if ($content) {
        $updates[] = "content = ?";
        $params[] = $content;
    }
    if ($isPinned !== null) {
        $updates[] = "is_pinned = ?";
        $params[] = $isPinned ? 1 : 0;
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        return;
    }

    $params[] = $announcementId;
    $stmt = $pdo->prepare("UPDATE announcements SET " . implode(", ", $updates) . " WHERE id = ?");
    $stmt->execute($params);

    /* 
       Refactored Logic: Use the same helper as POST if possible, but for now duplicate for safety 
       since scope is inside function.
    */

    $uploadDir = __DIR__ . '/../uploads/announcements/';
    $uploadedFiles = [];

    // We need to parse multipart put if we want to be strict, but simplest is relying on POST override.
    // Check $_FILES (if method was spoofed or server config allows)
    if (!empty($_FILES)) {
        $normalizeFiles = function ($files) {
            $normalized = [];
            if (isset($files['name']) && is_array($files['name'])) {
                foreach ($files['name'] as $idx => $name) {
                    $normalized[] = [
                        'name' => $name,
                        'type' => $files['type'][$idx],
                        'tmp_name' => $files['tmp_name'][$idx],
                        'error' => $files['error'][$idx],
                        'size' => $files['size'][$idx]
                    ];
                }
            } else {
                $normalized[] = $files;
            }
            return $normalized;
        };

        $filesToProcess = [];
        if (isset($_FILES['attachments'])) {
            $filesToProcess = $normalizeFiles($_FILES['attachments']);
        } elseif (isset($_FILES['attachment'])) {
            $filesToProcess = $normalizeFiles($_FILES['attachment']);
        }

        foreach ($filesToProcess as $file) {
            if ($file['error'] === UPLOAD_ERR_OK) {
                $fileName = basename($file['name']);
                $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
                if ($ext === 'pdf' && $file['size'] <= 5 * 1024 * 1024) {
                    $newFileName = md5(time() . $fileName . uniqid()) . '.' . $ext;
                    $dest = $uploadDir . $newFileName;
                    if (move_uploaded_file($file['tmp_name'], $dest)) {
                        $stmtAtt = $pdo->prepare("INSERT INTO announcement_attachments (announcement_id, file_name, file_path) VALUES (?, ?, ?)");
                        $stmtAtt->execute([$announcementId, $fileName, 'backend/uploads/announcements/' . $newFileName]);
                    }
                }
            }
        }
    }

    echo json_encode(['success' => true, 'message' => 'Announcement updated successfully']);
}

function handleDelete($pdo, $userId, $userRole)
{
    $announcementId = $_GET['id'] ?? null;

    if (!$announcementId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Announcement ID is required']);
        return;
    }

    // Verify ownership
    $stmt = $pdo->prepare("SELECT teacher_id FROM announcements WHERE id = ?");
    $stmt->execute([$announcementId]);
    $announcement = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$announcement) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Announcement not found']);
        return;
    }

    if ($userRole !== 'admin' && $announcement['teacher_id'] != $userId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'You can only delete your own announcements']);
        return;
    }

    $stmt = $pdo->prepare("DELETE FROM announcements WHERE id = ?");
    $stmt->execute([$announcementId]);

    echo json_encode(['success' => true, 'message' => 'Announcement deleted successfully']);
}

function attachAttachments($pdo, &$announcements)
{
    if (empty($announcements)) {
        return;
    }

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
        // Backward compatibility
        $ann['attachment_url'] = !empty($ann['attachments']) ? $ann['attachments'][0]['file_path'] : null;
    }
}
