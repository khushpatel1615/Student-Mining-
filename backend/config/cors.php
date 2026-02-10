<?php
/**
 * CORS Configuration & Handling
 * Centralized CORS logic for the application.
 */

function handleCORS()
{
    // CLI Safety check
    if (php_sapi_name() === 'cli')
        return;

    // 1. Get Allowed Origins (array)
    $allowedOrigins = defined('ALLOWED_ORIGINS') ? ALLOWED_ORIGINS : ['http://localhost:5173'];

    // 2. Handle Origin & Credentials
    $requestOrigin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

    if ($requestOrigin && in_array($requestOrigin, $allowedOrigins)) {
        header("Access-Control-Allow-Origin: $requestOrigin");
        header("Access-Control-Allow-Credentials: true");
    } else {
        // Default to first allowed origin if no match
        $defaultOrigin = $allowedOrigins[0] ?? 'http://localhost:5173';
        header("Access-Control-Allow-Origin: $defaultOrigin");
        header("Access-Control-Allow-Credentials: true");
    }

    // 3. Common Headers
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 86400"); // Cache preflight for 24 hours

    // 4. Security Headers (Bonus hygiene)
    header("X-Content-Type-Options: nosniff");
    header("X-Frame-Options: SAMEORIGIN");
    header("X-XSS-Protection: 1; mode=block");

    // 5. Handle Preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header("HTTP/1.1 200 OK");
        // Ensure content-length is 0
        header("Content-Length: 0");
        header("Content-Type: text/plain");
        exit();
    }
}
