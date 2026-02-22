<?php
// cleanup_logs.php
$logDir = __DIR__ . '/../../logs';
if (!is_dir($logDir)) {
    exit("Log directory not found.\n");
}

$files = glob($logDir . '/*.log');
$deletedCount = 0;
$cutoffTime = time() - (30 * 86400);

foreach ($files as $file) {
    if (filemtime($file) < $cutoffTime) {
        @unlink($file);
        $deletedCount++;
    }
}

echo "Log cleanup completed. Deleted $deletedCount files.\n";
