<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain');

echo "=== DIAGNOSTIC TEST ===\n\n";

// Test 1: Load database
echo "[1] Loading database...\n";
require_once __DIR__ . '/../config/database.php';
echo "✓ Database loaded\n\n";

// Test 2: Check environment variables
echo "[2] Checking environment variables...\n";
$smtpVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'SMTP_SECURE'];
foreach ($smtpVars as $var) {
    $val = getenv($var);
    if (!$val && isset($_ENV[$var]))
        $val = $_ENV[$var];
    if (!$val && isset($_SERVER[$var]))
        $val = $_SERVER[$var];

    $display = $var === 'SMTP_PASS' ? '****' : ($val ?: 'NOT SET');
    echo "$var: $display\n";
}
echo "\n";

// Test 3: Check PHPMailer
echo "[3] Checking PHPMailer...\n";
$candidates = [
    __DIR__ . '/../vendor/autoload.php',
    dirname(__DIR__, 2) . '/backend/vendor/autoload.php',
    dirname(__DIR__, 2) . '/vendor/autoload.php',
];

foreach ($candidates as $i => $path) {
    $resolved = realpath($path);
    echo "Candidate " . ($i + 1) . ": $path\n";
    echo "  Resolved: " . ($resolved ?: 'NOT FOUND') . "\n";
    echo "  Exists: " . (file_exists($path) ? 'YES' : 'NO') . "\n";
}
echo "\n";

// Test 4: Try to load PHPMailer
echo "[4] Loading PHPMailer...\n";
$autoloadPath = __DIR__ . '/../vendor/autoload.php';
if (file_exists($autoloadPath)) {
    require_once $autoloadPath;
    echo "✓ Autoload included\n";

    if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
        echo "✓ PHPMailer class found\n";
    } else {
        echo "✗ PHPMailer class NOT found\n";
    }
} else {
    echo "✗ Autoload file not found at: $autoloadPath\n";
}
echo "\n";

// Test 5: Simulate sending
echo "[5] Test complete. If all checks passed, the email should work.\n";
?>