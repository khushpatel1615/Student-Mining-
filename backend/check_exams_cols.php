<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();
try {
    echo "--- Exams table structure ---\n";
    $stm = $pdo->query("DESCRIBE exams");
    $rows = $stm->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $r) {
        echo $r['Field'] . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
