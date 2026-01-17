<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();
$stm = $pdo->query("DESCRIBE academic_calendar");
while ($row = $stm->fetch(PDO::FETCH_ASSOC)) {
    echo $row['Field'] . "\n";
}
