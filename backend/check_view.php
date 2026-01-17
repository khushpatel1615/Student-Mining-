<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();
try {
    $stmt = $pdo->query("SHOW CREATE VIEW vw_student_performance");
    $view = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "View exists: \n";
    print_r($view);
} catch (Exception $e) {
    echo "View does not exist: " . $e->getMessage();
}
