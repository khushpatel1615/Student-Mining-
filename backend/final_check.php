<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();
$stm = $pdo->query("DESCRIBE subjects");
$cols = $stm->fetchAll(PDO::FETCH_COLUMN);
$found = false;
foreach ($cols as $c) {
    if ($c === 'teacher_id') {
        $found = true;
        break;
    }
}
if ($found) {
    echo "RESULT: YES - teacher_id EXISTS in subjects\n";
} else {
    echo "RESULT: NO - teacher_id MISSING in subjects\n";
    echo "COLUMNS FOUND: " . implode(", ", $cols) . "\n";
}
