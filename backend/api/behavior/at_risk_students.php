<?php
/**
 * ============================================================================
 * LEARNING BEHAVIOR ANALYSIS - AT-RISK STUDENTS API
 * ============================================================================
 * 
 * GET /api/behavior/at_risk_students.php
 * 
 * Query Parameters:
 *   - risk_level: "critical" | "at_risk" | "warning" | "all" (default: all at-risk)
 *   - search: string (search by name, email, or student_id)
 *   - limit: int (default: 50, max: 200)
 *   - offset: int (default: 0)
 *   - program_id: int (optional filter)
 *   - semester: int (optional filter)
 * 
 * Returns:
 *   - success: boolean
 *   - students: array of student objects with behavior data
 *   - summary: aggregate statistics
 *   - pagination: total, limit, offset
 * 
 * ============================================================================
 */

// ============================================================================
// CORS HEADERS - MUST BE FIRST
// ============================================================================
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 86400'); // 24 hours cache

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed', 'allowed_methods' => ['GET']]);
    exit;
}

// ============================================================================
// DEPENDENCIES
// ============================================================================
try {
    require_once __DIR__ . '/../../includes/jwt.php';
    require_once __DIR__ . '/../../config/database.php';
} catch (Exception $e) {
    error_log('Failed to load dependencies: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server configuration error']);
    exit;
}

// ============================================================================
// AUTHENTICATION
// ============================================================================
$headers = getallheaders();
$token = null;

// Handle case-insensitive header (some servers lowercase headers)
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

if (preg_match('/Bearer\s+(.+)$/i', $authHeader, $matches)) {
    $token = trim($matches[1]);
}

if (!$token) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Unauthorized: No token provided',
        'hint' => 'Include Authorization header with Bearer token'
    ]);
    exit;
}

$validation = verifyToken($token);
if (!$validation['valid']) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Unauthorized: ' . ($validation['error'] ?? 'Invalid token')
    ]);
    exit;
}

$userId = $validation['payload']['user_id'];
$userRole = $validation['payload']['role'];

// ============================================================================
// AUTHORIZATION - Admin/Teacher only
// ============================================================================
if ($userRole === 'student') {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error' => 'Forbidden: Admin or Teacher access required'
    ]);
    exit;
}

// ============================================================================
// PARSE QUERY PARAMETERS
// ============================================================================
$riskLevel = isset($_GET['risk_level']) ? strtolower(trim($_GET['risk_level'])) : null;
$programId = isset($_GET['program_id']) ? (int) $_GET['program_id'] : null;
$semester = isset($_GET['semester']) ? (int) $_GET['semester'] : null;
$limit = isset($_GET['limit']) ? min(max((int) $_GET['limit'], 1), 200) : 50;
$offset = isset($_GET['offset']) ? max((int) $_GET['offset'], 0) : 0;
$search = isset($_GET['search']) ? trim($_GET['search']) : null;



// Validate risk_level
$validRiskLevels = ['critical', 'at_risk', 'warning', 'safe', 'all', 'risky'];
if ($riskLevel && !in_array($riskLevel, $validRiskLevels)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid risk_level. Must be one of: ' . implode(', ', $validRiskLevels)
    ]);
    exit;
}

// ============================================================================
// DATABASE CONNECTION
// ============================================================================
try {
    $pdo = getDBConnection();
} catch (Exception $e) {
    error_log('Database connection failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database connection failed',
        'students' => [],
        'summary' => ['critical' => 0, 'at_risk' => 0, 'warning' => 0, 'avg_engagement' => 0],
        'pagination' => ['total' => 0, 'limit' => $limit, 'offset' => $offset]
    ]);
    exit;
}

