<?php

/**
 * Production-Grade Error Handling & Request Tracking
 * 
 * Features:
 * - Request ID generation for tracing
 * - Structured JSON logging
 * - Production-safe error messages
 * - Request timing
 */

/**
 * Generate a unique request ID
 * @return string
 */
function generateRequestId()
{
    return bin2hex(random_bytes(16));
}

/**
 * Get or create request ID for current request
 * @return string
 */
function getRequestId()
{
    static $requestId = null;
    if ($requestId === null) {
        $requestId = generateRequestId();
    }
    return $requestId;
}

/**
 * Get request start time
 * @return float
 */
function getRequestStartTime()
{
    return defined('REQUEST_START_TIME') ? REQUEST_START_TIME : $_SERVER['REQUEST_TIME_FLOAT'];
}

/**
 * Get request duration in milliseconds
 * @return float
 */
function getRequestDuration()
{
    return round((microtime(true) - getRequestStartTime()) * 1000, 2);
}

/**
 * Structured logging to JSON
 * @param string $level Log level (info, warning, error)
 * @param string $message Log message
 * @param array $context Additional context
 */
function structuredLog($level, $message, $context = [])
{
    $logDir = __DIR__ . '/../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0755, true);
    }

    $logData = [
        'timestamp' => date('Y-m-d H:i:s'),
        'requestId' => getRequestId(),
        'level' => strtoupper($level),
        'message' => $message,
        'endpoint' => $_SERVER['REQUEST_URI'] ?? 'unknown',
        'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'context' => $context
    ];

    $logFile = $logDir . '/app-' . date('Y-m-d') . '.log';
    file_put_contents($logFile, json_encode($logData) . PHP_EOL, FILE_APPEND | LOCK_EX);
}

/**
 * Log info message
 */
function logInfo($message, $context = [])
{
    structuredLog('info', $message, $context);
}

/**
 * Log warning message
 */
function logWarning($message, $context = [])
{
    structuredLog('warning', $message, $context);
}

/**
 * Log error message
 */
function logError($message, $context = [])
{
    structuredLog('error', $message, $context);
}

/**
 * Send standardized success response
 * @param mixed $data Response data
 * @param int $statusCode HTTP status code
 */
function sendResponse($data, $statusCode = 200)
{
    $response = [
        'success' => true,
        'data' => $data,
        'requestId' => getRequestId()
    ];

    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($response);

    // Log request completion
    logInfo('Request completed', [
        'statusCode' => $statusCode,
        'durationMs' => getRequestDuration()
    ]);

    exit;
}

/**
 * Send standardized error response
 * @param string $message Error message
 * @param int $statusCode HTTP status code
 * @param array $details Error details (only in dev mode)
 */
function sendError($message, $statusCode = 400, $details = [])
{
    $isProduction = getenv('APP_ENV') === 'production';

    $response = [
        'success' => false,
        'error' => $message,
        'requestId' => getRequestId()
    ];

    // Only include details in development mode
    if (!$isProduction && !empty($details)) {
        $response['details'] = $details;
    }

    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($response);

    // Log error
    logError($message, [
        'statusCode' => $statusCode,
        'durationMs' => getRequestDuration(),
        'details' => $details
    ]);

    exit;
}

/**
 * Handle uncaught exceptions
 */
function handleException($exception)
{
    $isProduction = getenv('APP_ENV') === 'production';

    // Log full exception details
    logError('Uncaught exception', [
        'exception' => get_class($exception),
        'message' => $exception->getMessage(),
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
        'trace' => $exception->getTraceAsString()
    ]);

    // Send safe error response
    $message = $isProduction ? 'An internal error occurred' : $exception->getMessage();
    $details = $isProduction ? [] : [
        'exception' => get_class($exception),
        'file' => $exception->getFile(),
        'line' => $exception->getLine()
    ];

    sendError($message, 500, $details);
}

/**
 * Handle PHP errors
 */
function handleError($errno, $errstr, $errfile, $errline)
{
    // Don't log suppressed errors
    if (!(error_reporting() & $errno)) {
        return false;
    }

    logError('PHP Error', [
        'errno' => $errno,
        'message' => $errstr,
        'file' => $errfile,
        'line' => $errline
    ]);

    return true;
}

/**
 * Handle shutdown (catches fatal errors)
 */
function handleShutdown()
{
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        logError('Fatal error', [
            'type' => $error['type'],
            'message' => $error['message'],
            'file' => $error['file'],
            'line' => $error['line']
        ]);

        if (getenv('APP_ENV') === 'production') {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'An internal error occurred',
                'requestId' => getRequestId()
            ]);
        }
    }
}

// Register error handlers
set_exception_handler('handleException');
set_error_handler('handleError');
register_shutdown_function('handleShutdown');

// Define request start time
if (!defined('REQUEST_START_TIME')) {
    define('REQUEST_START_TIME', microtime(true));
}
