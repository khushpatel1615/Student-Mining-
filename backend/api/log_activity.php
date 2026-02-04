<?php

/**
 * Log Activity API
 * POST /api/log_activity.php
 * Records user actions for analytics.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';
setCORSHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
// 1. Authenticate
    $token = getTokenFromHeader();
    $validation = verifyToken($token);
    if (!$validation || !$validation['valid']) {
        throw new Exception("Unauthorized");
    }

    $user = $validation['payload'];
    $userId = $user['user_id'];
// 2. Parse Input
    $input = json_decode(file_get_contents('php://input'), true);
    if (empty($input['activity_type'])) {
        throw new Exception("Activity type is required");
    }

    $type = substr(trim($input['activity_type']), 0, 50);
    $details = isset($input['activity_details']) ? $input['activity_details'] : null;
// Convert details to JSON string if it's an array/object
    if (is_array($details) || is_object($details)) {
        $details = json_encode($details);
    }

    $ip = $_SERVER['REMOTE_ADDR'] ?? null;
// 3. Insert Log
    $stmt = $pdo->prepare("
        INSERT INTO student_activity_logs (user_id, activity_type, activity_details, ip_address)
        VALUES (?, ?, ?, ?)
    ");
    $stmt->execute([$userId, $type, $details, $ip]);
    echo json_encode(['success' => true, 'message' => 'Activity logged']);
} catch (Exception $e) {
// Log failures shouldn't necessarily break the frontend app, but we return 400/500 for debugging
    $code = ($e->getMessage() === 'Unauthorized') ? 401 : 500;
    if ($e->getMessage() === 'Activity type is required') {
        $code = 400;
    }

    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
