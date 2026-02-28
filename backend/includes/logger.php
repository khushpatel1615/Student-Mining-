<?php
if (!class_exists('Logger')) {
    class Logger
    {
        // Log levels matching PSR-3 standard
        const DEBUG = 'DEBUG';
        const INFO = 'INFO';
        const WARN = 'WARN';
        const ERROR = 'ERROR';
        const FATAL = 'FATAL';

        private static string $logDir = __DIR__ . '/../../logs';
        private static string $appEnv = 'production';

        public static function init(string $env = 'production'): void
        {
            self::$appEnv = $env;
            if (!is_dir(self::$logDir)) {
                mkdir(self::$logDir, 0755, true);
            }
        }

        public static function log(
            string $level,
            string $message,
            array $context = [],
            ?string $endpoint = null
        ): void {
            $entry = json_encode([
                'timestamp' => date('c'),
                'level' => $level,
                'message' => $message,
                'endpoint' => $endpoint ?? ($_SERVER['REQUEST_URI'] ?? 'cli'),
                'method' => $_SERVER['REQUEST_METHOD'] ?? 'CLI',
                'request_id' => defined('REQUEST_ID') ? REQUEST_ID : 'N/A',
                'user_id' => defined('CURRENT_USER_ID') ? CURRENT_USER_ID : null,
                'context' => $context,
                'memory_mb' => round(memory_get_peak_usage(true) / 1048576, 2),
            ]);

            // Write to daily rotating log file
            $file = self::$logDir . '/app-' . date('Y-m-d') . '.log';
            file_put_contents($file, $entry . PHP_EOL, FILE_APPEND | LOCK_EX);

            // Always mirror to PHP error_log for existing XAMPP log capture
            error_log("[{$level}] {$message}");

            // Write critical errors to a separate dedicated error log
            if (in_array($level, [self::ERROR, self::FATAL])) {
                $errFile = self::$logDir . '/errors-' . date('Y-m-d') . '.log';
                file_put_contents($errFile, $entry . PHP_EOL, FILE_APPEND | LOCK_EX);
            }
        }

        // Convenience methods
        public static function debug(string $msg, array $ctx = []): void
        {
            if (self::$appEnv === 'dev' || self::$appEnv === 'development') {
                self::log(self::DEBUG, $msg, $ctx);
            }
        }
        public static function info(string $msg, array $ctx = []): void
        {
            self::log(self::INFO, $msg, $ctx);
        }
        public static function warn(string $msg, array $ctx = []): void
        {
            self::log(self::WARN, $msg, $ctx);
        }
        public static function error(string $msg, array $ctx = []): void
        {
            self::log(self::ERROR, $msg, $ctx);
        }
        public static function fatal(string $msg, array $ctx = []): void
        {
            self::log(self::FATAL, $msg, $ctx);
        }

        // API request timing tracker
        public static function logRequest(
            float $startTime,
            int $statusCode,
            string $endpoint
        ): void {
            $duration = round((microtime(true) - $startTime) * 1000, 2);
            self::log(self::INFO, 'API Request Completed', [
                'duration_ms' => $duration,
                'status_code' => $statusCode,
                'slow' => $duration > 1000,
            ], $endpoint);

            // Log slow queries separately for performance tracking
            if ($duration > 1000) {
                $slowFile = self::$logDir . '/slow-requests-' . date('Y-m-d') . '.log';
                file_put_contents($slowFile, json_encode([
                    'timestamp' => date('c'),
                    'endpoint' => $endpoint,
                    'duration_ms' => $duration,
                    'method' => $_SERVER['REQUEST_METHOD'] ?? 'CLI',
                ]) . PHP_EOL, FILE_APPEND | LOCK_EX);
            }
        }

        // Read recent log entries for the Health Dashboard
        public static function getRecentErrors(int $limit = 50): array
        {
            $file = self::$logDir . '/errors-' . date('Y-m-d') . '.log';
            if (!file_exists($file))
                return [];

            $lines = array_filter(
                array_slice(file($file), -$limit)
            );
            return array_map(
                fn($l) => json_decode(trim($l), true),
                array_values($lines)
            );
        }

        public static function getSlowRequests(int $limit = 20): array
        {
            $file = self::$logDir . '/slow-requests-' . date('Y-m-d') . '.log';
            if (!file_exists($file))
                return [];

            $lines = array_filter(
                array_slice(file($file), -$limit)
            );
            return array_map(
                fn($l) => json_decode(trim($l), true),
                array_values($lines)
            );
        }
    }
}
