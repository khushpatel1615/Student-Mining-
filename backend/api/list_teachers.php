<?php
require 'e:/XAMP/htdocs/StudentDataMining/backend/config/database.php';
$pdo = getDBConnection();
$stmt = $pdo->query("SELECT id, email, full_name, role FROM users WHERE role='teacher' LIMIT 5");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
?>