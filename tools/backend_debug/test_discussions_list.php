<?php
// Mock user for testing
$user = ['role' => 'admin', 'user_id' => 1];

require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection();

$baseQuery = "SELECT d.id, d.title, d.content, d.category, d.program_id, d.semester, d.is_pinned, d.views, d.created_at, d.user_id,
    COALESCE(u.full_name, 'Unknown') as author_name, u.avatar_url
    FROM discussions d 
    LEFT JOIN users u ON d.user_id = u.id 
    WHERE LOWER(d.category) = 'announcement'";

$params = [];
$baseQuery .= " ORDER BY d.is_pinned DESC, d.created_at DESC LIMIT 50";

try {
    $stmt = $pdo->prepare($baseQuery);
    $stmt->execute($params);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'data' => $data]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
