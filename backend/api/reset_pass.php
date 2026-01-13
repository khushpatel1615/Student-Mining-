<?php
require 'e:/XAMP/htdocs/StudentDataMining/backend/config/database.php';
$pdo = getDBConnection();
$pass = password_hash('teacher123', PASSWORD_BCRYPT);
$stmt = $pdo->prepare('UPDATE users SET password_hash = ? WHERE email = ?');
$stmt->execute([$pass, 'teacher@college.edu']);
echo 'Password updated successfully';
?>