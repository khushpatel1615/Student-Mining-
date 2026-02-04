<?php

/**
 * Risk Alert Management API
 *
 * Endpoints:
 * GET  ?action=settings       - Get current notification settings
 * PUT  ?action=settings       - Update notification settings
 * GET  ?action=history        - Get alert history/logs
 * POST ?action=send           - Manually trigger a risk alert email
 * GET  ?action=preview        - Preview the email content without sending
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';
setCORSHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

// Helper: Ensure required tables exist before handling requests
function createRiskAlertTables($pdo)
{
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS risk_alert_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                students_count INT NOT NULL,
                admins_notified INT NOT NULL,
                success BOOLEAN DEFAULT TRUE,
                error_message TEXT,
                INDEX idx_sent_at (sent_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS risk_alert_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(50) UNIQUE NOT NULL,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        // Insert default settings if not exists
        $pdo->exec("
            INSERT IGNORE INTO risk_alert_settings (setting_key, setting_value) VALUES
            ('enabled', '1'),
            ('min_risk_score_threshold', '50'),
            ('send_time', '08:00'),
            ('include_star_students', '0'),
            ('email_recipients', 'admins'),
            ('custom_emails', '')
        ");
    } catch (PDOException $e) {
        // Tables might already exist
    }
}
// Handle preflight
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Create tables if not exists
createRiskAlertTables($pdo);
try {
    // Verify admin access
    $token = getTokenFromHeader();
    $validation = verifyToken($token);
    if (!$validation || !$validation['valid']) {
        throw new Exception("Unauthorized");
    }

    $authUser = $validation['payload'];
    if ($authUser['role'] !== 'admin') {
        throw new Exception("Admin access required");
    }

    $action = $_GET['action'] ?? 'settings';
    switch ($action) {
        case 'settings':
            handleSettings($pdo, $method);

            break;
        case 'history':
            handleHistory($pdo);

            break;
        case 'send':
            handleManualSend($pdo);

            break;
        case 'preview':
            handlePreview($pdo);

            break;
        case 'stats':
            handleStats($pdo);

            break;
        default:
            throw new Exception("Unknown action: $action");
    }
} catch (Throwable $e) {
    file_put_contents(__DIR__ . '/debug_error.log', date('Y-m-d H:i:s') . " ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

// ============================================================================
// HANDLER FUNCTIONS
// ============================================================================

function handleSettings($pdo, $method)
{
    if ($method === 'GET') {
// Get current settings
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM risk_alert_settings");
        $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        echo json_encode([
            'success' => true,
            'data' => [
                'enabled' => (bool) ($rows['enabled'] ?? true),
                'min_risk_score_threshold' => (int) ($rows['min_risk_score_threshold'] ?? 50),
                'send_time' => $rows['send_time'] ?? '08:00',
                'include_star_students' => (bool) ($rows['include_star_students'] ?? false),
                'email_recipients' => $rows['email_recipients'] ?? 'admins',
                'custom_emails' => $rows['custom_emails'] ?? ''
            ]
        ]);
    } elseif ($method === 'PUT' || $method === 'POST') {
    // Update settings (accept POST for hosts that don't pass PUT through to PHP)
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        if (!is_array($data) || empty($data)) {
            if (!empty($_POST)) {
                $data = $_POST;
            }
        }
        if (!is_array($data) || empty($data)) {
            throw new Exception("No settings data provided");
        }
        $settings = [
            'enabled' => isset($data['enabled']) ? ($data['enabled'] ? '1' : '0') : '1',
            'min_risk_score_threshold' => (string) ($data['min_risk_score_threshold'] ?? 50),
            'send_time' => $data['send_time'] ?? '08:00',
            'include_star_students' => isset($data['include_star_students']) ? ($data['include_star_students'] ? '1' : '0') : '0',
            'email_recipients' => $data['email_recipients'] ?? 'admins',
            'custom_emails' => $data['custom_emails'] ?? ''
        ];
        $stmt = $pdo->prepare("
            INSERT INTO risk_alert_settings (setting_key, setting_value)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
        ");
        foreach ($settings as $key => $value) {
            $stmt->execute([$key, $value]);
        }

        $schedulerResult = updateWindowsTaskScheduler($settings['send_time']);
        $response = ['success' => true, 'message' => 'Settings updated successfully'];
        if ($schedulerResult && !$schedulerResult['success']) {
            $response['scheduler_warning'] = $schedulerResult['error'];
        }
        echo json_encode($response);
    } else {
        throw new Exception("Method not allowed");
    }
}

function handleHistory($pdo)
{
    $limit = (int) ($_GET['limit'] ?? 30);
    $offset = (int) ($_GET['offset'] ?? 0);
    $stmt = $pdo->prepare("
        SELECT * FROM risk_alert_logs 
        ORDER BY sent_at DESC 
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([$limit, $offset]);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    // Get total count
    $countStmt = $pdo->query("SELECT COUNT(*) FROM risk_alert_logs");
    $total = $countStmt->fetchColumn();
    echo json_encode([
        'success' => true,
        'data' => $logs,
        'total' => (int) $total,
        'limit' => $limit,
        'offset' => $offset
    ]);
}

function handleManualSend($pdo)
{
    // Set flag to indicate we're calling from API (skip duplicate auth in send_risk_alerts.php)
    define('CALLED_FROM_API', true);

    // Make $pdo available globally for the included script
    global $GLOBALS;
    $GLOBALS['api_pdo'] = $pdo;

    // Include the cron script functions
    require_once __DIR__ . '/../cron/send_risk_alerts.php';
    // The script will output JSON response
}

function handlePreview($pdo)
{
    // Get at-risk students data
    $sql = "
        SELECT 
            u.id,
            u.full_name,
            u.student_id,
            u.email,
            p.name AS program_name,
            p.code AS program_code,
            u.current_semester,
            srs.risk_score,
            srs.risk_level,
            srs.attendance_score,
            srs.grade_avg,
            srs.engagement_score,
            srs.risk_factors,
            srs.updated_at AS risk_updated_at
        FROM users u
        LEFT JOIN programs p ON u.program_id = p.id
        JOIN student_risk_scores srs ON u.id = srs.user_id
        WHERE u.role = 'student'
          AND srs.risk_level = 'At Risk'
        ORDER BY srs.risk_score ASC
        LIMIT 10
    ";
    $stmt = $pdo->query($sql);
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($students as &$student) {
        $student['risk_factors'] = json_decode($student['risk_factors'] ?? '[]', true);
        // Get subjects
        $subStmt = $pdo->prepare("
            SELECT s.name, s.code, se.final_percentage
            FROM student_enrollments se
            JOIN subjects s ON se.subject_id = s.id
            WHERE se.user_id = ? AND se.status = 'active'
        ");
        $subStmt->execute([$student['id']]);
        $student['subjects'] = $subStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'students' => $students,
            'count' => count($students),
            'preview_note' => 'This is a preview of the data that would be included in the email.'
        ]
    ]);
}

function handleStats($pdo)
{
    // Get statistics about risk alerts
    $stats = [];
    // Last 7 days of alerts
    $stmt = $pdo->query("
        SELECT 
            DATE(sent_at) as date,
            SUM(students_count) as students,
            COUNT(*) as alerts_sent
        FROM risk_alert_logs
        WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(sent_at)
        ORDER BY date ASC
    ");
    $stats['weekly_trend'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    // Total alerts sent
    $stmt = $pdo->query("SELECT COUNT(*) FROM risk_alert_logs WHERE success = 1");
    $stats['total_alerts_sent'] = (int) $stmt->fetchColumn();
    // Current at-risk count
    $stmt = $pdo->query("SELECT COUNT(*) FROM student_risk_scores WHERE risk_level = 'At Risk'");
    $stats['current_at_risk_count'] = (int) $stmt->fetchColumn();
    // Last alert timestamp
    $stmt = $pdo->query("SELECT MAX(sent_at) FROM risk_alert_logs WHERE success = 1");
    $stats['last_alert_sent'] = $stmt->fetchColumn();
    echo json_encode(['success' => true, 'data' => $stats]);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function updateWindowsTaskScheduler($sendTime)
{
    if (PHP_OS_FAMILY !== 'Windows') {
        return ['success' => true, 'skipped' => true, 'reason' => 'Non-Windows host'];
    }

    $disabled = array_map('trim', explode(',', ini_get('disable_functions') ?: ''));
    if (!function_exists('exec') || in_array('exec', $disabled, true)) {
        return ['success' => false, 'error' => 'PHP exec() is disabled; cannot update Windows Task Scheduler'];
    }

    if (!preg_match('/^\\d{2}:\\d{2}$/', $sendTime)) {
        return ['success' => false, 'error' => 'Invalid send_time format. Expected HH:MM.'];
    }

    $taskName = getenv('RISK_ALERT_TASK_NAME') ?: 'StudentDataMining Risk Alerts';
    $phpPath = getenv('PHP_PATH') ?: 'e:\\XAMP\\php\\php.exe';
    $scriptPath = realpath(__DIR__ . '/../cron/send_risk_alerts.php');
    if (!$scriptPath) {
        return ['success' => false, 'error' => 'Risk alert script path not found'];
    }

    if (preg_match('/\\s/', $phpPath) || preg_match('/\\s/', $scriptPath)) {
        return ['success' => false, 'error' => 'PHP_PATH or script path contains spaces; set PHP_PATH to a no-space path.'];
    }

    $taskNameArg = '"' . str_replace('"', '""', $taskName) . '"';
    $taskCmd = $phpPath . ' ' . $scriptPath;
    $createCmd = "cmd /c schtasks /Create /F /SC DAILY /TN {$taskNameArg} /TR \"{$taskCmd}\" /ST {$sendTime}";
    $output = [];
    $exitCode = 0;
    @exec($createCmd . ' 2>&1', $output, $exitCode);

    if ($exitCode !== 0) {
        return [
            'success' => false,
            'error' => 'Failed to update Windows Task Scheduler: ' . implode(' | ', $output)
        ];
    }

    return ['success' => true];
}
