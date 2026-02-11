<?php

/**
 * Profile Management API
 * Handles student/user profile updates including password changes
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

// Define securely, but used locally
define('UPLOAD_DIR', __DIR__ . '/../uploads/avatars/');

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

try {
    switch ($method) {
        case 'PUT':
        case 'POST': // Allow POST for file uploads
            handleUpdate($pdo, $method);
            break;
        case 'OPTIONS':
            exit(0);
        default:
            sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    sendError('An error occurred', 500, $e->getMessage());
}

/**
 * Handle Profile Update (PUT/POST)
 */
function handleUpdate($pdo, $requestMethod)
{
    $user = requireAuth();
    $userId = $user['user_id'];

    $data = [];
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    if (strpos($contentType, 'application/json') !== false) {
        $data = getJsonInput();
    } else {
        $data = $_POST;
    }

    if (empty($data) && empty($_FILES)) {
        sendError('No data provided');
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

    sendError('Invalid update request');
}

/**
 * Handle Avatar Upload (Secure)
 */
function handleAvatarUpload($pdo, $userId, $file)
{
    if ($file['error'] !== UPLOAD_ERR_OK) {
        sendError('File upload error code: ' . $file['error']);
    }

    // 1. Size validation (2MB max)
    $maxSize = 2 * 1024 * 1024;
    if ($file['size'] > $maxSize) {
        sendError('File too large. Max 2MB allowed');
    }

    // 2. MIME type validation using finfo
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $detectedMime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $allowedMimes = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp'
    ];

    if (!isset($allowedMimes[$detectedMime])) {
        sendError('Invalid file type. Only JPG, PNG, and WebP are allowed');
    }

    // 3. Attempt to decode the image
    try {
        $imageInfo = getimagesize($file['tmp_name']);
        if ($imageInfo === false) {
            sendError('Invalid image file');
        }

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
            sendError('Could not process image');
        }
        imagedestroy($img);
    } catch (Exception $e) {
        sendError('Invalid image file');
    }

    // 4. Generate secure random filename
    $extension = $allowedMimes[$detectedMime];
    try {
        $randomName = bin2hex(random_bytes(16));
    } catch (Exception $e) {
        $randomName = md5(uniqid(rand(), true)); // Fallback
    }
    $filename = $randomName . '.' . $extension;

    // Ensure upload dir exists
    if (!file_exists(UPLOAD_DIR)) {
        if (!mkdir(UPLOAD_DIR, 0755, true)) {
            sendError('Failed to create upload directory', 500);
        }
    }

    $filepath = UPLOAD_DIR . $filename;

    // 5. Move uploaded file
    if (move_uploaded_file($file['tmp_name'], $filepath)) {
        chmod($filepath, 0644);

        // 6. Delete old avatar
        $stmt = $pdo->prepare("SELECT avatar_url FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $oldAvatar = $stmt->fetchColumn();
        if ($oldAvatar) {
            // Extract filename from URL/Path if needed, but assuming stored as relative path
            // e.g., '/backend/uploads/avatars/xyz.jpg'
            $oldFilename = basename($oldAvatar);
            if ($oldFilename && file_exists(UPLOAD_DIR . $oldFilename)) {
                unlink(UPLOAD_DIR . $oldFilename);
            }
        }

        // 7. Update database
        // Store relative URL path
        $dbPath = '/backend/uploads/avatars/' . $filename;
        $stmt = $pdo->prepare("UPDATE users SET avatar_url = ? WHERE id = ?");
        $stmt->execute([$dbPath, $userId]);

        sendResponse([
            'success' => true,
            'message' => 'Avatar updated successfully',
            'avatar_url' => $dbPath
        ]);
    } else {
        sendError('Failed to save uploaded file', 500);
    }
}

/**
 * Update Password
 */
function updatePassword($pdo, $userId, $currentPassword, $newPassword)
{
    $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
        sendError('Current password is incorrect', 401);
    }

    $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
    $updateStmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    $updateStmt->execute([$newHash, $userId]);

    sendResponse(['success' => true, 'message' => 'Password changed successfully']);
}

/**
 * Update Profile Details
 */
function updateProfile($pdo, $userId, $data)
{
    $fields = [];
    $params = [];

    if (isset($data['full_name'])) {
        if (strlen($data['full_name']) < 2) {
            sendError('Name must be at least 2 characters');
        }
        $fields[] = 'full_name = ?';
        $params[] = $data['full_name'];
    }

    if (empty($fields)) {
        sendError('No valid fields to update');
    }

    $params[] = $userId;
    $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    sendResponse(['success' => true, 'message' => 'Profile updated successfully']);
}
