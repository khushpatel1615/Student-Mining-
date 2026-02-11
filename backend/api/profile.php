<?php

/**
 * Profile Management API
 * Handles student/user profile updates including password changes
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';
define('UPLOAD_DIR', __DIR__ . '/../uploads/avatars/');
if (!file_exists(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0777, true);
}

setCORSHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();
try {
    switch ($method) {
        case 'PUT':
        case 'POST': // Allow POST for file uploads
            handleUpdate($pdo, $method);

            break;
        case 'OPTIONS':
            http_response_code(200);

            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

/**
 * PUT - Update profile (Password or Details)
 */
/**
 * Handle Profile Update (PUT/POST)
 */
function handleUpdate($pdo, $requestMethod)
{
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $userId = $user['user_id'];
    $data = [];
    // Parse data based on Content-Type
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (strpos($contentType, 'application/json') !== false) {
        // Handle JSON PUT/POST
        $data = json_decode(file_get_contents('php://input'), true);
    } else {
        // Handle Form Data (Multipart)
        $data = $_POST;
    }

    if (empty($data) && empty($_FILES)) {
        http_response_code(400);
        echo json_encode(['error' => 'No data provided']);
        return;
    }

    // 1. Password Change
    if (isset($data['current_password']) && isset($data['new_password'])) {
        updatePassword($pdo, $userId, $data['current_password'], $data['new_password']);
        return;
    }

    // 2. Avatar Upload
    if (isset($_FILES['avatar'])) {
        handleAvatarUpload($pdo, $userId, $_FILES['avatar']);
        return;
    }

    // 3. Profile Details Update
    if (isset($data['full_name'])) {
        updateProfile($pdo, $userId, $data);
        return;
    }

    http_response_code(400);
    echo json_encode(['error' => 'Invalid update request']);
}

/**
 * Handle Avatar Upload (Secure)
 */
function handleAvatarUpload($pdo, $userId, $file)
{
    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'File upload error code: ' . $file['error']]);
        return;
    }

    // 1. Size validation (2MB max)
    $maxSize = 2 * 1024 * 1024;
    if ($file['size'] > $maxSize) {
        http_response_code(400);
        echo json_encode(['error' => 'File too large. Max 2MB allowed']);
        return;
    }

    // 2. MIME type validation using finfo (not user-provided type)
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $detectedMime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $allowedMimes = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp'
    ];

    if (!isset($allowedMimes[$detectedMime])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid file type. Only JPG, PNG, and WebP are allowed']);
        return;
    }

    // 3. Attempt to decode the image (additional security layer)
    try {
        $imageInfo = getimagesize($file['tmp_name']);
        if ($imageInfo === false) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid image file']);
            return;
        }

        // Verify image can be loaded (prevents malicious files)
        $img = null;
        switch ($detectedMime) {
            case 'image/jpeg':
                $img = @imagecreatefromjpeg($file['tmp_name']);
                break;
            case 'image/png':
                $img = @imagecreatefrompng($file['tmp_name']);
                break;
            case 'image/webp':
                $img = @imagecreatefromwebp($file['tmp_name']);
                break;
        }

        if ($img === false) {
            http_response_code(400);
            echo json_encode(['error' => 'Could not process image']);
            return;
        }
        imagedestroy($img);
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid image file']);
        return;
    }

    // 4. Generate secure random filename (not based on user input)
    $extension = $allowedMimes[$detectedMime];
    $randomName = bin2hex(random_bytes(16));
    $filename = $randomName . '.' . $extension;
    $filepath = UPLOAD_DIR . $filename;

    // 5. Ensure the upload directory exists with proper permissions
    if (!file_exists(UPLOAD_DIR)) {
        mkdir(UPLOAD_DIR, 0755, true); // 0755 instead of 0777
    }

    // 6. Move uploaded file with proper permissions
    if (move_uploaded_file($file['tmp_name'], $filepath)) {
        // Set file permissions (readable but not executable)
        chmod($filepath, 0644);

        // 7. Delete old avatar if exists
        $stmt = $pdo->prepare("SELECT avatar_url FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $oldAvatar = $stmt->fetchColumn();
        if ($oldAvatar) {
            $oldPath = __DIR__ . '/..' . $oldAvatar;
            if (file_exists($oldPath) && is_file($oldPath)) {
                unlink($oldPath);
            }
        }

        // 8. Update database
        $dbPath = '/backend/uploads/avatars/' . $filename;
        $stmt = $pdo->prepare("UPDATE users SET avatar_url = ? WHERE id = ?");
        $stmt->execute([$dbPath, $userId]);

        echo json_encode([
            'success' => true,
            'message' => 'Avatar updated successfully',
            'avatar_url' => $dbPath
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save uploaded file']);
    }
}


/**
 * Update Password
 */
function updatePassword($pdo, $userId, $currentPassword, $newPassword)
{
    // 1. Verify current password
    $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Current password is incorrect']);
        return;
    }

    // 2. Update to new password
    $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
    $updateStmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    $updateStmt->execute([$newHash, $userId]);
    echo json_encode(['success' => true, 'message' => 'Password changed successfully']);
}

/**
 * Update Profile Details
 */
function updateProfile($pdo, $userId, $data)
{
    $fields = [];
    $params = [];
    if (isset($data['full_name'])) {
        // Basic validation
        if (strlen($data['full_name']) < 2) {
            http_response_code(400);
            echo json_encode(['error' => 'Name must be at least 2 characters']);
            return;
        }
        $fields[] = 'full_name = ?';
        $params[] = $data['full_name'];
    }

    // Can add other fields here later (e.g. email if allowed)

    if (empty($fields)) {
        http_response_code(400);
        echo json_encode(['error' => 'No valid fields to update']);
        return;
    }

    $params[] = $userId;
    $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
}
