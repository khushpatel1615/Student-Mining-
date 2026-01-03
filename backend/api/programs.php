<?php
/**
 * Programs API
 * Handles CRUD operations for academic programs
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

try {
    switch ($method) {
        case 'GET':
            handleGet($pdo);
            break;
        case 'POST':
            handlePost($pdo);
            break;
        case 'PUT':
            handlePut($pdo);
            break;
        case 'DELETE':
            handleDelete($pdo);
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

/**
 * GET - List all programs or single program
 */
function handleGet($pdo)
{
    $programId = $_GET['id'] ?? null;

    if ($programId) {
        // Get single program with subject count
        $stmt = $pdo->prepare("
            SELECT p.*, 
                   COUNT(DISTINCT s.id) as total_subjects,
                   COUNT(DISTINCT CASE WHEN s.subject_type = 'Core' THEN s.id END) as core_subjects,
                   COUNT(DISTINCT CASE WHEN s.subject_type = 'Elective' THEN s.id END) as elective_subjects
            FROM programs p
            LEFT JOIN subjects s ON p.id = s.program_id AND s.is_active = TRUE
            WHERE p.id = ?
            GROUP BY p.id
        ");
        $stmt->execute([$programId]);
        $program = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$program) {
            http_response_code(404);
            echo json_encode(['error' => 'Program not found']);
            return;
        }

        echo json_encode(['success' => true, 'data' => $program]);
    } else {
        // List all programs
        $activeOnly = isset($_GET['active']) ? filter_var($_GET['active'], FILTER_VALIDATE_BOOLEAN) : true;

        $sql = "
            SELECT p.*, 
                   COUNT(DISTINCT s.id) as total_subjects
            FROM programs p
            LEFT JOIN subjects s ON p.id = s.program_id AND s.is_active = TRUE
        ";

        if ($activeOnly) {
            $sql .= " WHERE p.is_active = TRUE";
        }

        $sql .= " GROUP BY p.id ORDER BY p.name ASC";

        $stmt = $pdo->query($sql);
        $programs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $programs]);
    }
}

/**
 * POST - Create new program (Admin only)
 */
function handlePost($pdo)
{
    // Verify admin token
    $user = verifyAdminToken();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized. Admin access required.']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    if (empty($data['name']) || empty($data['code'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Name and code are required']);
        return;
    }

    $stmt = $pdo->prepare("
        INSERT INTO programs (name, code, duration_years, total_semesters, description)
        VALUES (?, ?, ?, ?, ?)
    ");

    $stmt->execute([
        $data['name'],
        strtoupper($data['code']),
        $data['duration_years'] ?? 3,
        $data['total_semesters'] ?? 6,
        $data['description'] ?? null
    ]);

    $programId = $pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'message' => 'Program created successfully',
        'data' => ['id' => $programId]
    ]);
}

/**
 * PUT - Update program (Admin only)
 */
function handlePut($pdo)
{
    $user = verifyAdminToken();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized. Admin access required.']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Program ID is required']);
        return;
    }

    $fields = [];
    $params = [];

    if (isset($data['name'])) {
        $fields[] = 'name = ?';
        $params[] = $data['name'];
    }
    if (isset($data['code'])) {
        $fields[] = 'code = ?';
        $params[] = strtoupper($data['code']);
    }
    if (isset($data['duration_years'])) {
        $fields[] = 'duration_years = ?';
        $params[] = $data['duration_years'];
    }
    if (isset($data['total_semesters'])) {
        $fields[] = 'total_semesters = ?';
        $params[] = $data['total_semesters'];
    }
    if (isset($data['description'])) {
        $fields[] = 'description = ?';
        $params[] = $data['description'];
    }
    if (isset($data['is_active'])) {
        $fields[] = 'is_active = ?';
        $params[] = $data['is_active'] ? 1 : 0;
    }

    if (empty($fields)) {
        http_response_code(400);
        echo json_encode(['error' => 'No fields to update']);
        return;
    }

    $params[] = $data['id'];

    $stmt = $pdo->prepare("UPDATE programs SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($params);

    echo json_encode(['success' => true, 'message' => 'Program updated successfully']);
}

/**
 * DELETE - Delete program (Admin only)
 */
function handleDelete($pdo)
{
    $user = verifyAdminToken();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized. Admin access required.']);
        return;
    }

    $programId = $_GET['id'] ?? null;

    if (!$programId) {
        http_response_code(400);
        echo json_encode(['error' => 'Program ID is required']);
        return;
    }

    // Soft delete by setting is_active to false
    $stmt = $pdo->prepare("UPDATE programs SET is_active = FALSE WHERE id = ?");
    $stmt->execute([$programId]);

    echo json_encode(['success' => true, 'message' => 'Program deleted successfully']);
}

/**
 * Helper: Verify admin token
 */
function verifyAdminToken()
{
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return null;
    }

    $token = $matches[1];
    $result = verifyToken($token);

    if (!$result['valid'] || $result['payload']['role'] !== 'admin') {
        return null;
    }

    return $result['payload'];
}
