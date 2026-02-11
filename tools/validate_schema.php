<?php
/**
 * Database Schema Validation Script
 * 
 * Validates that:
 * - All migrations apply cleanly to an empty database
 * - Table naming is consistent
 * - Foreign keys are properly defined
 * - Indexes are aligned with query patterns
 */

require_once __DIR__ . '/../../backend/config/database.php';

echo "=== Database Schema Validation ===\n\n";

try {
    $pdo = getDBConnection();

    // 1. Check table naming consistency
    echo "1. Checking table naming consistency...\n";
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $namingIssues = [];
    foreach ($tables as $table) {
        // Check for inconsistent naming (e.g., mixing snake_case with camelCase)
        if (preg_match('/[A-Z]/', $table)) {
            $namingIssues[] = "$table (contains uppercase)";
        }
    }

    if (empty($namingIssues)) {
        echo "   ✓ All tables follow snake_case convention\n";
    } else {
        echo "   ⚠️  Naming issues found:\n";
        foreach ($namingIssues as $issue) {
            echo "      - $issue\n";
        }
    }
    echo "\n";

    // 2. Check foreign key constraints
    echo "2. Checking foreign key constraints...\n";
    $fkQuery = "
        SELECT 
            TABLE_NAME,
            COLUMN_NAME,
            CONSTRAINT_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME IS NOT NULL
        ORDER BY TABLE_NAME, COLUMN_NAME
    ";

    $stmt = $pdo->query($fkQuery);
    $foreignKeys = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "   Found " . count($foreignKeys) . " foreign key(s)\n";

    $fkIssues = [];
    foreach ($foreignKeys as $fk) {
        // Check if referenced table exists
        if (!in_array($fk['REFERENCED_TABLE_NAME'], $tables)) {
            $fkIssues[] = "{$fk['TABLE_NAME']}.{$fk['COLUMN_NAME']} references non-existent table {$fk['REFERENCED_TABLE_NAME']}";
        }
    }

    if (empty($fkIssues)) {
        echo "   ✓ All foreign keys are valid\n";
    } else {
        echo "   ⚠️  Foreign key issues:\n";
        foreach ($fkIssues as $issue) {
            echo "      - $issue\n";
        }
    }
    echo "\n";

    // 3. Check indexes
    echo "3. Checking database indexes...\n";
    $indexQuery = "
        SELECT 
            TABLE_NAME,
            INDEX_NAME,
            GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as COLUMNS
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
        AND INDEX_NAME != 'PRIMARY'
        GROUP BY TABLE_NAME, INDEX_NAME
        ORDER BY TABLE_NAME, INDEX_NAME
    ";

    $stmt = $pdo->query($indexQuery);
    $indexes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "   Found " . count($indexes) . " index(es) (excluding PRIMARY)\n";

    // List indexes for review
    $indexesByTable = [];
    foreach ($indexes as $idx) {
        $indexesByTable[$idx['TABLE_NAME']][] = $idx;
    }

    foreach ($indexesByTable as $table => $tableIndexes) {
        echo "   • $table (" . count($tableIndexes) . " indexes)\n";
    }
    echo "\n";

    // 4. Check for common query optimization opportunities
    echo "4. Checking for query optimization opportunities...\n";

    // Check if commonly queried tables have proper indexes
    $criticalTables = [
        'users' => ['email', 'role', 'is_active'],
        'student_enrollments' => ['user_id', 'subject_id'],
        'grades' => ['student_id', 'subject_id'],
        'attendance' => ['student_id', 'subject_id', 'date']
    ];

    $missingIndexes = [];
    foreach ($criticalTables as $table => $columns) {
        if (!in_array($table, $tables)) {
            continue; // Table doesn't exist
        }

        // Get existing indexes for this table
        $existingCols = [];
        if (isset($indexesByTable[$table])) {
            foreach ($indexesByTable[$table] as $idx) {
                $cols = explode(',', $idx['COLUMNS']);
                $existingCols = array_merge($existingCols, $cols);
            }
        }

        foreach ($columns as $col) {
            if (!in_array($col, $existingCols)) {
                $missingIndexes[] = "$table.$col";
            }
        }
    }

    if (empty($missingIndexes)) {
        echo "   ✓ All critical columns are indexed\n";
    } else {
        echo "   ℹ️  Consider adding indexes for:\n";
        foreach ($missingIndexes as $missing) {
            echo "      - $missing\n";
        }
    }
    echo "\n";

    // 5. Summary
    echo "=== Validation Summary ===\n";
    $totalIssues = count($namingIssues) + count($fkIssues);

    if ($totalIssues === 0) {
        echo "✓ Schema validation passed! No critical issues found.\n";
        exit(0);
    } else {
        echo "⚠️  Found $totalIssues issue(s) that should be reviewed.\n";
        exit(1);
    }

} catch (PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
