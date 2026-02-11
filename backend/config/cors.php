<?php
/**
 * CORS Configuration & Handling
 * Centralized CORS logic for the application.
 */

function handleCORS()
{
    // CLI Safety check
    if (php_sapi_name() === 'cli') {
        return;
    }

    // 1. Get Allowed Origins (array)
    // ALLOWED_ORIGINS should be set in .env (e.g. http://localhost:5173,https://myapp.com)
    $allowedOriginsEnv = getenv('ALLOWED_ORIGINS');
    $allowedOrigins = $allowedOriginsEnv ? explode(',', $allowedOriginsEnv) : [];

    // Trim whitespace from origins
    $allowedOrigins = array_map('trim', $allowedOrigins);

    // 2. Handle Origin & Credentials
    $requestOrigin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    $originAllowed = false;

    if ($requestOrigin && in_array($requestOrigin, $allowedOrigins)) {
        header("Access-Control-Allow-Origin: $requestOrigin");
        header("Access-Control-Allow-Credentials: true");
        $originAllowed = true;
    }

    // 3. Handle Preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        if ($originAllowed) {
            header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
            header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
            header("Access-Control-Max-Age: 86400"); // Cache preflight for 24 hours
            header("HTTP/1.1 200 OK");
            header("Content-Length: 0");
            header("Content-Type: text/plain");
            exit();
        } else {
            // If origin is not allowed, return 403 for OPTIONS
            header("HTTP/1.1 403 Forbidden");
            exit();
        }
    }

    // 4. Security Headers (Bonus hygiene)
    header("X-Content-Type-Options: nosniff");
    header("X-Frame-Options: SAMEORIGIN");
    header("X-XSS-Protection: 1; mode=block");

    // Note: We do NOT set Access-Control-Allow-Origin if the origin is not allowed.
    // This effectively blocks the request in the browser.
}
