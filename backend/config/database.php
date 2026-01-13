<?php
/**
 * Database Configuration
 * StudentDataMining - Unified Login System
 */

// Error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Database credentials
define('DB_HOST', 'localhost');
define('DB_NAME', 'student_data_mining');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// JWT Configuration
define('JWT_SECRET', 'student-data-mining-secret-key-2024-change-in-production');
define('JWT_EXPIRY', 86400); // 24 hours in seconds

// Google OAuth Configuration
define('GOOGLE_CLIENT_ID', '558182958130-dd2vsg1k4vrgheuua9oe1h0534586ps5.apps.googleusercontent.com');
define('GOOGLE_CLIENT_SECRET', 'YOUR_GOOGLE_CLIENT_SECRET');

// CORS Configuration
define('ALLOWED_ORIGIN', 'http://localhost:5173');

// PDO Database Connection
function getDBConnection()
{
    static $pdo = null;

    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true, // Enable buffered queries for migrations
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database connection failed']);
            exit;
        }
    }

    return $pdo;
}

// Set CORS headers - NOW HANDLED BY .htaccess
function setCORSHeaders()
{
    // Clear any output buffers
    if (ob_get_level())
        ob_clean();

    // CORS headers are now set by Apache .htaccess to prevent duplicate headers
    // Keeping only Content-Type header for JSON responses
    header('Content-Type: application/json; charset=utf-8');

    // OPTIONS requests are handled by .htaccess
}

// JSON response helper
function jsonResponse($data, $statusCode = 200)
{
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}
?>