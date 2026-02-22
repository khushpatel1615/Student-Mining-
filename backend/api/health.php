<?php
/**
 * Health Check Endpoint
 * Non-authenticated endpoint to verify backend is reachable, plus detailed admin stats
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$action = $_GET['action'] ?? null;
if ($method === 'DELETE' && $action === 'clear_cache') {
    $user = requireRole('admin');

    $files = glob(__DIR__ . '/../../cache/*.cache');
    $count = 0;
    if ($files) {
        foreach ($files as $file) {
            @unlink($file);
            $count++;
        }
    }
    echo json_encode(['success' => true, 'message' => "Cleared $count cache files."]);
    exit;
}

if ($method === 'GET') {
    $detailed = $_GET['detailed'] ?? null;

    if ($detailed) {
        $user = requireRole('admin');

        $status = 'ok';
        $pdo = null;
        $dbStatus = 'offline';
        $dbResponseMs = 0;

        $start = microtime(true);
        try {
            $pdo = getDBConnection();
            $pdo->query("SELECT 1");
            $dbResponseMs = round((microtime(true) - $start) * 1000, 2);
            $dbStatus = 'ok';
        } catch (Exception $e) {
            $status = 'critical';
        }

        $logDir = __DIR__ . '/../../logs';
        $cacheDir = __DIR__ . '/../../cache';

        $uptimeCheck = [
            'database' => ['status' => $dbStatus, 'response_ms' => $dbResponseMs],
            'log_dir_writable' => is_writable($logDir),
            'cache_dir_writable' => is_writable($cacheDir),
            'env_loaded' => getenv('APP_ENV') !== false
        ];

        $errorsToday = Logger::getRecentErrors(50);
        $errorsTodayCount = 0;
        $todayDate = date('Y-m-d');
        foreach ($errorsToday as $err) {
            if (strpos($err['timestamp'], $todayDate) === 0) {
                $errorsTodayCount++;
            }
        }

        if ($errorsTodayCount > 20 || $dbStatus !== 'ok') {
            $status = 'critical';
        }

        try {
            $totalStudents = $pdo->query("SELECT COUNT(*) FROM users WHERE role='student'")->fetchColumn();
            $totalEnrollments = $pdo->query("SELECT COUNT(*) FROM student_enrollments")->fetchColumn();
            $totalGradesEntered = $pdo->query("SELECT COUNT(*) FROM student_grades WHERE marks_obtained IS NOT NULL")->fetchColumn();
            $finalizedSubjects = $pdo->query("SELECT COUNT(*) FROM student_enrollments WHERE is_finalized=1")->fetchColumn();
            $atRiskStudents = $pdo->query("SELECT COUNT(*) FROM student_risk_scores WHERE risk_level='at_risk' OR risk_level='Warning'")->fetchColumn();

            $emailPending = $pdo->query("SELECT COUNT(*) FROM email_queue WHERE status='pending'")->fetchColumn();
            $emailSentToday = $pdo->query("SELECT COUNT(*) FROM email_queue WHERE status='sent' AND DATE(sent_at) = CURDATE()")->fetchColumn();
            $emailFailed = $pdo->query("SELECT COUNT(*) FROM email_queue WHERE status='failed'")->fetchColumn();
            $oldestPendingMinutes = (int) $pdo->query("SELECT TIMESTAMPDIFF(MINUTE, MIN(created_at), NOW()) FROM email_queue WHERE status='pending'")->fetchColumn();

            $jobsPending = $pdo->query("SELECT COUNT(*) FROM grade_import_jobs WHERE status='pending'")->fetchColumn();
            $jobsAppliedToday = $pdo->query("SELECT COUNT(*) FROM grade_import_jobs WHERE status='completed' AND DATE(completed_at) = CURDATE()")->fetchColumn();
            $jobsFailed = $pdo->query("SELECT COUNT(*) FROM grade_import_jobs WHERE status='failed'")->fetchColumn();
        } catch (Exception $e) {
            if ($status !== 'critical') {
                $status = 'critical';
            }
        }

        $slowRequests = Logger::getSlowRequests(20);

        if ($status !== 'critical') {
            if (($emailFailed ?? 0) > 5 || count($slowRequests) > 10 || $errorsTodayCount > 5) {
                $status = 'degraded';
            }
        }

        echo json_encode([
            'status' => $status,
            'timestamp' => date('c'),
            'uptime_check' => $uptimeCheck,
            'performance' => [
                'slow_requests_today' => $slowRequests,
                'avg_response_ms' => $dbResponseMs,
                'peak_memory_mb' => round(memory_get_peak_usage(true) / 1048576, 2)
            ],
            'errors' => [
                'errors_today' => $errorsTodayCount,
                'recent_errors' => array_slice($errorsToday, 0, 10)
            ],
            'email_queue' => [
                'pending' => $emailPending ?? 0,
                'sent_today' => $emailSentToday ?? 0,
                'failed' => $emailFailed ?? 0,
                'oldest_pending_minutes' => $oldestPendingMinutes ?? 0
            ],
            'grade_imports' => [
                'pending_jobs' => $jobsPending ?? 0,
                'applied_today' => $jobsAppliedToday ?? 0,
                'failed_jobs' => $jobsFailed ?? 0
            ],
            'cache' => Cache::stats(),
            'database_stats' => [
                'total_students' => $totalStudents ?? 0,
                'total_enrollments' => $totalEnrollments ?? 0,
                'total_grades_entered' => $totalGradesEntered ?? 0,
                'finalized_subjects' => $finalizedSubjects ?? 0,
                'at_risk_students' => $atRiskStudents ?? 0
            ]
        ], JSON_PRETTY_PRINT);
        exit;
    }

    $response = [
        'status' => 'ok',
        'timestamp' => date('c'),
        'version' => '1.0.0',
        'php_version' => phpversion(),
        'database' => 'disconnected'
    ];

    try {
        $pdo = getDBConnection();
        $stmt = $pdo->query("SELECT 1");
        if ($stmt) {
            $response['database'] = 'connected';
            $stmt = $pdo->query("SHOW TABLES");
            $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
            $response['tables_count'] = count($tables);
        }
    } catch (Exception $e) {
        $response['database'] = 'error';
        $response['error'] = $e->getMessage();
    }

    echo json_encode($response, JSON_PRETTY_PRINT);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
