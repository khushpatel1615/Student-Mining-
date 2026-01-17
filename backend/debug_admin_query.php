<?php
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();

// Simulate the query for admin
echo "Running Admin Query...\n";
$sql = "SELECT d.*, COALESCE(u.full_name, 'Unknown') as author_name, u.avatar,
        (SELECT COUNT(*) FROM discussion_replies WHERE discussion_id = d.id) as reply_count
        FROM discussions d LEFT JOIN users u ON d.user_id = u.id 
        WHERE d.category = 'announcement'";

$stmt = $pdo->query($sql);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Count: " . count($rows) . "\n";
print_r($rows);

// Check if category has issues
echo "\nCheck distinct categories:\n";
$stmt = $pdo->query("SELECT DISTINCT category, LENGTH(category) as len FROM discussions");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
