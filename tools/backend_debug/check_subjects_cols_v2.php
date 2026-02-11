<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();
try {
    echo "--- Subjects table structure ---\n";
    $stm = $pdo->query("DESCRIBE subjects");
    $rows = $stm->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $r) {
        echo json_encode($r) . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
