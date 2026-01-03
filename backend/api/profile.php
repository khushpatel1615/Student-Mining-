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
 * Handle Avatar Upload
 */
function handleAvatarUpload($pdo, $userId, $file)
{
    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'File upload error code: ' . $file['error']]);
        return;
    }

    // Validation
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    $maxSize = 2 * 1024 * 1024; // 2MB

    if (!in_array($file['type'], $allowedTypes)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid file type. Only JPG, PNG, and WebP needed']);
        return;
    }

    if ($file['size'] > $maxSize) {
        http_response_code(400);
        echo json_encode(['error' => 'File too large. Max 2MB allowed']);
        return;
    }

    // Generate filename
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'avatar_' . $userId . '_' . time() . '.' . $ext;
    $filepath = UPLOAD_DIR . $filename;

    // Relative path for storing in DB (accessible via web)
    // NOTE: This assumes /backend/uploads is accessible. We might need a rewrite rule or direct path.
    // For now, we store generic path. Frontend might need to prepend base URL.
    $dbPath = '/backend/uploads/avatars/' . $filename;

    if (move_uploaded_file($file['tmp_name'], $filepath)) {
        $stmt = $pdo->prepare("UPDATE users SET avatar_url = ? WHERE id = ?");
        $stmt->execute([$dbPath, $userId]);

        echo json_encode(['success' => true, 'message' => 'Avatar updated successfully', 'avatar_url' => $dbPath]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to move uploaded file']);
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
