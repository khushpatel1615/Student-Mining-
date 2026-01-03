<?php
require_once __DIR__ . '/backend/config/database.php';

try {
    $pdo = getDBConnection();

    // 1. Create new table
    $sql = "CREATE TABLE IF NOT EXISTS announcement_attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        announcement_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
    )";
    $pdo->exec($sql);
    echo "Table 'announcement_attachments' created successfully.\n";

    // 2. Migrate existing data
    // Check if attachment_url exists in announcements
    $checkCol = $pdo->query("SHOW COLUMNS FROM announcements LIKE 'attachment_url'");
    if ($checkCol->rowCount() > 0) {
        $stmt = $pdo->query("SELECT id, attachment_url FROM announcements WHERE attachment_url IS NOT NULL AND attachment_url != ''");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $insertStmt = $pdo->prepare("INSERT INTO announcement_attachments (announcement_id, file_name, file_path) VALUES (?, ?, ?)");

        foreach ($rows as $row) {
            $filePath = $row['attachment_url'];
            $fileName = basename($filePath); // Extract filename from path

            // Avoid duplicates if run multiple times
            $checkDup = $pdo->prepare("SELECT id FROM announcement_attachments WHERE announcement_id = ? AND file_path = ?");
            $checkDup->execute([$row['id'], $filePath]);

            if ($checkDup->rowCount() == 0) {
                $insertStmt->execute([$row['id'], $fileName, $filePath]);
                echo "Migrated attachment for announcement ID {$row['id']}.\n";
            }
        }

        // Note: We are NOT dropping the column yet to be safe, or we can drop it.
        // Let's keep it for now as a fallback or drop it? The plan said optional.
        // Let's drop it to force usage of new table.
        // $pdo->exec("ALTER TABLE announcements DROP COLUMN attachment_url");
        // echo "Dropped 'attachment_url' column from announcements.\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
