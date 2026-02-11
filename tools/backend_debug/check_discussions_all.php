<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();
$stmt = $pdo->query("SELECT id, title, category, user_id FROM discussions");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
