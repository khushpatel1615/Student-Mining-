<?php
require_once __DIR__ . '/../config/database.php';
$pdo = getDBConnection();

$stmt = $pdo->query("SHOW INDEX FROM student_grades");
$indices = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Indices for student_grades:\n";
foreach ($indices as $idx) {
    echo "Key_name: " . $idx['Key_name'] . ", Column_name: " . $idx['Column_name'] . ", Non_unique: " . $idx['Non_unique'] . "\n";
}
?>