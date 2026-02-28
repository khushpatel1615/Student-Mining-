<?php
/**
 * CORS Configuration & Handling
 * Centralized CORS logic for the application.
 */

if (!function_exists('handleCORS')) {
    function handleCORS()
    {
        // CLI Safety check
        if (php_sapi_name() === 'cli') {
            return;
        }

        // 1. Get Allowed Origins (array)
        // Use the constant if defined in database.php, otherwise fallback to env
        if (defined('ALLOWED_ORIGINS')) {
            $allowedOrigins = ALLOWED_ORIGINS;
        } else {
            $allowedOriginsEnv = getenv('ALLOWED_ORIGINS');
            $allowedOrigins = $allowedOriginsEnv ? explode(',', $allowedOriginsEnv) : ['http://localhost:5173', 'http://localhost:3000'];
            $allowedOrigins = array_map('trim', $allowedOrigins);
        }

        // 2. Handle Origin & Credentials
        $requestOrigin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
        $originAllowed = false;

        if ($requestOrigin && in_array($requestOrigin, $allowedOrigins)) {
            header("Access-Control-Allow-Origin: $requestOrigin");
            header("Access-Control-Allow-Credentials: true");
            $originAllowed = true;
        }

        // Allow all in development if no origin specified (like direct API calls for testing)
        if (!$requestOrigin && (getenv('APP_ENV') === 'development' || getenv('APP_ENV') === 'dev')) {
            $originAllowed = true;
            // We can't set Access-Control-Allow-Origin to * with Credentials, 
            // but for direct calls it doesn't matter much browsers-wise.
        }

        // 3. Handle Preflight OPTIONS request
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            if ($originAllowed) {
                header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
                header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
                header("Access-Control-Max-Age: 86400"); // Cache preflight for 24 hours
                http_response_code(200);
                exit();
            } else {
                // If origin is not allowed, return 403 for OPTIONS
                http_response_code(403);
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
}
