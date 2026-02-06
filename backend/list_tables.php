<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();
$tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
echo implode("\n", $tables);
