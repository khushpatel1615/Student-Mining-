<?php
/**
 * Database Configuration
 * StudentDataMining - Unified Login System
 */

// Error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Load EnvLoader
require_once __DIR__ . '/EnvLoader.php';

// Global Exception Handler
set_exception_handler(function ($e) {
    if (php_sapi_name() === 'cli') {
        echo "Uncaught Exception: " . $e->getMessage() . "\n";
        exit(1);
    }
    error_log("Uncaught Exception: " . $e->getMessage());
    if (!headers_sent()) {
        header('Content-Type: application/json');
        http_response_code(500);
    }

    // Check if we can use sendError
    if (function_exists('sendError')) {
        sendError('Internal Server Error', 500);
    }

    // Fallback JSON if API helpers not loaded
    $msg = (getenv('APP_ENV') === 'dev' || getenv('APP_ENV') === 'development')
        ? $e->getMessage()
        : 'Internal Server Error';

    echo json_encode([
        'success' => false,
        'error' => $msg,
        'requestId' => defined('REQUEST_ID') ? REQUEST_ID : uniqid('err_')
    ]);
    exit;
});

// Load environment variables
EnvLoader::load(__DIR__ . '/../.env');

// Validate required environment variables
// Core required vars: DB, JWT, CORS
$requiredVars = [
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'JWT_SECRET',
    'ALLOWED_ORIGINS'
];
EnvLoader::validate($requiredVars);


// Database credentials
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'student_data_mining');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_CHARSET', 'utf8mb4');

// JWT Configuration
define('JWT_SECRET', getenv('JWT_SECRET'));
define('JWT_EXPIRY', getenv('JWT_EXPIRY') ?: 86400); // 24 hours in seconds

// Google OAuth Configuration
define('GOOGLE_CLIENT_ID', getenv('GOOGLE_CLIENT_ID'));
define('GOOGLE_CLIENT_SECRET', getenv('GOOGLE_CLIENT_SECRET'));

// CORS Configuration
$allowedOrigins = getenv('ALLOWED_ORIGINS') ? explode(',', getenv('ALLOWED_ORIGINS')) : ['http://localhost:5173', 'http://localhost:3000'];
// Trim each origin
$allowedOrigins = array_map('trim', $allowedOrigins);
// Define constant if not already defined (though usually it shouldn't be)
if (!defined('ALLOWED_ORIGINS')) {
    define('ALLOWED_ORIGINS', $allowedOrigins);
}

// Load and Validate CORS
require_once __DIR__ . '/cors.php';
handleCORS();

// Load API Helpers
require_once __DIR__ . '/../includes/api_helpers.php';


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
            PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Log full error for admin
            error_log("Database Connection Failed: " . $e->getMessage());

            // Return safe generic error to user
            if (function_exists('sendError')) {
                sendError('Database Connection Failed', 500);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Database Connection Failed']);
                exit;
            }
        }
    }

    return $pdo;
}