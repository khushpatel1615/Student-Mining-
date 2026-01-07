<?php
/**
 * Migration Runner
 * Executes all pending database migrations
 */

require_once __DIR__ . '/../config/database.php';

try {
    // Create a fresh PDO connection specifically for migrations with buffered queries
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
    ];

    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);

    echo "=== Student Data Mining - Database Migration Runner ===\n\n";

    // Migration files in order
    $migrations = [
        '001_remove_teacher_role.sql',
        '002_enhanced_analytics_schema.sql'
    ];

    $migrationsDir = __DIR__ . '/../../database/migrations/';

    foreach ($migrations as $migrationFile) {
        $filepath = $migrationsDir . $migrationFile;

        if (!file_exists($filepath)) {
            echo "⚠️  Migration file not found: $migrationFile\n";
            continue;
        }

        echo "📄 Running migration: $migrationFile\n";

        // Read SQL file
        $sql = file_get_contents($filepath);

        // Split by semicolons to execute multiple statements
        $statements = array_filter(
            array_map('trim', explode(';', $sql)),
            function ($stmt) {
                return !empty($stmt) &&
                    !preg_match('/^--/', $stmt) &&
                    !preg_match('/^\/\*/', $stmt);
            }
        );

        $successCount = 0;
        $failCount = 0;

        foreach ($statements as $statement) {
            if (empty(trim($statement)))
                continue;

            try {
                $stmt = $pdo->prepare($statement);
                $stmt->execute();
                $stmt->closeCursor(); // Important: close cursor after each statement
                $successCount++;
            } catch (PDOException $e) {
                // Some errors are acceptable (like table already exists)
                if (
                    strpos($e->getMessage(), 'already exists') === false &&
                    strpos($e->getMessage(), 'Duplicate') === false &&
                    strpos($e->getMessage(), 'Unknown column') === false
                ) {
                    echo "   ⚠️  Error: " . $e->getMessage() . "\n";
                    $failCount++;
                }
            }
        }

        echo "   ✅ Executed $successCount statements";
        if ($failCount > 0) {
            echo " ($failCount warnings)";
        }
        echo "\n\n";
    }

    echo "=== Migration Complete! ===\n\n";

    // Show current database status
    echo "📊 Database Status:\n";

    $stmt = $pdo->query("SELECT role, COUNT(*) as count FROM users GROUP BY role");
    $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $stmt->closeCursor(); // Close cursor before next query

    echo "   Users by role:\n";
    foreach ($roles as $role) {
        echo "   - {$role['role']}: {$role['count']}\n";
    }

    echo "\n   Tables created:\n";
    $tables = [
        'student_analytics',
        'program_analytics',
        'subject_analytics',
        'predictions',
        'recommendations',
        'grade_history',
        'import_logs'
    ];

    foreach ($tables as $table) {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        $exists = $stmt->rowCount() > 0;
        $stmt->closeCursor(); // Close cursor after each query
        $status = $exists ? '✅' : '❌';
        echo "   $status $table\n";
    }

} catch (PDOException $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>