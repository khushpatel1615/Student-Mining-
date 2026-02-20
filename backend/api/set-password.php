<?php

/**
 * Set Password API Endpoint
 * POST /api/set-password.php
 * Allows authenticated users to set/change their password
 * Useful for users who signed in via Google OAuth and want to add password login
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';
requireMethod('POST');

// Require authentication
$authUser = requireAuth();
// Get Input
$input = getJsonInput();
if (!$input) {
    sendError('Invalid JSON input', 400);
}

$newPassword = $input['new_password'] ?? '';
$currentPassword = $input['current_password'] ?? null;
// Optional, required only if changing existing password

if (empty($newPassword)) {
    sendError('New password is required', 400);
}

if (strlen($newPassword) < 8) {
    sendError('Password must be at least 8 characters long', 400);
}

// Check for password strength (at least one letter and one number)
if (!preg_match('/[a-zA-Z]/', $newPassword) || !preg_match('/[0-9]/', $newPassword)) {
    sendError('Password must contain at least one letter and one number', 400);
}

try {
    $pdo = getDBConnection();
    // Get current user's password_hash to check if they already have a password
    $stmt = $pdo->prepare("SELECT id, email, password_hash FROM users WHERE id = :id AND is_active = 1");
    $stmt->execute(['id' => $authUser['user_id']]);
    $user = $stmt->fetch();
    if (!$user) {
        sendError('User account not found', 404);
    }

    // If user already has a password, require current password verification
    if (!empty($user['password_hash'])) {
        if (empty($currentPassword)) {
            sendError('Current password is required to change password', 400);
        }

        if (!password_verify($currentPassword, $user['password_hash'])) {
            sendError('Current password is incorrect', 401);
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
    sendResponse([
        'success' => true,
        'message' => empty($user['password_hash'])
            ? 'Password set successfully! You can now log in with your email/student ID and password.'
            : 'Password changed successfully!'
    ]);
} catch (PDOException $e) {
    sendError('Database error occurred', 500);
}
