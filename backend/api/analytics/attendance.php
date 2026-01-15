<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/jwt.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $token = getTokenFromHeader();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'No token provided']);
        exit;
    }

    $result = verifyToken($token);
    if (!$result['valid']) {
        http_response_code(401);
        echo json_encode(['error' => $result['error']]);
        exit;
    }

    $user = $result['payload'];
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Admin access required']);
        exit;
    }

    $pdo = getDBConnection();

    // Get attendance data for the last 7 days
    $stmt = $pdo->query("SELECT 
                            DATE(attendance_date) as date,
                            COUNT(*) as total_records,
                            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count
                        FROM attendance
                        WHERE attendance_date >= CURDATE() - INTERVAL 7 DAY
                        GROUP BY DATE(attendance_date)
                        ORDER BY date ASC");
    
    $dailyStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $attendanceData = [];
    $totalRate = 0;
    $days = 0;

    foreach ($dailyStats as $stat) {
        $rate = $stat['total_records'] > 0 ? ($stat['present_count'] / $stat['total_records']) * 100 : 0;
        $attendanceData[] = [
            'date' => $stat['date'],
            'rate' => round($rate, 2)
        ];
        $totalRate += $rate;
        $days++;
    }

    $overallRate = $days > 0 ? $totalRate / $days : 0;

    echo json_encode([
        'success' => true,
        'data' => [
            'overall_attendance_rate' => round($overallRate, 2),
            'daily_attendance' => $attendanceData
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>