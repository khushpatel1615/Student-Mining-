<?php
/**
 * Verify Token API Endpoint
 * GET /api/verify-token.php
 * Validates JWT and returns user info
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

// Debug logging helper (copied from google-auth.php for consistency)
function logDebug($message, $data = [])
{
    $logFile = __DIR__ . '/debug_auth.txt';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] [VERIFY-TOKEN] $message\n";
    if (!empty($data)) {
        $logEntry .= json_encode($data, JSON_PRETTY_PRINT) . "\n";
    }
    $logEntry .= str_repeat('-', 40) . "\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND);
}

setCORSHeaders();

// Accept GET and POST
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST'])) {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

// Get token from header
$token = getTokenFromHeader();
logDebug('Token verification request', ['token_present' => !empty($token), 'method' => $_SERVER['REQUEST_METHOD'], 'headers' => getallheaders()]);

if (!$token) {
    logDebug('No token found in headers');
    jsonResponse(['success' => false, 'error' => 'No token provided'], 401);
}

// Verify token
$result = verifyToken($token);
logDebug('Token verification result', ['valid' => $result['valid'], 'error' => $result['error'] ?? null]);

if (!$result['valid']) {
    // If it's a backend-generated JWT, this failure is real.
    // If it's a Google Access Token that was saved in localStorage, verifyToken (jwt.php) will fail because it only expects JWTs.
    // We should try to verify it as a Google Access Token too, similar to google-auth.php!

    // THIS IS LIKELY THE MISSING PIECE if we are storing the Google Access Token directly.
    // But wait, google-auth.php returns a backend JWT token in the 'token' field.
    // So the frontend should have a JWT.

    jsonResponse(['success' => false, 'error' => $result['error']], 401);
}

$payload = $result['payload'];

// Optionally verify user still exists and is active
try {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("SELECT id, email, student_id, full_name, role, avatar_url, password_hash FROM users WHERE id = :id AND is_active = 1");
    $stmt->execute(['id' => $payload['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        logDebug('User not found in DB', ['user_id' => $payload['user_id']]);
        jsonResponse(['success' => false, 'error' => 'User account not found or inactive'], 401);
    }

    logDebug('Token verified successfully', ['user' => $user['email']]);

    jsonResponse([
        'success' => true,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'student_id' => $user['student_id'],
            'full_name' => $user['full_name'],
            'role' => $user['role'],
            'avatar_url' => $user['avatar_url'],
            'hasPassword' => !empty($user['password_hash'])
        ]
    ]);

} catch (PDOException $e) {
    logDebug('Database error', ['message' => $e->getMessage()]);
    jsonResponse(['success' => false, 'error' => 'Database error'], 500);
}
?>