// ============================================================================
// CHECK IF BEHAVIOR_PATTERNS TABLE EXISTS AND HAS DATA
// ============================================================================
try {
    $checkTable = $pdo->query("SHOW TABLES LIKE 'behavior_patterns'");
    if ($checkTable->rowCount() === 0) {
        // Table doesn't exist - return empty with helpful message
        echo json_encode([
            'success' => true,
            'students' => [],
            'summary' => ['critical' => 0, 'at_risk' => 0, 'warning' => 0, 'avg_engagement' => 0],
            'pagination' => ['total' => 0, 'limit' => $limit, 'offset' => $offset],
            'message' => 'behavior_patterns table not found. Run the database migration first.',
            'setup_url' => '/backend/api/behavior/seed_mock_data.php'
        ]);
        exit;
    }

    $checkData = $pdo->query("SELECT COUNT(*) as cnt FROM behavior_patterns");
    $dataCount = $checkData->fetch()['cnt'];

    if ($dataCount == 0) {
        // Table exists but empty - return helpful response
        echo json_encode([
            'success' => true,
            'students' => [],
            'summary' => ['critical' => 0, 'at_risk' => 0, 'warning' => 0, 'avg_engagement' => 0],
            'pagination' => ['total' => 0, 'limit' => $limit, 'offset' => $offset],
            'message' => 'No behavior patterns computed yet. Run the setup script or cron job.',
            'setup_url' => '/backend/api/behavior/seed_mock_data.php'
        ]);
        exit;
    }
} catch (Exception $e) {
    error_log('Table check failed: ' . $e->getMessage());
    // Continue anyway - the main query will fail if there's a real issue
}

