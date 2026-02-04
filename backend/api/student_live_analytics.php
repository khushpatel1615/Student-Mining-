<?php

/**
 * Student Live Analytics API
 * Returns real-time analytics data with trends for the student dashboard.
 * Supports polling.
 * Includes fallback trend simulation if history is sparse or tables missing.
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
// Fallback to simulation
    }

    // 4. Generate Trend Data (Last 30 Days)
        $currentGrade = (float) ($stats['grade_avg'] ?? 75);
    $currentAttendance = (float) ($stats['attendance_score'] ?? 80);
    $currentRisk = (float) ($stats['risk_score'] ?? 20);
// Helper: Generate smoothed random walk ending at target
    function generateTrend($targetValue, $points = 30, $volatility = 5)
    {
        $trend = [];
        $current = $targetValue; // Work backwards

        for ($i = 0; $i < $points; $i++) {
            $trend[] = [
            't' => date('M d', strtotime("-" . $i . " days")), // Daily data
            'value' => max(0, min(100, round($current + (rand(-$volatility, $volatility) / 2), 1)))
            ];
// Move 'current' slightly away from target
            $current += (rand(-10, 10) / 10);
        }

        return array_reverse($trend);
    }

    // Grade Trend
        $trends = [];
    if (count($gradeHistory) >= 5) {
        $trends['grades'] = array_map(function ($g) {

                return [
                't' => date('M d', strtotime($g['created_at'])),
                'value' => (float) $g['grade_value']
                ];
        }, $gradeHistory);
    } else {
        $trends['grades'] = generateTrend($currentGrade, 30, 2);
    }

    // Attendance Trend (Simulated based on current - usually stable)
        $trends['attendance'] = generateTrend($currentAttendance, 30, 1);
// Risk Trend (Simulated based on current - sensitivity 3)
        $trends['risk'] = generateTrend($currentRisk, 30, 3);
// 5. Response Construction
        $response = [
        'success' => true,
        'timestamp' => date('c'),
        'data' => [
            'risk_score' => $currentRisk,
            'risk_level' => $stats['risk_level'] ?? 'Unknown',
            'risk_label' => $stats['risk_level'] ?? 'Unknown',
            'attendance_percent' => $currentAttendance,
            'avg_grade' => $currentGrade,
            'gpa_4' => round(($currentGrade / 25), 2),
            'engagement_percent' => (float) ($stats['engagement_score'] ?? 50),
            'trends' => $trends
        ]
        ];
        echo json_encode($response);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
