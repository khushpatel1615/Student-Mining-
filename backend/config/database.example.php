<?php
/**
 * Database Configuration Template
 * StudentDataMining - Unified Login System
 * 
 * INSTRUCTIONS:
 * 1. Copy this file to 'database.php' in the same directory
 * 2. Fill in your actual credentials below
 * 3. Never commit the actual database.php file to version control
 */

// Error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Database credentials - FILL IN YOUR OWN VALUES
define('DB_HOST', 'localhost');
define('DB_NAME', 'student_data_mining');
define('DB_USER', 'your_database_username');
define('DB_PASS', 'your_database_password');
define('DB_CHARSET', 'utf8mb4');

// JWT Configuration - CHANGE THIS TO A SECURE RANDOM STRING
define('JWT_SECRET', 'generate-a-secure-random-string-here');
define('JWT_EXPIRY', 86400); // 24 hours in seconds

// Google OAuth Configuration - Get these from Google Cloud Console
// https://console.cloud.google.com/apis/credentials
define('GOOGLE_CLIENT_ID', 'your-google-client-id.apps.googleusercontent.com');
define('GOOGLE_CLIENT_SECRET', 'your-google-client-secret');

// CORS Configuration - Update for your frontend URL
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