<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();
$stm = $pdo->query("DESCRIBE teacher_subjects");
print_r($stm->fetchAll(PDO::FETCH_ASSOC));
