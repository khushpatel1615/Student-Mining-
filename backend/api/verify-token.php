<?php

/**
 * Verify Token API Endpoint
 * GET /api/verify-token.php
 * Validates JWT and returns user info
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

requireMethod(['GET', 'POST']);

// Get token from header
$token = getTokenFromHeader();

if (!$token) {
    sendError('No token provided', 401);
}

// Verify token
$result = verifyToken($token);

if (!$result['valid']) {
    sendError($result['error'], 401);
}

$payload = $result['payload'];

// Verify user still exists and is active
try {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("SELECT id, email, student_id, full_name, role, avatar_url, password_hash, current_semester FROM users WHERE id = :id AND is_active = 1");
    $stmt->execute(['id' => $payload['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        sendError('User account not found or inactive', 401);
    }

    sendResponse([
        'success' => true,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'student_id' => $user['student_id'],
            'full_name' => $user['full_name'],
            'role' => $user['role'],
            'avatar_url' => $user['avatar_url'],
            'current_semester' => $user['current_semester'],
            'hasPassword' => !empty($user['password_hash'])
        ]
    ]);
} catch (PDOException $e) {
    Logger::error('Token verification DB error', ['message' => $e->getMessage()]);
    sendError('Database error', 500);
}
