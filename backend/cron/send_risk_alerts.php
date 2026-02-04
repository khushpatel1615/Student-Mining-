<?php
/**
 * Daily At-Risk Student Email Alert Script
 * 
 * This script sends a daily email to admins with a list of students who are at risk.
 * Can be run via CLI (Cron) or triggered via API by admin.
 * 
 * Recommended Cron Schedule: 0 8 * * * (Every day at 8:00 AM)
 * Command: php /path/to/backend/cron/send_risk_alerts.php
 */

// Determine if running via CLI or HTTP
$isCLI = (php_sapi_name() === 'cli');
$calledFromAPI = defined('CALLED_FROM_API') && CALLED_FROM_API === true;

/**
 * Create required tables for risk alert tracking.
 * Guarded to avoid redeclare when included from the API.
 */
if (!function_exists('createRiskAlertTables')) {
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
                ('include_star_students', '0')
            ");
        } catch (PDOException $e) {
            // Table might already exist
        }
    }
}

if (!$isCLI && !$calledFromAPI) {
    // If accessed via HTTP directly (not from API), ensure Admin authorization
    require_once __DIR__ . '/../includes/jwt.php';
    require_once __DIR__ . '/../config/database.php';

    $token = getTokenFromHeader();
    $validation = verifyToken($token);

    if (!$validation || !$validation['valid'] || $validation['payload']['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Admin access required']);
        exit;
    }

    header('Content-Type: application/json');
} elseif ($isCLI) {
    // CLI mode - load config directly
    require_once __DIR__ . '/../config/EnvLoader.php';
    EnvLoader::load(__DIR__ . '/../.env');

    // Database connection for CLI
    $dsn = "mysql:host=" . (getenv('DB_HOST') ?: 'localhost') . ";dbname=" . (getenv('DB_NAME') ?: 'student_data_mining') . ";charset=utf8mb4";
    try {
        $pdo = new PDO($dsn, getenv('DB_USER') ?: 'root', getenv('DB_PASS') ?: '', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } catch (PDOException $e) {
        die("Database connection failed: " . $e->getMessage() . "\n");
    }
}

// Get DB connection
if (!isset($pdo)) {
    if ($calledFromAPI && isset($GLOBALS['api_pdo'])) {
        $pdo = $GLOBALS['api_pdo'];
    } elseif (function_exists('getDBConnection')) {
        $pdo = getDBConnection();
    } else {
        die("Database connection not available\n");
    }
}

// Create tracking table if not exists
createRiskAlertTables($pdo);

// Get email configuration
$smtpConfig = getEmailConfig();

// Fetch at-risk students with their details
$atRiskStudents = getAtRiskStudents($pdo);

if (empty($atRiskStudents)) {
    $message = "No at-risk students found today.";
    if ($isCLI) {
        echo $message . "\n";
    } else {
        echo json_encode(['success' => true, 'message' => $message, 'students_count' => 0]);
    }
    exit;
}

// Get admin emails
$adminEmails = getAdminEmails($pdo);

if (empty($adminEmails)) {
    $message = "No admin emails configured.";
    if ($isCLI) {
        echo $message . "\n";
    } else {
        echo json_encode(['success' => false, 'error' => $message]);
    }
    exit;
}

// Generate email content
$emailContent = generateEmailContent($atRiskStudents);

// Send emails
$result = sendRiskAlertEmails($adminEmails, $emailContent, $smtpConfig);

// Log the alert
logRiskAlert(
    $pdo,
    count($atRiskStudents),
    count($adminEmails),
    $result['success'],
    $result['error'] ?? null
);

if ($isCLI) {
    if ($result['success']) {
        echo "Successfully sent risk alert to " . count($adminEmails) . " admin(s).\n";
        echo "At-risk students: " . count($atRiskStudents) . "\n";
    } else {
        echo "Failed to send emails: " . $result['error'] . "\n";
    }
} else {
    echo json_encode([
        'success' => $result['success'],
        'message' => $result['success'] ? 'Risk alert emails sent successfully' : $result['error'],
        'students_count' => count($atRiskStudents),
        'admins_notified' => count($adminEmails)
    ]);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create required tables for risk alert tracking
 */

/**
 * Get email configuration from environment
 */
/**
 * Get email configuration from environment
 */
function getEmailConfig()
{
    $get = function ($key) {
        $val = getenv($key);
        if ($val !== false && $val !== '')
            return $val;
        if (isset($_ENV[$key]))
            return $_ENV[$key];
        if (isset($_SERVER[$key]))
            return $_SERVER[$key];
        return '';
    };

    return [
        'smtp_host' => $get('SMTP_HOST') ?: 'smtp.gmail.com',
        'smtp_port' => $get('SMTP_PORT') ?: 587,
        'smtp_user' => $get('SMTP_USER') ?: '',
        'smtp_pass' => $get('SMTP_PASS') ?: '',
        'smtp_from' => $get('SMTP_FROM') ?: 'noreply@studentdatamining.edu',
        'smtp_from_name' => $get('SMTP_FROM_NAME') ?: 'Student Data Mining System',
        'smtp_secure' => $get('SMTP_SECURE') ?: 'tls'
    ];
}

/**
 * Get all at-risk students with their subjects
 */
function getAtRiskStudents($pdo)
{
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
    ";

    $stmt = $pdo->query($sql);
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch subjects for each at-risk student
    foreach ($students as &$student) {
        $student['risk_factors'] = json_decode($student['risk_factors'] ?? '[]', true);
        $student['subjects'] = getStudentSubjects($pdo, $student['id']);
    }

    return $students;
}

/**
 * Get subjects a student is enrolled in
 */
function getStudentSubjects($pdo, $userId)
{
    $sql = "
        SELECT 
            s.name AS subject_name,
            s.code AS subject_code,
            se.final_percentage
        FROM student_enrollments se
        JOIN subjects s ON se.subject_id = s.id
        WHERE se.user_id = ?
          AND se.status = 'active'
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$userId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Get recipient emails based on settings
 */
function getAdminEmails($pdo)
{
    // First check settings
    try {
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM risk_alert_settings WHERE setting_key IN ('email_recipients', 'custom_emails')");
        $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

        $recipientsMode = $settings['email_recipients'] ?? 'admins';

        if ($recipientsMode === 'custom' && !empty($settings['custom_emails'])) {
            $emails = explode("\n", $settings['custom_emails']);
            $recipientList = [];
            foreach ($emails as $email) {
                $email = trim($email);
                if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $recipientList[] = ['email' => $email, 'full_name' => 'Administrator'];
                }
            }
            // If we have valid custom emails, return them
            if (!empty($recipientList)) {
                return $recipientList;
            }
        }
    } catch (PDOException $e) {
        // Table might not exist yet, fallback to default
    }

    // Default: Return all admins
    $stmt = $pdo->query("SELECT email, full_name FROM users WHERE role = 'admin' AND is_active = 1");
    $recipients = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Hardcoded override: ALWAYS include this specific email
    $alwaysSendTo = [
        'email' => 'patel.khush1615.gnu@gmail.com',
        'full_name' => 'Khush Patel'
    ];

    // Check if already in list to avoid duplicates
    $emailExists = false;
    foreach ($recipients as $recipient) {
        if (strtolower($recipient['email']) === strtolower($alwaysSendTo['email'])) {
            $emailExists = true;
            break;
        }
    }

    if (!$emailExists) {
        $recipients[] = $alwaysSendTo;
    }

    return $recipients;
}

/**
 * Generate HTML email content
 */
function generateEmailContent($students)
{
    $date = date('l, F j, Y');
    $count = count($students);

    // Calculate statistics
    $totalStudents = $count;
    $avgRiskScore = $count > 0 ? array_sum(array_column($students, 'risk_score')) / $count : 0;
    $avgAttendance = $count > 0 ? array_sum(array_column($students, 'attendance_score')) / $count : 0;
    $avgGrade = $count > 0 ? array_sum(array_column($students, 'grade_avg')) / $count : 0;
    $avgRiskScoreFmt = number_format($avgRiskScore, 1);
    $avgAttendanceFmt = number_format($avgAttendance, 1);
    $avgGradeFmt = number_format($avgGrade, 1);

    $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily At-Risk Students Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .header .date {
            opacity: 0.9;
            margin-top: 8px;
            font-size: 14px;
        }
        .alert-badge {
            display: inline-block;
            background-color: rgba(255,255,255,0.2);
            padding: 8px 16px;
            border-radius: 20px;
            margin-top: 15px;
            font-size: 16px;
            font-weight: 600;
        }
        .stats-section {
            display: flex;
            flex-wrap: wrap;
            padding: 20px;
            gap: 15px;
            background-color: #fef2f2;
            border-bottom: 1px solid #fecaca;
        }
        .stat-card {
            flex: 1;
            min-width: 120px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .stat-card .value {
            font-size: 24px;
            font-weight: 700;
            color: #dc2626;
        }
        .stat-card .label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .content {
            padding: 25px;
        }
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th {
            background-color: #f9fafb;
            padding: 12px 10px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #e5e7eb;
        }
        td {
            padding: 12px 10px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
        }
        tr:hover {
            background-color: #fef2f2;
        }
        .student-name {
            font-weight: 600;
            color: #1f2937;
        }
        .student-id {
            font-size: 12px;
            color: #6b7280;
        }
        .risk-score {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 13px;
        }
        .risk-high {
            background-color: #fef2f2;
            color: #dc2626;
        }
        .risk-medium {
            background-color: #fef3c7;
            color: #d97706;
        }
        .metric {
            font-size: 13px;
        }
        .metric-low {
            color: #dc2626;
        }
        .metric-ok {
            color: #059669;
        }
        .risk-factors {
            font-size: 12px;
            color: #6b7280;
        }
        .risk-factor-tag {
            display: inline-block;
            background-color: #fee2e2;
            color: #dc2626;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            margin: 2px;
        }
        .subjects-list {
            font-size: 12px;
            color: #4b5563;
        }
        .footer {
            background-color: #f9fafb;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
        }
        .action-button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 10px;
        }
        @media (max-width: 600px) {
            .stats-section {
                flex-direction: column;
            }
            table {
                font-size: 12px;
            }
            th, td {
                padding: 8px 5px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Daily At-Risk Students Report</h1>
            <div class="date">{$date}</div>
            <div class="alert-badge">{$count} Student(s) Need Attention</div>
        </div>
        
        <div class="stats-section">
            <div class="stat-card">
                <div class="value">{$totalStudents}</div>
                <div class="label">At-Risk Students</div>
            </div>
            <div class="stat-card">
                <div class="value">{$avgRiskScoreFmt}%</div>
                <div class="label">Avg Risk Score</div>
            </div>
            <div class="stat-card">
                <div class="value">{$avgAttendanceFmt}%</div>
                <div class="label">Avg Attendance</div>
            </div>
            <div class="stat-card">
                <div class="value">{$avgGradeFmt}%</div>
                <div class="label">Avg Grade</div>
            </div>
        </div>
        
        <div class="content">
            <div class="section-title">Student Details</div>
            <table>
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Program</th>
                        <th>Semester</th>
                        <th>Risk Score</th>
                        <th>Attendance</th>
                        <th>Grade Avg</th>
                        <th>Risk Factors</th>
                    </tr>
                </thead>
                <tbody>
HTML;

    foreach ($students as $student) {
        $riskClass = $student['risk_score'] < 40 ? 'risk-high' : 'risk-medium';
        $attendanceClass = $student['attendance_score'] < 75 ? 'metric-low' : 'metric-ok';
        $gradeClass = $student['grade_avg'] < 50 ? 'metric-low' : 'metric-ok';

        $riskFactors = '';
        if (!empty($student['risk_factors'])) {
            foreach ($student['risk_factors'] as $factor) {
                $riskFactors .= '<span class="risk-factor-tag">' . htmlspecialchars($factor) . '</span>';
            }
        }

        $subjects = '';
        if (!empty($student['subjects'])) {
            $subjectNames = array_map(function ($s) {
                return $s['subject_code'];
            }, $student['subjects']);
            $subjects = implode(', ', array_slice($subjectNames, 0, 3));
            if (count($subjectNames) > 3) {
                $subjects .= ' +' . (count($subjectNames) - 3) . ' more';
            }
        }

        $html .= <<<HTML
                    <tr>
                        <td>
                            <div class="student-name">{$student['full_name']}</div>
                            <div class="student-id">{$student['student_id']}</div>
                        </td>
                        <td>
                            <div>{$student['program_code']}</div>
                            <div class="subjects-list">{$subjects}</div>
                        </td>
                        <td>Sem {$student['current_semester']}</td>
                        <td><span class="risk-score {$riskClass}">{$student['risk_score']}%</span></td>
                        <td class="metric {$attendanceClass}">{$student['attendance_score']}%</td>
                        <td class="metric {$gradeClass}">{$student['grade_avg']}%</td>
                        <td class="risk-factors">{$riskFactors}</td>
                    </tr>
HTML;
    }

    $dashboardUrl = getenv('ALLOWED_ORIGIN') ?: 'http://localhost:5173';

    $html .= <<<HTML
                </tbody>
            </table>
            
            <div style="text-align: center; margin-top: 25px;">
                <a href="{$dashboardUrl}/dashboard/risk-center" class="action-button">
                    View Full Risk Center Dashboard
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>This is an automated email from the Student Data Mining System.</p>
            <p>Sent daily at 8:00 AM. To modify notification settings, visit the Admin Dashboard.</p>
            <p>Copyright Student Data Mining System - All Rights Reserved</p>
        </div>
    </div>
</body>
</html>
HTML;

    // Plain text version
    $plainText = "Daily At-Risk Students Report - {$date}\n";
    $plainText .= str_repeat("=", 50) . "\n\n";
    $plainText .= "Total At-Risk Students: {$count}\n";
    $plainText .= "Average Risk Score: {$avgRiskScoreFmt}%\n";
    $plainText .= "Average Attendance: {$avgAttendanceFmt}%\n";
    $plainText .= "Average Grade: {$avgGradeFmt}%\n\n";
    $plainText .= str_repeat("-", 50) . "\n";
    $plainText .= "STUDENT DETAILS:\n";
    $plainText .= str_repeat("-", 50) . "\n\n";

    foreach ($students as $student) {
        $plainText .= "Name: {$student['full_name']}\n";
        $plainText .= "Student ID: {$student['student_id']}\n";
        $plainText .= "Program: {$student['program_name']} ({$student['program_code']})\n";
        $plainText .= "Semester: {$student['current_semester']}\n";
        $plainText .= "Risk Score: {$student['risk_score']}%\n";
        $plainText .= "Attendance: {$student['attendance_score']}%\n";
        $plainText .= "Grade Average: {$student['grade_avg']}%\n";
        if (!empty($student['risk_factors'])) {
            $plainText .= "Risk Factors: " . implode(', ', $student['risk_factors']) . "\n";
        }
        $plainText .= "\n" . str_repeat("-", 30) . "\n\n";
    }

    return [
        'html' => $html,
        'plain' => $plainText,
        'subject' => "At-Risk Students Alert: {$count} Students Need Attention - " . date('M j, Y')
    ];
}

/**
 * Send emails to all admins
 */
function sendRiskAlertEmails($adminEmails, $emailContent, $smtpConfig)
{
    // Check if PHPMailer is available (composer installed)
    $phpMailerPath = resolvePhpMailerAutoloadPath();
    $usePhpMailer = !empty($phpMailerPath);

    if ($usePhpMailer) {
        require_once $phpMailerPath;
        return sendWithPHPMailer($adminEmails, $emailContent, $smtpConfig);
    } else {
        // Fallback to PHP mail() function
        return sendWithNativeMail($adminEmails, $emailContent, $smtpConfig, 'PHPMailer autoload.php not found; using native mail().');
    }
}

/**
 * Send using PHPMailer (if available)
 */
function sendWithPHPMailer($adminEmails, $emailContent, $smtpConfig)
{
    try {
        // Check if PHPMailer class exists
        if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
            return sendWithNativeMail($adminEmails, $emailContent, $smtpConfig, 'PHPMailer class not found after autoload; using native mail().');
        }

        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);

        // Server settings
        $mail->isSMTP();
        $mail->Host = $smtpConfig['smtp_host'];
        $mail->SMTPAuth = true;
        $mail->Username = $smtpConfig['smtp_user'];
        $mail->Password = $smtpConfig['smtp_pass'];
        $mail->SMTPSecure = $smtpConfig['smtp_secure'];
        $mail->Port = $smtpConfig['smtp_port'];

        // Sender
        $mail->setFrom($smtpConfig['smtp_from'], $smtpConfig['smtp_from_name']);

        // Add all admin recipients
        foreach ($adminEmails as $admin) {
            $mail->addAddress($admin['email'], $admin['full_name']);
        }

        // Content
        $mail->isHTML(true);
        $mail->Subject = $emailContent['subject'];
        $mail->Body = $emailContent['html'];
        $mail->AltBody = $emailContent['plain'];

        $mail->send();
        return ['success' => true];

    } catch (\Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

/**
 * Send using native PHP mail() function
 */
function sendWithNativeMail($adminEmails, $emailContent, $smtpConfig, $contextMessage = '')
{
    $to = implode(', ', array_column($adminEmails, 'email'));
    $subject = $emailContent['subject'];

    // Headers for HTML email
    $headers = [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=UTF-8',
        'From: ' . $smtpConfig['smtp_from_name'] . ' <' . $smtpConfig['smtp_from'] . '>',
        'Reply-To: ' . $smtpConfig['smtp_from'],
        'X-Mailer: PHP/' . phpversion()
    ];

    $prevError = error_get_last();
    $prevErrorSignature = $prevError ? ($prevError['type'] . ':' . $prevError['message']) : null;

    $result = @mail($to, $subject, $emailContent['html'], implode("\r\n", $headers));

    $currentError = error_get_last();
    $currentErrorSignature = $currentError ? ($currentError['type'] . ':' . $currentError['message']) : null;
    $mailErrorMessage = null;
    if (!$result && $currentErrorSignature && $currentErrorSignature !== $prevErrorSignature) {
        $mailErrorMessage = $currentError['message'];
    }

    if ($result) {
        return ['success' => true];
    } else {
        $context = $contextMessage ? " {$contextMessage}" : '';
        $detail = $mailErrorMessage ? " PHP error: {$mailErrorMessage}" : '';
        return ['success' => false, 'error' => "PHP mail() function failed. Check server mail configuration (sendmail/SMTP).{$context}{$detail}"];
    }
}

/**
 * Resolve the absolute path to PHPMailer autoload.php if available.
 */
function resolvePhpMailerAutoloadPath()
{
    $candidates = [
        __DIR__ . '/../vendor/autoload.php',
        dirname(__DIR__, 2) . '/backend/vendor/autoload.php',
        dirname(__DIR__, 2) . '/vendor/autoload.php',
    ];

    foreach ($candidates as $candidate) {
        $resolved = realpath($candidate);
        if ($resolved && file_exists($resolved)) {
            return $resolved;
        }
    }

    return null;
}

/**
 * Log the risk alert
 */
function logRiskAlert($pdo, $studentsCount, $adminsNotified, $success, $errorMessage = null)
{
    try {
        $stmt = $pdo->prepare("
            INSERT INTO risk_alert_logs (students_count, admins_notified, success, error_message)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$studentsCount, $adminsNotified, $success ? 1 : 0, $errorMessage]);
    } catch (PDOException $e) {
        // Logging failed, but don't break the main process
    }
}
?>
