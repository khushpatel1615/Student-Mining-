<?php
/**
 * Set Password API Endpoint
 * POST /api/set-password.php
 * Allows authenticated users to set/change their password
 * Useful for users who signed in via Google OAuth and want to add password login
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

// Require authentication
$authUser = requireAuth();

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    jsonResponse(['success' => false, 'error' => 'Invalid JSON input'], 400);
}

$newPassword = $input['new_password'] ?? '';
$currentPassword = $input['current_password'] ?? null; // Optional, required only if changing existing password

// Validate new password
if (empty($newPassword)) {
    jsonResponse(['success' => false, 'error' => 'New password is required'], 400);
}

if (strlen($newPassword) < 8) {
    jsonResponse(['success' => false, 'error' => 'Password must be at least 8 characters long'], 400);
}

// Check for password strength (at least one letter and one number)
if (!preg_match('/[a-zA-Z]/', $newPassword) || !preg_match('/[0-9]/', $newPassword)) {
    jsonResponse(['success' => false, 'error' => 'Password must contain at least one letter and one number'], 400);
}

try {
    $pdo = getDBConnection();

    // Get current user's password_hash to check if they already have a password
    $stmt = $pdo->prepare("SELECT id, email, password_hash FROM users WHERE id = :id AND is_active = 1");
    $stmt->execute(['id' => $authUser['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(['success' => false, 'error' => 'User account not found'], 404);
    }

    // If user already has a password, require current password verification
    if (!empty($user['password_hash'])) {
        if (empty($currentPassword)) {
            jsonResponse(['success' => false, 'error' => 'Current password is required to change password'], 400);
        }

        if (!password_verify($currentPassword, $user['password_hash'])) {
            jsonResponse(['success' => false, 'error' => 'Current password is incorrect'], 401);
        }
    }

    // Hash the new password
    $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);

    // Update the password
    $updateStmt = $pdo->prepare("UPDATE users SET password_hash = :password_hash WHERE id = :id");
    $updateStmt->execute([
        'password_hash' => $newPasswordHash,
        'id' => $user['id']
    ]);

    jsonResponse([
        'success' => true,
        'message' => empty($user['password_hash'])
            ? 'Password set successfully! You can now log in with your email/student ID and password.'
            : 'Password changed successfully!'
    ]);

} catch (PDOException $e) {
    jsonResponse(['success' => false, 'error' => 'Database error occurred'], 500);
}
?>