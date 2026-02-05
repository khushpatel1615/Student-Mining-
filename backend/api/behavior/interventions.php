<?php
/**
 * Learning Behavior Analysis - Interventions API
 * 
 * POST /api/behavior/interventions.php - Create intervention
 * GET /api/behavior/interventions.php - List interventions
 * PUT /api/behavior/interventions.php?id=123 - Update intervention
 */

require_once __DIR__ . '/../../includes/jwt.php';
require_once __DIR__ . '/../../config/database.php';

setCORSHeaders();

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
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

// Students cannot manage interventions
if ($userRole === 'student') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Forbidden - Insufficient permissions']);
    exit;
}

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'POST':
            createIntervention($pdo, $userId, $userRole);
            break;
        case 'GET':
            getInterventions($pdo, $userId, $userRole);
            break;
        case 'PUT':
            $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Intervention ID required']);
                exit;
            }
            updateIntervention($pdo, $userId, $userRole, $id);
            break;
        case 'DELETE':
            $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Intervention ID required']);
                exit;
            }
            deleteIntervention($pdo, $userId, $userRole, $id);
            break;
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    error_log('Interventions API error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error']);
}

/**
 * Create a new intervention
 */
function createIntervention($pdo, $userId, $userRole)
{
    $input = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    $required = ['student_id', 'intervention_type', 'title'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Missing required field: $field"]);
            exit;
        }
    }

    // Validate intervention type
    $validTypes = ['email', 'message', 'meeting', 'call', 'warning', 'support_referral', 'grade_recovery', 'schedule_change', 'other'];
    if (!in_array($input['intervention_type'], $validTypes)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid intervention type']);
        exit;
    }

    // Teachers can only create interventions for their students (simplified check)
    // In production, you'd verify teacher-student relationship via enrollments

    $stmt = $pdo->prepare('
        INSERT INTO interventions 
        (student_id, created_by, intervention_type, title, description, 
         notes, follow_up_date, follow_up_required, triggered_by_risk_score, 
         risk_factors_identified, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ');

    $stmt->execute([
        (int) $input['student_id'],
        $userId,
        $input['intervention_type'],
        $input['title'],
        $input['description'] ?? null,
        $input['notes'] ?? null,
        $input['follow_up_date'] ?? null,
        isset($input['follow_up_required']) ? (int) $input['follow_up_required'] : 0,
        $input['triggered_by_risk_score'] ?? null,
        isset($input['risk_factors']) ? json_encode($input['risk_factors']) : null
    ]);

    $interventionId = $pdo->lastInsertId();

    // Log this action
    logInterventionActivity($pdo, $userId, 'create', $interventionId, $input['student_id']);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'intervention_id' => $interventionId,
        'message' => 'Intervention created successfully'
    ]);
}

/**
 * Get interventions with filtering
 */
function getInterventions($pdo, $userId, $userRole)
{
    $studentId = isset($_GET['student_id']) ? (int) $_GET['student_id'] : null;
    $status = isset($_GET['status']) ? $_GET['status'] : null;
    $type = isset($_GET['type']) ? $_GET['type'] : null;
    $limit = isset($_GET['limit']) ? min((int) $_GET['limit'], 100) : 50;
    $offset = isset($_GET['offset']) ? (int) $_GET['offset'] : 0;

    $query = '
        SELECT 
            i.*,
            u_student.full_name as student_name,
            u_student.email as student_email,
            u_student.student_id as student_enrollment_id,
            u_creator.full_name as created_by_name
        FROM interventions i
        JOIN users u_student ON i.student_id = u_student.id
        LEFT JOIN users u_creator ON i.created_by = u_creator.id
        WHERE 1=1
    ';
    $params = [];

    // Filter by student
    if ($studentId) {
        $query .= ' AND i.student_id = ?';
        $params[] = $studentId;
    }

    // Teachers can only see interventions they created (unless admin)
    if ($userRole !== 'admin') {
        $query .= ' AND i.created_by = ?';
        $params[] = $userId;
    }

    // Filter by status
    if ($status) {
        $query .= ' AND i.status = ?';
        $params[] = $status;
    }

    // Filter by type
    if ($type) {
        $query .= ' AND i.intervention_type = ?';
        $params[] = $type;
    }

    $query .= ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
    $params[] = $limit;
    $params[] = $offset;

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $interventions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Parse JSON fields
    foreach ($interventions as &$intervention) {
        if (isset($intervention['risk_factors_identified']) && $intervention['risk_factors_identified']) {
            $intervention['risk_factors_identified'] = json_decode($intervention['risk_factors_identified'], true);
        }
    }

    // Get total count (without limit/offset)
    $countQuery = str_replace('SELECT i.*', 'SELECT COUNT(*) as total', $query);
    $countQuery = preg_replace('/LIMIT \? OFFSET \?/', '', $countQuery);
    $countParams = array_slice($params, 0, -2);
    $countStmt = $pdo->prepare($countQuery);
    $countStmt->execute($countParams);
    $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

    echo json_encode([
        'success' => true,
        'interventions' => $interventions,
        'pagination' => [
            'total' => (int) $total,
            'limit' => $limit,
            'offset' => $offset
        ]
    ]);
}

