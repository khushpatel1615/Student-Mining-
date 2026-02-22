<?php
// cleanup_cache.php
$cacheDir = __DIR__ . '/../../cache';
if (!is_dir($cacheDir)) {
    exit("Cache directory not found.\n");
}

$files = glob($cacheDir . '/*.cache');
$deletedCount = 0;

foreach ($files as $file) {
    $data = json_decode(file_get_contents($file), true);
    if (!$data || time() > $data['expires_at']) {
        @unlink($file);
        $deletedCount++;
    }
}

echo "Cache cleanup completed. Removed $deletedCount expired entries.\n";
