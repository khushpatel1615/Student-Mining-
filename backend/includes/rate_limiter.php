<?php

/**
 * Redis-Based Rate Limiting
 * 
 * Features:
 * - Atomic operations using INCR + EXPIRE
 * - Per-user and per-IP limiting
 * - Configurable limits via environment variables
 * - Fail-open or fail-closed behavior
 */

/**
 * Check rate limit using Redis
 * 
 * @param string $identifier Unique identifier (user ID or IP)
 * @param int $maxRequests Maximum requests allowed in window
 * @param int $windowSeconds Time window in seconds
 * @param string $rateLimitType Type of rate limit (for logging)
 * @return bool True if request allowed, false if rate limited
 */
function checkRateLimit($identifier, $maxRequests, $windowSeconds, $rateLimitType = 'general')
{
    // Try to connect to Redis
    $redis = getRedisConnection();

    // If Redis is not available, apply fallback behavior
    if (!$redis) {
        $failClosed = getenv('RATE_LIMIT_FAIL_CLOSED') === 'true';
        if ($failClosed) {
            // Fail closed: Deny request if Redis is down
            logWarning('Redis unavailable - failing closed', [
                'identifier' => $identifier,
                'type' => $rateLimitType
            ]);
            return false;
        } else {
            // Fail open: Allow request if Redis is down (default)
            logWarning('Redis unavailable - failing open', [
                'identifier' => $identifier,
                'type' => $rateLimitType
            ]);
            return true;
        }
    }

    $key = "rate_limit:{$rateLimitType}:{$identifier}";

    try {
        // Atomic increment
        $current = $redis->incr($key);

        // Set expiry on first request in window
        if ($current === 1) {
            $redis->expire($key, $windowSeconds);
        }

        // Check if limit exceeded
        if ($current > $maxRequests) {
            logWarning('Rate limit exceeded', [
                'identifier' => $identifier,
                'type' => $rateLimitType,
                'current' => $current,
                'max' => $maxRequests
            ]);
            return false;
        }

        return true;
    } catch (Exception $e) {
        logError('Redis rate limit error', [
            'error' => $e->getMessage(),
            'identifier' => $identifier
        ]);

        // Apply fallback behavior on error
        $failClosed = getenv('RATE_LIMIT_FAIL_CLOSED') === 'true';
        return !$failClosed; // fail open by default
    }
}

/**
 * Get Redis connection (singleton)
 * 
 * @return Redis|null Redis instance or null if connection fails
 */
function getRedisConnection()
{
    static $redis = null;
    static $connectionFailed = false;

    // If connection previously failed, don't retry immediately
    if ($connectionFailed) {
        return null;
    }

    if ($redis === null) {
        try {
            // Check if Redis extension is available
            if (!extension_loaded('redis')) {
                logWarning('Redis extension not loaded');
                $connectionFailed = true;
                return null;
            }

            $redis = new Redis();

            // Get Redis configuration from environment
            $host = getenv('REDIS_HOST') ?: '127.0.0.1';
            $port = intval(getenv('REDIS_PORT') ?: 6379);
            $timeout = floatval(getenv('REDIS_TIMEOUT') ?: 2.0);
            $password = getenv('REDIS_PASSWORD') ?: null;

            // Connect
            $connected = $redis->connect($host, $port, $timeout);

            if (!$connected) {
                logWarning('Failed to connect to Redis', [
                    'host' => $host,
                    'port' => $port
                ]);
                $connectionFailed = true;
                return null;
            }

            // Authenticate if password is provided
            if ($password) {
                $redis->auth($password);
            }

            logInfo('Redis connection established');
        } catch (Exception $e) {
            logError('Redis connection error', ['error' => $e->getMessage()]);
            $connectionFailed = true;
            return null;
        }
    }

    return $redis;
}

/**
 * Enforce rate limit and send error response if exceeded
 * 
 * @param string $identifier Unique identifier
 * @param int|null $maxRequests Max requests (null = use env var)
 * @param int|null $windowSeconds Window size (null = use env var)
 * @param string $rateLimitType Type of rate limit
 */
function enforceRateLimit($identifier, $maxRequests = null, $windowSeconds = null, $rateLimitType = 'api')
{
    // Get limits from environment if not provided
    $maxRequests = $maxRequests ?? intval(getenv('RATE_LIMIT_MAX_REQUESTS') ?: 60);
    $windowSeconds = $windowSeconds ?? intval(getenv('RATE_LIMIT_WINDOW_SECONDS') ?: 60);

    if (!checkRateLimit($identifier, $maxRequests, $windowSeconds, $rateLimitType)) {
        http_response_code(429);
        header('Content-Type: application/json');
        header('Retry-After: ' . $windowSeconds);
        echo json_encode([
            'success' => false,
            'error' => 'Rate limit exceeded. Please try again later.',
            'retryAfter' => $windowSeconds
        ]);
        exit;
    }
}

/**
 * Get client identifier (user ID or IP)
 * 
 * @param array|null $userPayload Authenticated user payload
 * @return string Identifier for rate limiting
 */
function getRateLimitIdentifier($userPayload = null)
{
    if ($userPayload && isset($userPayload['user_id'])) {
        return 'user_' . $userPayload['user_id'];
    }

    // Fallback to IP address
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    // Check for proxy headers
    if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $forwardedIps = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $ip = trim($forwardedIps[0]);
    } elseif (isset($_SERVER['HTTP_X_REAL_IP'])) {
        $ip = $_SERVER['HTTP_X_REAL_IP'];
    }

    return 'ip_' . $ip;
}