// ============================================================================
// BUILD MAIN QUERY
// ============================================================================
try {
    $query = "
        SELECT 
            u.id,
            u.full_name as student_name,
            u.email,
            u.student_id,
            u.avatar_url,
            u.current_semester,
            COALESCE(p.name, 'Unassigned') as program_name,
            COALESCE(bp.risk_level, 'unknown') as risk_level,
            COALESCE(bp.risk_score, 0) as risk_score,
            COALESCE(bp.overall_engagement_score, 0) as overall_engagement_score,
            COALESCE(bp.on_time_submission_rate, 0) as on_time_submission_rate,
            COALESCE(bp.study_consistency_score, 0) as study_consistency_score,
            COALESCE(bp.grade_trend, 'unknown') as grade_trend,
            COALESCE(bp.total_logins, 0) as total_logins,
            COALESCE(bp.days_active, 0) as days_active,
            bp.risk_factors,
            bp.week_start,
            bp.calculated_at,
            COUNT(DISTINCT CASE WHEN i.status IN ('pending', 'in_progress') THEN i.id END) as open_interventions,
            MAX(i.created_at) as last_intervention_date,
            MAX(i.status) as last_intervention_status
        FROM users u
        LEFT JOIN programs p ON u.program_id = p.id
        LEFT JOIN behavior_patterns bp ON u.id = bp.user_id 
            AND bp.week_start = (SELECT MAX(week_start) FROM behavior_patterns)
        LEFT JOIN interventions i ON u.id = i.student_id
        WHERE u.role = 'student'
        AND u.is_active = 1
    ";

    $params = [];

    // Filter by risk level
    if ($riskLevel && $riskLevel !== 'all') {
        if ($riskLevel === 'risky') {
            $query .= " AND bp.risk_level IN ('critical', 'at_risk', 'warning')";
        } else {
            $query .= ' AND bp.risk_level = ?';
            $params[] = $riskLevel;
        }
    }
    // If 'all' or not specified, we do NOT filter by risk_level
    // This allows showing 'safe' students too

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

    // Search by name, email, or student_id
    if ($search) {
        $query .= ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.student_id LIKE ?)';
        $searchParam = "%$search%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }

    $query .= ' GROUP BY u.id, bp.id, p.id ORDER BY bp.risk_score DESC, bp.overall_engagement_score ASC';

    // ========================================================================
    // COUNT TOTAL (for pagination)
    // ========================================================================
    $countQuery = "SELECT COUNT(DISTINCT u.id) as total " . substr($query, strpos($query, 'FROM'));
    $countQuery = preg_replace('/GROUP BY.*$/s', '', $countQuery);
    $countQuery = preg_replace('/ORDER BY.*$/s', '', $countQuery);

    $countStmt = $pdo->prepare($countQuery);
    $countStmt->execute($params);
    $total = (int) $countStmt->fetch()['total'];

    // ========================================================================
    // ADD PAGINATION
    // ========================================================================
    $query .= ' LIMIT ? OFFSET ?';
    $params[] = $limit;
    $params[] = $offset;

    // ========================================================================
    // EXECUTE MAIN QUERY
    // ========================================================================
    $stmt = $pdo->prepare($query);

    $stmt->execute($params);
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // ========================================================================
    // PROCESS RESULTS
    // ========================================================================
    foreach ($students as &$student) {
        // Parse JSON risk_factors
        if (!empty($student['risk_factors'])) {
            $decoded = json_decode($student['risk_factors'], true);
            $student['risk_factors'] = is_array($decoded) ? $decoded : [];
        } else {
            $student['risk_factors'] = [];
        }

        // Compute composite score
        $student['composite_score'] = round(
            (($student['overall_engagement_score'] ?? 0) * 0.4) +
            (($student['on_time_submission_rate'] ?? 0) * 0.3) +
            (($student['study_consistency_score'] ?? 0) * 0.3),
            1
        );

        // Determine urgency score
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

        // Cast numeric fields
        $student['id'] = (int) $student['id'];
        $student['risk_score'] = (float) $student['risk_score'];
        $student['overall_engagement_score'] = (float) $student['overall_engagement_score'];
        $student['on_time_submission_rate'] = (float) $student['on_time_submission_rate'];
        $student['study_consistency_score'] = (float) $student['study_consistency_score'];
        $student['total_logins'] = (int) $student['total_logins'];
        $student['days_active'] = (int) $student['days_active'];
        $student['open_interventions'] = (int) $student['open_interventions'];
    }
    unset($student);

    // ========================================================================
    // GET SUMMARY STATISTICS
    // ========================================================================
    $summaryStmt = $pdo->prepare("
        SELECT 
            COUNT(CASE WHEN bp.risk_level = 'critical' THEN 1 END) as critical_count,
            COUNT(CASE WHEN bp.risk_level = 'at_risk' THEN 1 END) as at_risk_count,
            COUNT(CASE WHEN bp.risk_level = 'warning' THEN 1 END) as warning_count,
            AVG(bp.overall_engagement_score) as avg_engagement,
            AVG(bp.on_time_submission_rate) as avg_on_time_rate
        FROM users u
        JOIN behavior_patterns bp ON u.id = bp.user_id
        WHERE u.role = 'student' 
        AND u.is_active = 1
        AND bp.week_start = (SELECT MAX(week_start) FROM behavior_patterns)
    ");
    $summaryStmt->execute();
    $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);

    // ========================================================================
    // RETURN RESPONSE
    // ========================================================================
    echo json_encode([
        'success' => true,
        'students' => $students,
        'summary' => [
            'critical' => (int) ($summary['critical_count'] ?? 0),
            'at_risk' => (int) ($summary['at_risk_count'] ?? 0),
            'warning' => (int) ($summary['warning_count'] ?? 0),
            'avg_engagement' => round((float) ($summary['avg_engagement'] ?? 0), 1),
            'avg_on_time_rate' => round((float) ($summary['avg_on_time_rate'] ?? 0), 1)
        ],
        'pagination' => [
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'pages' => ceil($total / $limit)
        ],
        'filters' => [
            'risk_level' => $riskLevel,
            'program_id' => $programId,
            'semester' => $semester,
            'search' => $search
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log('At-risk students query error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database query failed',
        'students' => [],
        'summary' => ['critical' => 0, 'at_risk' => 0, 'warning' => 0, 'avg_engagement' => 0],
        'pagination' => ['total' => 0, 'limit' => $limit, 'offset' => $offset],
        'debug' => defined('DEBUG_MODE') && DEBUG_MODE ? $e->getMessage() : null
    ]);
} catch (Exception $e) {
    error_log('At-risk students unexpected error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'An unexpected error occurred',
        'students' => [],
        'summary' => ['critical' => 0, 'at_risk' => 0, 'warning' => 0, 'avg_engagement' => 0],
        'pagination' => ['total' => 0, 'limit' => $limit, 'offset' => $offset]
    ]);
}
