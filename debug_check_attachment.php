<?php
require_once __DIR__ . '/backend/config/database.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "\n=== DEBUG ATTACHMENT ===\n";

try {
    $pdo = getDBConnection();

    // Get the most recent announcement
    $stmt = $pdo->query("
        SELECT id, title, attachment_url, created_at 
        FROM announcements 
        ORDER BY id DESC 
        LIMIT 5
    ");
    $announcements = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($announcements as $a) {
        echo "ID: {$a['id']} | Title: {$a['title']}\n";
        echo "Attachment URL in DB: " . ($a['attachment_url'] ? $a['attachment_url'] : "NULL") . "\n";

        if ($a['attachment_url']) {
            $filePath = __DIR__ . '/' . $a['attachment_url'];
            echo "File System Check: " . $filePath . "\n";
            if (file_exists($filePath)) {
                echo "STATUS: FILE EXISTS on disk.\n";
            } else {
                echo "STATUS: FILE MISSING on disk.\n";
            }
        } else {
            echo "STATUS: No attachment record.\n";
        }
        echo "-----------------------------------\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
