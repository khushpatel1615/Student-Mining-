<?php
require_once __DIR__ . '/../backend/config/database.php';
$pdo = getDBConnection();

echo "--- PERFORMANCE DISTRIBUTION CHECK ---\n";
$sql = "
    SELECT 
        SUM(CASE WHEN avg_perc >= 80 THEN 1 ELSE 0 END) as excellent,
        SUM(CASE WHEN avg_perc BETWEEN 70 AND 79.99 THEN 1 ELSE 0 END) as good,
        SUM(CASE WHEN avg_perc BETWEEN 60 AND 69.99 THEN 1 ELSE 0 END) as average,
        SUM(CASE WHEN avg_perc BETWEEN 50 AND 59.99 THEN 1 ELSE 0 END) as below_average,
        SUM(CASE WHEN avg_perc < 50 THEN 1 ELSE 0 END) as at_risk
    FROM (
        SELECT AVG(final_percentage) as avg_perc
        FROM vw_student_performance
        GROUP BY user_id
    ) as student_averages
";
$dist = $pdo->query($sql)->fetch(PDO::FETCH_ASSOC);
$totalInDist = array_sum($dist);

echo "Excellent: " . $dist['excellent'] . "\n";
echo "Good: " . $dist['good'] . "\n";
echo "Average: " . $dist['average'] . "\n";
echo "Below Average: " . $dist['below_average'] . "\n";
echo "At Risk: " . $dist['at_risk'] . "\n";
echo "Total Count in Performance Distribution: " . $totalInDist . "\n";

$stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = 1");
$activeStudents = $stmt->fetchColumn();
echo "Actual Active Students: " . $activeStudents . "\n";

if ($totalInDist > $activeStudents) {
    echo "\n[DISCREPANCY DETECTED] The performance distribution graph counts enrollments ($totalInDist) instead of unique students ($activeStudents).\n";
}

echo "\n--- PROGRAM ANALYTICS CHECK ---\n";
$sql = "
    SELECT 
        p.name,
        COUNT(DISTINCT v.user_id) as student_count
    FROM programs p
    JOIN users u ON p.id = u.program_id
    JOIN vw_student_performance v ON u.id = v.user_id
    GROUP BY p.id
";
$progs = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
$sumProgStudents = 0;
foreach ($progs as $p) {
    echo "Program: " . $p['name'] . " | Distinct Students: " . $p['student_count'] . "\n";
    $sumProgStudents += $p['student_count'];
}
echo "Sum of distinct students across programs: " . $sumProgStudents . "\n";
