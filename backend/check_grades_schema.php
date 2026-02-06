<?php
require_once __DIR__ . '/config/database.php';

try {
    $pdo = getDBConnection();

    echo "Student Grades Table:\n";
    $output = "";
    $stmt = $pdo->query("DESCRIBE learning_sessions");
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $c) {
        $output .= $c['Field'] . " (" . $c['Type'] . ")\n";
    }
    file_put_contents('schema_dump.txt', $output);
    echo "Dumped to schema_dump.txt\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
