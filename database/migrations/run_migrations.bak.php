<?php
/**
 * Migration Runner
 * Executes all pending database migrations
 */

require_once __DIR__ . '/../../backend/config/database.php';

try {
    $pdo = getDBConnection();

    echo "=== Student Data Mining - Database Migration Runner ===\n\n";

    // Migration files in order
    $migrations = [
        '001_remove_teacher_role.sql',
        '002_enhanced_analytics_schema.sql'
    ];

    foreach ($migrations as $migrationFile) {
        $filepath = __DIR__ . '/' . $migrationFile;

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
            try {
                $pdo->exec($statement);
                $successCount++;
            } catch (PDOException $e) {
                // Some errors are acceptable (like table already exists)
                if (
                    strpos($e->getMessage(), 'already exists') === false &&
                    strpos($e->getMessage(), 'Duplicate') === false
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
        $status = $exists ? '✅' : '❌';
        echo "   $status $table\n";
    }

} catch (PDOException $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>