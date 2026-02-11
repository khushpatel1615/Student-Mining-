<?php

/**
 * JWT Helper Functions
 * Simple JWT implementation without external dependencies
 */

require_once __DIR__ . '/../config/database.php';
/**
 * Base64 URL encode (JWT compatible)
 */
function base64UrlEncode($data)
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Base64 URL decode (JWT compatible)
 */
function base64UrlDecode($data)
{
    return base64_decode(strtr($data, '-_', '+/'));
}

/**
 * Generate JWT token
 */
function generateToken($userId, $email, $role, $fullName)
{
    $header = json_encode([
        'typ' => 'JWT',
        'alg' => 'HS256'
    ]);
    $payload = json_encode([
        'iss' => 'StudentDataMining',
        'iat' => time(),
        'exp' => time() + JWT_EXPIRY,
        'user_id' => $userId,
        'email' => $email,
        'role' => $role,
        'full_name' => $fullName
    ]);
    $base64Header = base64UrlEncode($header);
    $base64Payload = base64UrlEncode($payload);
    $signature = hash_hmac('sha256', $base64Header . '.' . $base64Payload, JWT_SECRET, true);
    $base64Signature = base64UrlEncode($signature);
    return $base64Header . '.' . $base64Payload . '.' . $base64Signature;
}

/**
 * Verify and decode JWT token
 */
function verifyToken($token)
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return ['valid' => false, 'error' => 'Invalid token format'];
    }

    list($base64Header, $base64Payload, $base64Signature) = $parts;
    // Verify signature
    $signature = hash_hmac('sha256', $base64Header . '.' . $base64Payload, JWT_SECRET, true);
    $expectedSignature = base64UrlEncode($signature);
    if (!hash_equals($expectedSignature, $base64Signature)) {
        return ['valid' => false, 'error' => 'Invalid signature'];
    }

    // Decode payload
    $payload = json_decode(base64UrlDecode($base64Payload), true);
    if (!$payload) {
        return ['valid' => false, 'error' => 'Invalid payload'];
    }

    // Check expiration
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return ['valid' => false, 'error' => 'Token expired'];
    }

    return ['valid' => true, 'payload' => $payload];
}

/**
 * Get token from Authorization header
 */

function getTokenFromHeader()
{
    $headers = null;
    $authHeader = null;
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;
    }

    if (!$authHeader) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
    }

    if ($authHeader && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return $matches[1];
    }

    return null;
}

/**
 * Send JSON Response and exit
 * @param array $data Response data
 * @param int $statusCode HTTP status code
 */
// jsonResponse is provided by api_helpers.php


/**
 * Get token from request (header only by default)
 * Query string tokens are restricted for security
 * @param bool $allowQueryString Allow token from query string (only for specific endpoints like SSE)
 */
function getTokenFromRequest($allowQueryString = false)
{
    $token = getTokenFromHeader();
    if ($token) {
        return $token;
    }

    // Only allow query string tokens if explicitly permitted (e.g., for SSE where headers can't be set)
    if ($allowQueryString) {
        $queryToken = $_GET['token'] ?? $_GET['auth_token'] ?? null;
        if ($queryToken) {
            error_log('WARNING: Token passed via query string from IP: ' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
            return $queryToken;
        }
    }

    return null;
}

/**
 * Middleware: Require authentication
 * @param bool $allowQueryString Allow token from query string (default: false)
 */
function requireAuth($allowQueryString = false)
{
    $token = getTokenFromRequest($allowQueryString);
    if (!$token) {
        jsonResponse([
            'success' => false,
            'error' => 'No token provided'
        ], 401);
    }

    $result = verifyToken($token);
    if (!$result['valid']) {
        jsonResponse([
            'success' => false,
            'error' => $result['error']
        ], 401);
    }

    return $result['payload'];
}

/**
 * Middleware: Require specific role(s)
 * @param string|array $requiredRoles Single role or array of accepted roles
 * @param bool $allowQueryString Allow token from query string (default: false)
 */
function requireRole($requiredRoles, $allowQueryString = false)
{
    $payload = requireAuth($allowQueryString);
    $allowedRoles = is_array($requiredRoles) ? $requiredRoles : [$requiredRoles];

    if (!in_array($payload['role'], $allowedRoles)) {
        jsonResponse([
            'success' => false,
            'error' => 'Insufficient permissions'
        ], 403);
    }

    return $payload;
}

/**
 * Get authenticated user payload (non-blocking, returns null if not authenticated)
 * @param bool $allowQueryString Allow token from query string (default: false)
 */
function getAuthUser($allowQueryString = false)
{
    $token = getTokenFromRequest($allowQueryString);
    if (!$token) {
        return null;
    }

    $result = verifyToken($token);
    if (!$result['valid']) {
        return null;
    }

    return $result['payload'];
}
