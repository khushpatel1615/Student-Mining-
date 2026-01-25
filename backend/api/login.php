<?php
/**
 * Login API Endpoint
 * POST /api/login.php
 * Handles Student ID / Password authentication
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

// Enforce Method
requireMethod('POST');

// Get Input
$input = getJsonInput();
if (!$input) {
    sendError('Invalid JSON input', 400);
}

// Validate fields
$studentId = trim($input['student_id'] ?? '');
$password = $input['password'] ?? '';

if (empty($studentId) || empty($password)) {
    sendError('Student ID and password are required', 400);
}

try {
    $pdo = getDBConnection();

    // Check if user exists
    $stmt = $pdo->prepare("
        SELECT id, email, student_id, password_hash, full_name, role, avatar_url, is_active, current_semester 
        FROM users 
        WHERE (student_id = :identifier1 OR email = :identifier2)
    ");
    $stmt->execute(['identifier1' => $studentId, 'identifier2' => $studentId]);
    $user = $stmt->fetch();

    if (!$user) {
        sendError('Account not found. Please check your credentials.', 401);
    }

    // Check if inactive
    if (!$user['is_active']) {
        sendResponse([
            'success' => false,
            'status' => 'error',
            'error' => 'Your account has been deactivated. Please contact the administrator for assistance.',
            'accountInactive' => true
        ], 403);
    }

    // Check if no password (OAuth only)
    if (empty($user['password_hash'])) {
        sendResponse([
            'success' => false,
            'status' => 'error',
            'error' => 'No password set for this account. Please sign in with Google.',
            'requiresGoogle' => true
        ], 401);
    }

    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        sendError('Invalid password. Please try again.', 401);
    }

    // Update last login
    $updateStmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = :id");
    $updateStmt->execute(['id' => $user['id']]);

    // Log Activity (fail-safe)
    try {
        $logStmt = $pdo->prepare("INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES (:uid, 'login', 'User logged in', :ip)");
        $logStmt->execute([
            'uid' => $user['id'],
            'ip' => $_SERVER['REMOTE_ADDR']
        ]);
    } catch (Exception $e) {
        // Continue login even if log fails
    }

    // Generate JWT token
    $token = generateToken($user['id'], $user['email'], $user['role'], $user['full_name']);

    // Success Response
    sendResponse([
        'success' => true,
        'message' => 'Login successful',
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'student_id' => $user['student_id'],
            'full_name' => $user['full_name'],
            'role' => $user['role'],
            'avatar_url' => $user['avatar_url'],
            'current_semester' => $user['current_semester'],
            'hasPassword' => true
        ]
    ]);

} catch (PDOException $e) {
    sendError('Database error occurred', 500, $e->getMessage());
}
?>