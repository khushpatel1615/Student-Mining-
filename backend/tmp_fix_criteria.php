<?php
require 'e:/XAMP/htdocs/StudentDataMining/backend/config/database.php';
$pdo = getDBConnection();
$pdo->exec("UPDATE evaluation_criteria SET weight_percentage = 100.00 WHERE id = 52");
echo "Updated criteria 52 to 100%";
