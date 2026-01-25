<?php
/**
 * Migration Runner v2
 * Executes all pending database migrations in alphanumeric order
 */

require_once __DIR__ . '/../../backend/config/database.php';

try {
    $pdo = getDBConnection();
    echo "=== Student Data Mining - Database Migration Runner ===\n\n";

    // 1. Get List of Migrations Dynamically
    $files = scandir(__DIR__);
    $migrations = [];
    foreach ($files as $file) {
        if (preg_match('/^\d{3}_.*\.sql$/', $file)) {
            $migrations[] = $file;
        }
    }
    sort($migrations); // Ensure 001, 002, 003 order

    // 2. Run Each Migration
    foreach ($migrations as $migrationFile) {
        $filepath = __DIR__ . '/' . $migrationFile;
        echo "📄 Checking migration: $migrationFile\n";

        // Read SQL
        $sql = file_get_contents($filepath);

        // Split by semicolon, handling simple cases
        // A robust parser would be better, but for this project's scope, a simple split + regex filter works
        // We prevent splitting inside comments or quoted strings if we really wanted to be fancy, 
        // but let's stick to the previous simple logic which worked fairly well for basic SQL.

        // Normalize line endings
        $sql = str_replace("\r\n", "\n", $sql);

        $rawStatements = explode(';', $sql);
        $statements = [];

        foreach ($rawStatements as $stmt) {
            $stmt = trim($stmt);
            if (empty($stmt))
                continue;
            // potential simple comment skipping
            if (strpos($stmt, '--') === 0 && strpos($stmt, "\n") === false)
                continue;

            $statements[] = $stmt;
        }

        $successCount = 0;
        $failCount = 0;

        foreach ($statements as $statement) {
            try {
                // Skip comment-only chunks that might have survived
                if (preg_match('/^--/', $statement) || preg_match('/^\/\*/', $statement))
                    continue;

                $pdo->exec($statement);
                $successCount++;
            } catch (PDOException $e) {
                // Ignore "exists" errors or "duplicate column" which happen on re-runs
                $msg = $e->getMessage();
                if (
                    strpos($msg, 'already exists') !== false ||
                    strpos($msg, 'Duplicate column') !== false ||
                    strpos($msg, 'Duplicate key') !== false
                ) {
                    // echo "   ℹ️  Skipped (Already exists)\n";
                } else {
                    echo "   ⚠️  Error in $migrationFile: " . $msg . "\n";
                    echo "   Query: " . substr($statement, 0, 50) . "...\n";
                    $failCount++;
                }
            }
        }

        echo "   -> Processed (Success: $successCount)\n";
    }

    echo "\n=== Migration Process Complete ===\n";

} catch (PDOException $e) {
    echo "❌ Fatal DB Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>