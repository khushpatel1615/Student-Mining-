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

    // 1. Get Allowed Origin
    $allowedOrigin = defined('ALLOWED_ORIGIN') ? ALLOWED_ORIGIN : 'http://localhost:5173';

    // 2. Handle Origin & Credentials
    $requestOrigin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';


    if ($requestOrigin && $requestOrigin === $allowedOrigin) {
        header("Access-Control-Allow-Origin: $requestOrigin");
        header("Access-Control-Allow-Credentials: true");
    } else {
        // If no Origin header (e.g. server-side/Postman) or mismatch, 
        // we can either block or just output the default allowed origin.
        // Safest for 'allow-credentials: true' is to output the specific allowed origin.
        header("Access-Control-Allow-Origin: $allowedOrigin");
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
