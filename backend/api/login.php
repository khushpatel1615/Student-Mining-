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

// Brute-force protection: limit login attempts per IP
$clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

// Skip rate limiting for localhost during development
$isLocal = ($clientIp === '127.0.0.1' || $clientIp === '::1' || $clientIp === 'localhost');
$rateLimitDir = __DIR__ . '/../data/rate_limits';
if (!is_dir($rateLimitDir)) {
    @mkdir($rateLimitDir, 0755, true);
}
$rateLimitFile = $rateLimitDir . '/' . md5('login_' . $clientIp) . '.json';
$maxAttempts = 5;
$windowSeconds = 900; // 15 minutes
if (!$isLocal && file_exists($rateLimitFile)) {
    $rateData = json_decode(file_get_contents($rateLimitFile), true);
    if ($rateData && isset($rateData['count']) && isset($rateData['expires'])) {
        if (time() < $rateData['expires']) {
            if ($rateData['count'] >= $maxAttempts) {
                $retryAfter = $rateData['expires'] - time();
                http_response_code(429);
                header('Content-Type: application/json');
                header('Retry-After: ' . $retryAfter);
                echo json_encode([
                    'success' => false,
                    'error' => 'Too many login attempts. Please try again in ' . ceil($retryAfter / 60) . ' minutes.',
                    'retryAfter' => $retryAfter
                ]);
                exit;
            }
        } else {
            // Window expired, reset
            $rateData = null;
        }
    }
}
// Increment attempt counter
$rateData = $rateData ?? ['count' => 0, 'expires' => time() + $windowSeconds];
$rateData['count']++;
file_put_contents($rateLimitFile, json_encode($rateData), LOCK_EX);
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
    // Check if no password (OAuth only)
    if ($user && empty($user['password_hash'])) {
        sendResponse([
            'success' => false,
            'status' => 'error',
            'error' => 'No password set for this account. Please sign in with Google.',
            'requiresGoogle' => true
        ], 401);
    }

    // Verify user and password together to prevent enumeration
    if (!$user || !password_verify($password, $user['password_hash'])) {
        // Add random delay to prevent timing attacks
        usleep(random_int(100000, 300000));
        sendError('Invalid credentials. Please check your Student ID and Password.', 401);
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

    // Clear rate limit on successful login
    if (file_exists($rateLimitFile)) {
        @unlink($rateLimitFile);
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
