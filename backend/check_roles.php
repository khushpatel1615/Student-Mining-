<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();
$stmt = $pdo->query('SELECT DISTINCT role FROM users');
print_r($stmt->fetchAll(PDO::FETCH_COLUMN));
