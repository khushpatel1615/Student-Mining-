<?php
/**
 * Logout API Endpoint
 * POST /api/logout.php
 * Handles user logout (optional token invalidation)
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

// For JWT-based auth, logout is typically handled client-side
// by removing the token. This endpoint is for future token blacklisting.

jsonResponse([
    'success' => true,
    'message' => 'Logged out successfully'
]);
?>