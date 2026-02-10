<?php

/**
 * Student Live Analytics API
 * Returns real-time analytics data with trends for the student dashboard.
 * Supports polling.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';
// Ensure CORS function exists to prevent "undefined function" error
if (!function_exists('setCORSHeaders')) {
    function setCORSHeaders()
    {
        // Allow from any origin
        if (isset($_SERVER['HTTP_ORIGIN'])) {
            header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Max-Age: 86400');
// cache for 1 day
        }
        // Access-Control headers are received during OPTIONS requests
        if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
            if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
                header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
            }
            if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
                header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
            }
            exit(0);
        }
    }

}

setCORSHeaders();
header('Content-Type: application/json');
$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
// 1. Authentication
    $token = getTokenFromHeader();
    $validation = verifyToken($token);
    if (!$validation || !$validation['valid']) {
        throw new Exception("Unauthorized");
    }

    $authUser = $validation['payload'];
    $requestUserId = $_GET['user_id'] ?? $authUser['user_id'];
    if ($authUser['role'] !== 'admin' && $requestUserId != $authUser['user_id']) {
        throw new Exception("Access denied");
    }

    // 2. Fetch Base Stats (Current State)
    $stmt = $pdo->prepare("
        SELECT 
            u.full_name,
            srs.risk_score, srs.risk_level, 
            srs.attendance_score, srs.grade_avg, srs.engagement_score
        FROM users u
        LEFT JOIN student_risk_scores srs ON u.id = srs.user_id
        WHERE u.id = ?
    ");
    $stmt->execute([$requestUserId]);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$stats) {
        throw new Exception("Student data not found");
    }

    // 3. Fetch Real Grade History (Safe Mode)
    $gradeHistory = [];
    try {
        $stmtGrades = $pdo->prepare("
            SELECT 
                ROUND((sg.marks_obtained / NULLIF(ec.max_marks, 0)) * 100, 2) as grade_value,
                COALESCE(sg.graded_at, sg.updated_at, sg.created_at) as created_at
            FROM student_grades sg
            JOIN evaluation_criteria ec ON sg.criteria_id = ec.id
            JOIN student_enrollments se ON sg.enrollment_id = se.id
            WHERE se.user_id = ?
            AND sg.marks_obtained IS NOT NULL
            ORDER BY created_at ASC
            LIMIT 30
        ");
        $stmtGrades->execute([$requestUserId]);
        $gradeHistory = $stmtGrades->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $ex) {
        // No grade history available
    }

    // 4. Build attendance history (last 30 days)
    $attendanceTrend = [];
    try {
        $stmtAttendance = $pdo->prepare("
            SELECT sa.attendance_date as date,
                   SUM(CASE WHEN sa.status = 'present' THEN 1 ELSE 0 END) as present,
                   COUNT(*) as total
            FROM student_attendance sa
            JOIN student_enrollments se ON se.id = sa.enrollment_id
            WHERE se.user_id = ? AND sa.attendance_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY sa.attendance_date
            ORDER BY sa.attendance_date ASC
        ");
        $stmtAttendance->execute([$requestUserId]);
        $attendanceRows = $stmtAttendance->fetchAll(PDO::FETCH_ASSOC);
        foreach ($attendanceRows as $row) {
            $date = $row['date'];
            $present = (int) $row['present'];
            $total = (int) $row['total'];
            $pct = $total > 0 ? round(($present / $total) * 100, 1) : 0;
            $attendanceTrend[] = [
                'date' => $date,
                't' => date('M d', strtotime($date)),
                'value' => $pct
            ];
        }
    } catch (Exception $ex) {
        // No attendance trend available
    }

    // Overall attendance (all-time)
    $currentAttendance = 0;
    try {
        $stmtOverall = $pdo->prepare("
            SELECT SUM(CASE WHEN sa.status = 'present' THEN 1 ELSE 0 END) as present,
                   COUNT(*) as total
            FROM student_attendance sa
            JOIN student_enrollments se ON se.id = sa.enrollment_id
            WHERE se.user_id = ?
        ");
        $stmtOverall->execute([$requestUserId]);
        $overallRow = $stmtOverall->fetch(PDO::FETCH_ASSOC);
        if ($overallRow && (int) $overallRow['total'] > 0) {
            $currentAttendance = round(((int) $overallRow['present'] / (int) $overallRow['total']) * 100, 1);
        }
    } catch (Exception $ex) {
        $currentAttendance = 0;
    }

    // 5. Build grade trend (real history)
    $gradeTrend = [];
    foreach ($gradeHistory as $g) {
        $date = substr($g['created_at'], 0, 10);
        $gradeTrend[] = [
            'date' => $date,
            't' => date('M d', strtotime($date)),
            'value' => (float) $g['grade_value']
        ];
    }

    $currentGrade = !empty($gradeHistory)
        ? (float) $gradeHistory[count($gradeHistory) - 1]['grade_value']
        : 0;

    // 6. Risk score and trend
    function calculateRiskScore($attendanceRate, $gradePercent)
    {
        $attendanceRate = max(0, min(100, $attendanceRate));
        $gradePercent = max(0, min(100, $gradePercent));
        $score = 100 - (($attendanceRate * 0.6) + ($gradePercent * 0.4));
        return round(max(0, min(100, $score)), 1);
    }

    function getRiskLabel($riskScore)
    {
        if ($riskScore >= 70) return 'High Risk';
        if ($riskScore >= 40) return 'Moderate';
        return 'Safe';
    }

    $currentRisk = calculateRiskScore($currentAttendance, $currentGrade);
    $riskLabel = $stats['risk_level'] ?? getRiskLabel($currentRisk);

    $attendanceMap = [];
    foreach ($attendanceTrend as $row) {
        $attendanceMap[$row['date']] = $row['value'];
    }
    $gradeMap = [];
    foreach ($gradeTrend as $row) {
        $gradeMap[$row['date']] = $row['value'];
    }

    $allDates = array_unique(array_merge(array_keys($attendanceMap), array_keys($gradeMap)));
    sort($allDates);
    $riskTrend = [];
    $lastAttendance = $currentAttendance;
    $lastGrade = $currentGrade;
    foreach ($allDates as $date) {
        if (isset($attendanceMap[$date])) {
            $lastAttendance = $attendanceMap[$date];
        }
        if (isset($gradeMap[$date])) {
            $lastGrade = $gradeMap[$date];
        }
        $riskTrend[] = [
            't' => date('M d', strtotime($date)),
            'value' => calculateRiskScore($lastAttendance, $lastGrade)
        ];
    }

    $trends = [
        'grades' => array_map(function ($row) { return ['t' => $row['t'], 'value' => $row['value']]; }, $gradeTrend),
        'attendance' => array_map(function ($row) { return ['t' => $row['t'], 'value' => $row['value']]; }, $attendanceTrend),
        'risk' => $riskTrend
    ];
// 7. Response Construction
    $response = [
        'success' => true,
        'timestamp' => date('c'),
        'data' => [
            'risk_score' => $currentRisk,
            'risk_level' => $riskLabel,
            'risk_label' => $riskLabel,
            'attendance_percent' => $currentAttendance,
            'avg_grade' => $currentGrade,
            'gpa_4' => round(($currentGrade / 25), 2),
            'engagement_percent' => (float) ($stats['engagement_score'] ?? 0),
            'trends' => $trends
        ]
    ];
    echo json_encode($response);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
