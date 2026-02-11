<?php
require_once __DIR__ . '/backend/config/database.php';
$pdo = getDBConnection();

echo "Checking Risk Levels distribution:\n";
$stmt = $pdo->query("SELECT risk_level, COUNT(*) as c FROM behavior_patterns GROUP BY risk_level");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "Level: '" . $row['risk_level'] . "' Count: " . $row['c'] . "\n";
}

echo "\nChecking Max Week Start:\n";
$stmt = $pdo->query("SELECT MAX(week_start) as m FROM behavior_patterns");
$maxWeek = $stmt->fetch()['m'];
echo "Max Week: " . $maxWeek . "\n";

echo "\nChecking Critical Students on Max Week:\n";
$sql = "SELECT risk_level, COUNT(*) as c FROM behavior_patterns WHERE week_start = '$maxWeek' GROUP BY risk_level";
$stmt = $pdo->query($sql);
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "Level: '" . $row['risk_level'] . "' Count: " . $row['c'] . "\n";
}
?>