<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();

$baseQuery = "SELECT d.id, d.title, d.category, d.user_id, u.full_name as author_name
              FROM discussions d 
              LEFT JOIN users u ON d.user_id = u.id 
              WHERE LOWER(d.category) = 'announcement'";

$stmt = $pdo->query($baseQuery);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

header('Content-Type: application/json');
echo json_encode($rows);
