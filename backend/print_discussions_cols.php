<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();
$stm = $pdo->query("DESCRIBE discussions");
while ($row = $stm->fetch(PDO::FETCH_ASSOC)) {
    echo $row['Field'] . "\n";
}
