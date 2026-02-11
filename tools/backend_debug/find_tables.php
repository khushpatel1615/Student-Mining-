<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();
$stmt = $pdo->query("SHOW TABLES LIKE '%subject%'");
echo "Subject related tables:\n";
print_r($stmt->fetchAll(PDO::FETCH_COLUMN));

$stmt = $pdo->query("SHOW TABLES LIKE '%teacher%'");
echo "\nTeacher related tables:\n";
print_r($stmt->fetchAll(PDO::FETCH_COLUMN));
