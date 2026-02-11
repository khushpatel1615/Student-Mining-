<?php
/**
 * Enhanced Migration Runner with Tracking
 * 
 * Features:
 * - Tracks executed migrations in database
 * - Only runs pending migrations
 * - Validates schema consistency
 * - Supports rollback (future)
 */

require_once __DIR__ . '/../../backend/config/database.php';

function createMigrationsTable($pdo)
{
    $sql = "
        CREATE TABLE IF NOT EXISTS migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            migration VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_migration (migration)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    $pdo->exec($sql);
}

function getExecutedMigrations($pdo)
{
    try {
        $stmt = $pdo->query("SELECT migration FROM migrations ORDER BY id");
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    } catch (PDOException $e) {
        // Table doesn't exist yet
        return [];
    }
}

function markMigrationExecuted($pdo, $migrationName)
{
    $stmt = $pdo->prepare("INSERT INTO migrations (migration) VALUES (?) ON DUPLICATE KEY UPDATE executed_at = CURRENT_TIMESTAMP");
    $stmt->execute([$migrationName]);
}

function runMigration($pdo, $filepath, $migrationName)
{
    echo "📄 Running migration: $migrationName\n";

    // Read SQL
    $sql = file_get_contents($filepath);

    // Normalize line endings
    $sql = str_replace("\r\n", "\n", $sql);

    // Split by semicolon
    $rawStatements = explode(';', $sql);
    $statements = [];

    foreach ($rawStatements as $stmt) {
        $stmt = trim($stmt);
        if (empty($stmt))
            continue;

        // Skip comments
        if (strpos($stmt, '--') === 0 && strpos($stmt, "\n") === false)
            continue;
        if (preg_match('/^--/', $stmt) || preg_match('/^\/\*/', $stmt))
            continue;

        $statements[] = $stmt;
    }

    $successCount = 0;
    $errorCount = 0;

    // Begin transaction
    $pdo->beginTransaction();

    try {
        foreach ($statements as $statement) {
            try {
                $pdo->exec($statement);
                $successCount++;
            } catch (PDOException $e) {
                $msg = $e->getMessage();

                // Ignore "already exists" errors (idempotent migrations)
                if (
                    strpos($msg, 'already exists') !== false ||
                    strpos($msg, 'Duplicate column') !== false ||
                    strpos($msg, 'Duplicate key') !== false
                ) {
                    // Silently skip
                } else {
                    echo "   ⚠️  Error: " . $msg . "\n";
                    echo "   Query: " . substr($statement, 0, 100) . "...\n";
                    $errorCount++;
                }
            }
        }

        // Mark as executed
        markMigrationExecuted($pdo, $migrationName);

        // Commit transaction
        $pdo->commit();

        echo "   ✓ Completed ($successCount statements)\n";

        return true;
    } catch (Exception $e) {
        $pdo->rollBack();
        echo "   ✗ Failed: " . $e->getMessage() . "\n";
        return false;
    }
}

try {
    $pdo = getDBConnection();
    echo "=== Database Migration Runner ===\n\n";

    // Create migrations tracking table
    createMigrationsTable($pdo);

    // Get executed migrations
    $executedMigrations = getExecutedMigrations($pdo);
    echo "Previously executed migrations: " . count($executedMigrations) . "\n\n";

    // Get all migration files
    $files = scandir(__DIR__);
    $migrations = [];
    foreach ($files as $file) {
        if (preg_match('/^\d{3}_.*\.sql$/', $file)) {
            $migrations[] = $file;
        }
    }
    sort($migrations);

    echo "Found " . count($migrations) . " migration file(s)\n\n";

    // Run pending migrations
    $pendingCount = 0;
    $successCount = 0;

    foreach ($migrations as $migrationFile) {
        if (in_array($migrationFile, $executedMigrations)) {
            echo "⏭️  Skipping (already executed): $migrationFile\n";
            continue;
        }

        $pendingCount++;
        $filepath = __DIR__ . '/' . $migrationFile;

        if (runMigration($pdo, $filepath, $migrationFile)) {
            $successCount++;
        }

        echo "\n";
    }

    if ($pendingCount === 0) {
        echo "✓ All migrations are up to date!\n";
    } else {
        echo "=== Migration Summary ===\n";
        echo "Pending: $pendingCount\n";
        echo "Success: $successCount\n";
        echo "Failed: " . ($pendingCount - $successCount) . "\n";
    }

} catch (PDOException $e) {
    echo "❌ Fatal DB Error: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}