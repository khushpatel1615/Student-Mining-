<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();
$stm = $pdo->query("DESCRIBE discussions");
print_r($stm->fetchAll(PDO::FETCH_ASSOC));
