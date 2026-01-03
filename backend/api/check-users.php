<?php
// Quick script to check database users
require_once __DIR__ . '/../config/database.php';

$pdo = getDBConnection();
$stmt = $pdo->query("SELECT id, email, student_id, full_name, role, is_active, google_id FROM users");
$users = $stmt->fetchAll();

echo "<h2>Current Users in Database:</h2>";
echo "<table border='1' cellpadding='10'>";
echo "<tr><th>ID</th><th>Email</th><th>Student ID</th><th>Full Name</th><th>Role</th><th>Active</th><th>Google ID</th></tr>";

foreach ($users as $user) {
    echo "<tr>";
    echo "<td>{$user['id']}</td>";
    echo "<td>{$user['email']}</td>";
    echo "<td>{$user['student_id']}</td>";
    echo "<td>{$user['full_name']}</td>";
    echo "<td>{$user['role']}</td>";
    echo "<td>" . ($user['is_active'] ? 'Yes' : 'No') . "</td>";
    echo "<td>" . ($user['google_id'] ?? 'Not set') . "</td>";
    echo "</tr>";
}

echo "</table>";
?>