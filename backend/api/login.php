<?php
/**
 * Login API Endpoint
 * POST /api/login.php
 * Handles Student ID / Password authentication
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    jsonResponse(['success' => false, 'error' => 'Invalid JSON input'], 400);
}

// Validate required fields
$studentId = trim($input['student_id'] ?? '');
$password = $input['password'] ?? '';

if (empty($studentId) || empty($password)) {
    jsonResponse(['success' => false, 'error' => 'Student ID and password are required'], 400);
}

try {
    $pdo = getDBConnection();

    // Look up user by student_id or email
    $stmt = $pdo->prepare("
        SELECT id, email, student_id, password_hash, full_name, role, avatar_url 
        FROM users 
        WHERE (student_id = :identifier1 OR email = :identifier2) AND is_active = 1
    ");
    $stmt->execute(['identifier1' => $studentId, 'identifier2' => $studentId]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(['success' => false, 'error' => 'Account not found. Please check your credentials.'], 401);
    }

    // Check if user has a password set (might be OAuth-only user)
    if (empty($user['password_hash'])) {
        jsonResponse([
            'success' => false,
            'error' => 'No password set for this account. Please sign in with Google, then set a password in your profile settings.',
            'requiresGoogle' => true
        ], 401);
    }

    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        jsonResponse(['success' => false, 'error' => 'Invalid password. Please try again.'], 401);
    }

    // Update last login
    $updateStmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = :id");
    $updateStmt->execute(['id' => $user['id']]);

    // Generate JWT token
    $token = generateToken($user['id'], $user['email'], $user['role'], $user['full_name']);

    // Return success response
    jsonResponse([
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
            'hasPassword' => true  // If they're logging in with password, they obviously have one
        ]
    ]);

} catch (PDOException $e) {
    jsonResponse(['success' => false, 'error' => 'Database error occurred'], 500);
}
?>