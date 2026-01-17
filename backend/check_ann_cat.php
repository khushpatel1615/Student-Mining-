<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();
$stmt = $pdo->query("SELECT category, COUNT(*) as count FROM discussions GROUP BY category");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
