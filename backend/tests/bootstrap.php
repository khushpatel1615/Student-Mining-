<?php
/**
 * PHPUnit Bootstrap
 * Stubs out globals and includes so helper functions
 * can be loaded in isolation without triggering HTTP output.
 */

// Prevent the endpoint from executing on include
define('PHPUNIT_RUNNING', true);

// Stub functions that grades.php calls at the global scope
// so loading the file doesn't send headers or die()
if (!function_exists('handleCORS')) {
    function handleCORS(): void
    {
    }
}
if (!function_exists('getDBConnection')) {
    function getDBConnection(): \PDO
    {
        return new \PDO('sqlite::memory:');
    }
}
if (!function_exists('requireAuth')) {
    function requireAuth(): array
    {
        return ['user_id' => 1, 'role' => 'admin'];
    }
}
if (!function_exists('requireRole')) {
    function requireRole($role): array
    {
        return ['user_id' => 1, 'role' => 'admin'];
    }
}
if (!function_exists('sendResponse')) {
    function sendResponse(array $data, int $code = 200): void
    {
    }
}
if (!function_exists('sendError')) {
    function sendError(string $msg, int $code = 400, $detail = null): void
    {
    }
}
if (!function_exists('getJsonInput')) {
    function getJsonInput(): array
    {
        return [];
    }
}
if (!function_exists('createNotification')) {
    function createNotification($pdo, $userId, $type, $title, $body, $ref = null): void
    {
    }
}

// Stub Cache class
if (!class_exists('Cache')) {
    class Cache
    {
        public static function forget(string $key): void
        {
        }
        public static function forgetPattern(string $pattern): void
        {
        }
    }
}

require_once __DIR__ . '/../vendor/autoload.php';
