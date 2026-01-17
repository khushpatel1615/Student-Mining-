<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();
$stm = $pdo->query("SHOW COLUMNS FROM subjects LIKE 'teacher_id'");
$col = $stm->fetch();
if ($col) {
    echo "Column teacher_id exists\n";
} else {
    echo "Column teacher_id does NOT exist. Checking for other teacher-related columns...\n";
    $stm = $pdo->query("SHOW COLUMNS FROM subjects");
    $all = $stm->fetchAll(PDO::FETCH_COLUMN);
    foreach ($all as $c) {
        if (strpos(strtolower($c), 'teacher') !== false || strpos(strtolower($c), 'instructor') !== false || strpos(strtolower($c), 'user') !== false) {
            echo "Found: $c\n";
        }
    }
}
