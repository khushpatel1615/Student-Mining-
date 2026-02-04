<?php
require_once __DIR__ . '/config/EnvLoader.php';
EnvLoader::load(__DIR__ . '/.env');

echo "=== EMAIL DEBUGGER ===\n\n";

// 1. Check Database Logs
echo "[1] Checking Database Logs...\n";
try {
    $dsn = "mysql:host=" . (getenv('DB_HOST') ?: 'localhost') . ";dbname=" . (getenv('DB_NAME') ?: 'student_data_mining') . ";charset=utf8mb4";
    $pdo = new PDO($dsn, getenv('DB_USER') ?: 'root', getenv('DB_PASS') ?: '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->query("SELECT sent_at, success, error_message FROM risk_alert_logs ORDER BY id DESC LIMIT 3");
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($logs)) {
        echo "No logs found.\n";
    } else {
        foreach ($logs as $log) {
            $status = $log['success'] ? "SUCCESS" : "FAILED";
            echo "Date: {$log['sent_at']} | Status: {$status}\n";
            echo "Error: {$log['error_message']}\n";
            echo "----------------------------------------\n";
        }
    }
} catch (Exception $e) {
    echo "DB Error: " . $e->getMessage() . "\n";
}

echo "\n[2] Checking SMTP Configuration...\n";
$host = getenv('SMTP_HOST');
$port = getenv('SMTP_PORT');
$user = getenv('SMTP_USER');
$pass = getenv('SMTP_PASS');

echo "Host: " . ($host ?: 'NOT SET') . "\n";
echo "Port: " . ($port ?: 'NOT SET') . "\n";
echo "User: " . ($user ?: 'NOT SET') . "\n";
echo "Pass: " . ($pass ? '********' : 'NOT SET') . "\n";

echo "\n[3] Testing Connection...\n";

if (!$host || !$port) {
    echo "CRITICAL: SMTP Host or Port is missing in .env file.\n";
    exit;
}

$timeout = 10;
$socket = @fsockopen($host, $port, $errno, $errstr, $timeout);

if (!$socket) {
    echo "CONNECTION FAILED: Could not connect to $host:$port\n";
    echo "Error $errno: $errstr\n";
    echo "\nPossible causes:\n";
    echo "- Windows Firewall blocking PHP\n";
    echo "- ISP blocking port $port\n";
    echo "- Incorrect Host/Port\n";
} else {
    echo "SUCCESS: Connected to $host:$port\n";

    // Read initial greeting
    $response = fgets($socket, 515);
    echo "Server said: $response\n";

    fclose($socket);

    // Only if connection worked, let's try strict PHPMailer check if available
    $autoload = __DIR__ . '/vendor/autoload.php';
    if (file_exists($autoload)) {
        require_once $autoload;
        echo "\n[4] detailed SMTP Authentication Test (PHPMailer)...\n";

        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host = getenv('SMTP_HOST');
            $mail->SMTPAuth = true;
            $mail->Username = getenv('SMTP_USER');
            $mail->Password = getenv('SMTP_PASS');
            $mail->SMTPSecure = getenv('SMTP_SECURE');
            $mail->Port = getenv('SMTP_PORT');
            $mail->Timeout = 10;

            // Enable verbose debug output
            $mail->SMTPDebug = 2;
            $mail->Debugoutput = function ($str, $level) {
                echo "debug: $str";
            };

            echo "Attempting to verify connection/auth only...\n";
            if ($mail->smtpConnect()) {
                echo "\nSUCCESS: SMTP Authentication accepted! configuration is VALID.\n";
                $mail->smtpClose();
            } else {
                echo "\nFAILED: SMTP Connection failed.\n";
            }
        } catch (Exception $e) {
            echo "\nERROR: " . $e->getMessage() . "\n";
        }
    } else {
        echo "\n[Info] PHPMailer not installed. Using native mail().\n";
        echo "Note: Native mail() on Windows requires sendmail.ini configuration in XAMPP.\n";
    }
}
?>