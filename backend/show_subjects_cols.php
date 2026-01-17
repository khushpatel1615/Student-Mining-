<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();
$stm = $pdo->query("SHOW COLUMNS FROM subjects");
$all = $stm->fetchAll(PDO::FETCH_COLUMN);
echo implode(", ", $all);
