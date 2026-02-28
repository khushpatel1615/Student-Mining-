<?php
/**
 * Database Duplicates Cleanup Script
 * Run: php tools/fix_duplicates.php
 */

$host = 'localhost';
$dbname = 'student_data_mining';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
} catch (PDOException $e) {
    die("DB Connection Failed: " . $e->getMessage() . "\n");
}

echo "=== Student Data Mining - Fixing Duplicates ===\n\n";

// 1. academic_calendar
echo "1. Cleaning up academic_calendar...\n";
$sql = "
    DELETE t1 FROM academic_calendar t1
    INNER JOIN academic_calendar t2 
    WHERE 
        t1.id > t2.id AND 
        t1.title = t2.title AND 
        t1.event_date = t2.event_date AND 
        t1.type = t2.type;
";
$deleted = $pdo->exec($sql);
echo "   Deleted $deleted duplicate rows.\n";

echo "   Adding UNIQUE constraint 'unique_calendar_event'...\n";
try {
    $pdo->exec("ALTER TABLE academic_calendar ADD UNIQUE KEY unique_calendar_event (title, event_date, type)");
    echo "   [SUCCESS] Constraint added.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate key name') !== false) {
        echo "   [SKIP] Constraint already exists.\n";
    } else {
        echo "   [ERROR] " . $e->getMessage() . "\n";
    }
}

// 2. activity_logs
echo "\n2. Cleaning up activity_logs...\n";
$sql = "
    DELETE t1 FROM activity_logs t1
    INNER JOIN activity_logs t2 
    WHERE 
        t1.id > t2.id AND 
        t1.user_id = t2.user_id AND 
        t1.action = t2.action AND 
        t1.created_at = t2.created_at;
";
$deleted = $pdo->exec($sql);
echo "   Deleted $deleted duplicate rows.\n";

echo "   Adding UNIQUE constraint 'unique_activity'...\n";
try {
    $pdo->exec("ALTER TABLE activity_logs ADD UNIQUE KEY unique_activity (user_id, action, created_at)");
    echo "   [SUCCESS] Constraint added.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate key name') !== false) {
        echo "   [SKIP] Constraint already exists.\n";
    } else {
        echo "   [ERROR] " . $e->getMessage() . "\n";
    }
}

// 3. interventions
echo "\n3. Cleaning up interventions...\n";
$sql = "
    DELETE t1 FROM interventions t1
    INNER JOIN interventions t2 
    WHERE 
        t1.id > t2.id AND 
        t1.student_id = t2.student_id AND 
        t1.intervention_type = t2.intervention_type AND 
        t1.created_by = t2.created_by AND 
        t1.title = t2.title;
";
$deleted = $pdo->exec($sql);
echo "   Deleted $deleted duplicate rows.\n";

echo "   Adding UNIQUE constraint 'unique_intervention'...\n";
try {
    // MySQL keys have length limits, so we limit the title column to 100 chars in the index
    $pdo->exec("ALTER TABLE interventions ADD UNIQUE KEY unique_intervention (student_id, intervention_type, created_by, title(100))");
    echo "   [SUCCESS] Constraint added.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate key name') !== false) {
        echo "   [SKIP] Constraint already exists.\n";
    } else {
        echo "   [ERROR] " . $e->getMessage() . "\n";
    }
}

echo "\nDone!\n";
