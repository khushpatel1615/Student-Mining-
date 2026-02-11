<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();
try {
    $stm = $pdo->query("DESCRIBE users");
    $rows = $stm->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $r) {
        echo $r['Field'] . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
