<?php
/**
 * Learning Behavior Analysis - At-Risk Students API
 * GET /api/behavior/at_risk_students.php?risk_level=warning&limit=50
 * 
 * Returns list of students flagged as at-risk based on behavior patterns
 * Admin/Teacher only endpoint
 */

require_once __DIR__ . '/../../includes/jwt.php';
require_once __DIR__ . '/../../config/database.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Authenticate user
$headers = getallheaders();
$token = null;
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $token = $matches[1];
}

$validation = verifyToken($token);
if (!$validation['valid']) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$userId = $validation['payload']['user_id'];
$userRole = $validation['payload']['role'];

// Only admins and teachers can view at-risk students
if ($userRole === 'student') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Forbidden']);
    exit;
}

// Get query parameters
$riskLevel = isset($_GET['risk_level']) ? $_GET['risk_level'] : null;
$programId = isset($_GET['program_id']) ? (int) $_GET['program_id'] : null;
$semester = isset($_GET['semester']) ? (int) $_GET['semester'] : null;
$limit = isset($_GET['limit']) ? min((int) $_GET['limit'], 200) : 50;
$offset = isset($_GET['offset']) ? (int) $_GET['offset'] : 0;
$search = isset($_GET['search']) ? trim($_GET['search']) : null;

try {
    $pdo = getDBConnection();

    // Build query
    $query = '
        SELECT 
            u.id,
            u.full_name as student_name,
            u.email,
            u.student_id,
            u.avatar_url,
            u.current_semester,
            p.name as program_name,
            bp.risk_level,
            bp.risk_score,
            bp.overall_engagement_score,
            bp.on_time_submission_rate,
            bp.study_consistency_score,
            bp.grade_trend,
            bp.total_logins,
            bp.days_active,
            bp.risk_factors,
            bp.week_start,
            bp.calculated_at,
            srs.attendance_score,
            srs.grade_avg,
            COUNT(DISTINCT CASE WHEN i.status IN ("pending", "in_progress") THEN i.id END) as open_interventions,
            MAX(i.created_at) as last_intervention_date,
            MAX(i.status) as last_intervention_status
        FROM users u
        LEFT JOIN programs p ON u.program_id = p.id
        LEFT JOIN behavior_patterns bp ON u.id = bp.user_id 
            AND bp.week_start = (SELECT MAX(week_start) FROM behavior_patterns)
        LEFT JOIN student_risk_scores srs ON u.id = srs.user_id
        LEFT JOIN interventions i ON u.id = i.student_id
        WHERE u.role = "student"
        AND u.is_active = 1
    ';

    $params = [];

    // Filter by risk level
    if ($riskLevel && $riskLevel !== 'all') {
        $query .= ' AND bp.risk_level = ?';
        $params[] = $riskLevel;
    } else {
        // Default: show warning, at_risk, and critical
        $query .= ' AND bp.risk_level IN ("warning", "at_risk", "critical")';
    }

    // Filter by program
    if ($programId) {
        $query .= ' AND u.program_id = ?';
        $params[] = $programId;
    }

    // Filter by semester
    if ($semester) {
        $query .= ' AND u.current_semester = ?';
        $params[] = $semester;
    }

    // Search by name or email
    if ($search) {
        $query .= ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.student_id LIKE ?)';
        $searchParam = "%$search%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }

    $query .= ' GROUP BY u.id, bp.id, srs.id ORDER BY bp.risk_score DESC, bp.overall_engagement_score ASC';

    // Get total count before limit
    $countQuery = preg_replace('/SELECT.*?FROM/s', 'SELECT COUNT(DISTINCT u.id) as total FROM', $query);
    $countQuery = preg_replace('/ORDER BY.*$/', '', $countQuery);
    $countQuery = preg_replace('/GROUP BY.*$/', '', $countQuery);
    $countStmt = $pdo->prepare($countQuery);
    $countStmt->execute($params);
    $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Add pagination
    $query .= ' LIMIT ? OFFSET ?';
    $params[] = $limit;
    $params[] = $offset;

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Parse JSON fields and add computed fields
    foreach ($students as &$student) {
        if (isset($student['risk_factors']) && $student['risk_factors']) {
            $student['risk_factors'] = json_decode($student['risk_factors'], true);
        } else {
            $student['risk_factors'] = [];
        }

        // Compute composite score (for sorting/display)
        $student['composite_score'] = round(
            (($student['overall_engagement_score'] ?? 0) * 0.4) +
            (($student['on_time_submission_rate'] ?? 0) * 0.3) +
            (($student['study_consistency_score'] ?? 0) * 0.3),
            1
        );

        // Determine urgency based on multiple factors
        $urgencyScore = 0;
        if ($student['risk_level'] === 'critical')
            $urgencyScore += 40;
        elseif ($student['risk_level'] === 'at_risk')
            $urgencyScore += 25;
        elseif ($student['risk_level'] === 'warning')
            $urgencyScore += 10;

        if ($student['open_interventions'] == 0)
            $urgencyScore += 20;
        if ($student['days_active'] < 3)
            $urgencyScore += 15;

        $student['urgency_score'] = $urgencyScore;
        $student['needs_attention'] = $urgencyScore >= 50;
    }

    // Get summary statistics
    $summaryStmt = $pdo->prepare('
        SELECT 
            COUNT(CASE WHEN bp.risk_level = "critical" THEN 1 END) as critical_count,
            COUNT(CASE WHEN bp.risk_level = "at_risk" THEN 1 END) as at_risk_count,
            COUNT(CASE WHEN bp.risk_level = "warning" THEN 1 END) as warning_count,
            AVG(bp.overall_engagement_score) as avg_engagement,
            AVG(bp.on_time_submission_rate) as avg_on_time_rate
        FROM users u
        JOIN behavior_patterns bp ON u.id = bp.user_id
        WHERE u.role = "student" 
        AND u.is_active = 1
        AND bp.week_start = (SELECT MAX(week_start) FROM behavior_patterns)
        AND bp.risk_level IN ("warning", "at_risk", "critical")
    ');
    $summaryStmt->execute();
    $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'students' => $students,
        'summary' => [
            'critical' => (int) ($summary['critical_count'] ?? 0),
            'at_risk' => (int) ($summary['at_risk_count'] ?? 0),
            'warning' => (int) ($summary['warning_count'] ?? 0),
            'avg_engagement' => round($summary['avg_engagement'] ?? 0, 1),
            'avg_on_time_rate' => round($summary['avg_on_time_rate'] ?? 0, 1)
        ],
        'pagination' => [
            'total' => (int) $total,
            'limit' => $limit,
            'offset' => $offset
        ],
        'filters' => [
            'risk_level' => $riskLevel,
            'program_id' => $programId,
            'semester' => $semester,
            'search' => $search
        ]
    ]);

} catch (Exception $e) {
    error_log('Get at-risk students error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to retrieve at-risk students']);
}
