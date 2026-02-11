<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();
$stmt = $pdo->query('SHOW TABLES');
echo implode("\n", $stmt->fetchAll(PDO::FETCH_COLUMN));