/**
 * Update an intervention
 */
function updateIntervention($pdo, $userId, $userRole, $interventionId)
{
    $input = json_decode(file_get_contents('php://input'), true);

    // Check if intervention exists and user has permission
    $stmt = $pdo->prepare('SELECT * FROM interventions WHERE id = ?');
    $stmt->execute([$interventionId]);
    $intervention = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$intervention) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Intervention not found']);
        exit;
    }

    // Teachers can only update their own interventions
    if ($userRole !== 'admin' && $intervention['created_by'] != $userId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Forbidden']);
        exit;
    }

    $allowedFields = ['status', 'outcome_description', 'effectiveness_rating', 'notes', 'follow_up_date', 'follow_up_required'];
    $updates = [];
    $params = [];

    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updates[] = "$field = ?";
            $params[] = $input[$field];
        }
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No valid fields to update']);
        exit;
    }

    // Set closed_at if status is being changed to closed/successful/unsuccessful
    if (isset($input['status']) && in_array($input['status'], ['closed', 'successful', 'unsuccessful'])) {
        $updates[] = 'closed_at = NOW()';
    }

    $updates[] = 'updated_at = NOW()';
    $params[] = $interventionId;

    $query = 'UPDATE interventions SET ' . implode(', ', $updates) . ' WHERE id = ?';
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);

    // Log this action
    logInterventionActivity($pdo, $userId, 'update', $interventionId, $intervention['student_id']);

    echo json_encode([
        'success' => true,
        'intervention_id' => $interventionId,
        'message' => 'Intervention updated successfully'
    ]);
}

/**
 * Delete an intervention (admin only)
 */
function deleteIntervention($pdo, $userId, $userRole, $interventionId)
{
    if ($userRole !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Only admins can delete interventions']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT student_id FROM interventions WHERE id = ?');
    $stmt->execute([$interventionId]);
    $intervention = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$intervention) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Intervention not found']);
        exit;
    }

    $stmt = $pdo->prepare('DELETE FROM interventions WHERE id = ?');
    $stmt->execute([$interventionId]);

    // Log this action
    logInterventionActivity($pdo, $userId, 'delete', $interventionId, $intervention['student_id']);

    echo json_encode([
        'success' => true,
        'message' => 'Intervention deleted successfully'
    ]);
}

/**
 * Log intervention activity
 */
function logInterventionActivity($pdo, $userId, $action, $interventionId, $studentId)
{
    try {
        $stmt = $pdo->prepare('
            INSERT INTO activity_logs (user_id, action, details, created_at)
            VALUES (?, ?, ?, NOW())
        ');
        $stmt->execute([
            $userId,
            "intervention_$action",
            json_encode(['intervention_id' => $interventionId, 'student_id' => $studentId])
        ]);
    } catch (Exception $e) {
        // Silently fail - don't block the main operation
        error_log('Failed to log intervention activity: ' . $e->getMessage());
    }
}
