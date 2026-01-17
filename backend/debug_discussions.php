<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();
try {
    echo "--- Table Structure ---\n";
    $stm = $pdo->query("DESCRIBE discussions");
    $rows = $stm->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $r) {
        echo $r['Field'] . " | " . $r['Type'] . "\n";
    }

    echo "\n--- Table Content (Last 5) ---\n";
    $stm = $pdo->query("SELECT id, title, category, program_id, semester FROM discussions ORDER BY id DESC LIMIT 5");
    $rows = $stm->fetchAll(PDO::FETCH_ASSOC);
    print_r($rows);

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
