<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();

echo "--- Users ---\n";
$stmt = $pdo->query("SELECT id, full_name, role FROM users");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\n--- Discussions User IDs ---\n";
$stmt = $pdo->query("SELECT id, user_id, title FROM discussions LIMIT 10");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
