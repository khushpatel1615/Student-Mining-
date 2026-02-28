<?php
require 'e:/XAMP/htdocs/StudentDataMining/backend/config/database.php';
$pdo = getDBConnection();
$stmt = $pdo->prepare('SELECT * FROM evaluation_criteria WHERE subject_id = 1');
$stmt->execute();
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
