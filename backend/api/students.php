<?php
/**
 * Students API
 * Handles CRUD operations for student management (Admin only)
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
 * GET - List students with pagination, search, and filters
 */
function handleGet($pdo)
{
    $user = verifyAdminToken();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized. Admin access required.']);
        return;
    }

    $studentId = $_GET['id'] ?? null;

    if ($studentId) {
        // Get single student
        $stmt = $pdo->prepare("
            SELECT id, email, student_id, full_name, role, avatar_url, 
                   is_active, created_at, updated_at, last_login
            FROM users 
            WHERE id = ?
        ");
        $stmt->execute([$studentId]);
        $student = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$student) {
            http_response_code(404);
            echo json_encode(['error' => 'Student not found']);
            return;
        }

        echo json_encode(['success' => true, 'data' => $student]);
    } else {
        // List students with pagination and filters
        $page = max(1, intval($_GET['page'] ?? 1));
        $limit = min(100, max(1, intval($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;

        $search = $_GET['search'] ?? '';
        $role = $_GET['role'] ?? '';
        $activeOnly = isset($_GET['active']) ? filter_var($_GET['active'], FILTER_VALIDATE_BOOLEAN) : null;

        $conditions = [];
        $params = [];

        // Search filter
        if (!empty($search)) {
            $conditions[] = "(full_name LIKE ? OR email LIKE ? OR student_id LIKE ?)";
            $searchTerm = "%{$search}%";
            $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
        }

        // Role filter
        if (!empty($role) && in_array($role, ['student', 'admin'])) {
            $conditions[] = "role = ?";
            $params[] = $role;
        }

        // Active filter
        if ($activeOnly !== null) {
            $conditions[] = "is_active = ?";
            $params[] = $activeOnly ? 1 : 0;
        }

        // Program filter
        $programId = $_GET['program_id'] ?? null;
        if (!empty($programId)) {
            $conditions[] = "program_id = ?";
            $params[] = $programId;
        }

        $whereClause = count($conditions) > 0 ? 'WHERE ' . implode(' AND ', $conditions) : '';

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM users $whereClause";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        // Get students
        $sql = "
            SELECT u.id, u.email, u.student_id, u.full_name, u.role, u.avatar_url, 
                   u.is_active, u.created_at, u.updated_at, u.last_login,
                   p.code as program_code
            FROM users u
            LEFT JOIN programs p ON u.program_id = p.id
            $whereClause
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
        ";

        $params[] = $limit;
        $params[] = $offset;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $students,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => intval($total),
                'totalPages' => ceil($total / $limit)
            ]
        ]);
    }
}

/**
 * POST - Create new student
 */
function handlePost($pdo)
{
    $user = verifyAdminToken();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized. Admin access required.']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    if (empty($data['email']) || empty($data['full_name'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Email and full name are required']);
        return;
    }

    // Validate email format
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid email format']);
        return;
    }

    // Check for duplicate email
    $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $checkStmt->execute([$data['email']]);
    if ($checkStmt->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'A user with this email already exists']);
        return;
    }

    // Check for duplicate student_id if provided
    if (!empty($data['student_id'])) {
        $checkStmt = $pdo->prepare("SELECT id FROM users WHERE student_id = ?");
        $checkStmt->execute([$data['student_id']]);
        if ($checkStmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'A user with this student ID already exists']);
            return;
        }
    }

    // Hash password if provided, otherwise set a default
    $password = $data['password'] ?? 'password123';
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    $role = in_array($data['role'] ?? 'student', ['student', 'admin']) ? ($data['role'] ?? 'student') : 'student';

    $stmt = $pdo->prepare("
        INSERT INTO users (email, student_id, password_hash, full_name, role, is_active, program_id)
        VALUES (?, ?, ?, ?, ?, TRUE, ?)
    ");

    $stmt->execute([
        $data['email'],
        $data['student_id'] ?? null,
        $passwordHash,
        $data['full_name'],
        $role,
        $data['program_id'] ?? null
    ]);

    $newId = $pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'message' => 'Student created successfully',
        'data' => ['id' => $newId]
    ]);
}

/**
 * PUT - Update student
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
        echo json_encode(['error' => 'Student ID is required']);
        return;
    }

    // Check if student exists
    $checkStmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
    $checkStmt->execute([$data['id']]);
    if (!$checkStmt->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'Student not found']);
        return;
    }

    $fields = [];
    $params = [];

    if (isset($data['email'])) {
        // Validate email format
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid email format']);
            return;
        }
        // Check for duplicate email
        $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $checkStmt->execute([$data['email'], $data['id']]);
        if ($checkStmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'A user with this email already exists']);
            return;
        }
        $fields[] = 'email = ?';
        $params[] = $data['email'];
    }

    if (isset($data['student_id'])) {
        // Check for duplicate student_id
        if (!empty($data['student_id'])) {
            $checkStmt = $pdo->prepare("SELECT id FROM users WHERE student_id = ? AND id != ?");
            $checkStmt->execute([$data['student_id'], $data['id']]);
            if ($checkStmt->fetch()) {
                http_response_code(409);
                echo json_encode(['error' => 'A user with this student ID already exists']);
                return;
            }
        }
        $fields[] = 'student_id = ?';
        $params[] = $data['student_id'] ?: null;
    }

    if (isset($data['full_name'])) {
        $fields[] = 'full_name = ?';
        $params[] = $data['full_name'];
    }

    if (isset($data['role']) && in_array($data['role'], ['student', 'admin'])) {
        $fields[] = 'role = ?';
        $params[] = $data['role'];
    }

    if (isset($data['is_active'])) {
        $fields[] = 'is_active = ?';
        $params[] = $data['is_active'] ? 1 : 0;
    }

    if (isset($data['password']) && !empty($data['password'])) {
        $fields[] = 'password_hash = ?';
        $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
    }

    if (isset($data['program_id'])) {
        $fields[] = 'program_id = ?';
        $params[] = $data['program_id'] ?: null;
    }

    if (empty($fields)) {
        http_response_code(400);
        echo json_encode(['error' => 'No fields to update']);
        return;
    }

    $params[] = $data['id'];

    $stmt = $pdo->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($params);

    echo json_encode(['success' => true, 'message' => 'Student updated successfully']);
}

/**
 * DELETE - Soft delete student
 */
function handleDelete($pdo)
{
    $user = verifyAdminToken();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized. Admin access required.']);
        return;
    }

    $studentId = $_GET['id'] ?? null;

    if (!$studentId) {
        http_response_code(400);
        echo json_encode(['error' => 'Student ID is required']);
        return;
    }

    // Check if student exists
    $checkStmt = $pdo->prepare("SELECT id, role FROM users WHERE id = ?");
    $checkStmt->execute([$studentId]);
    $student = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) {
        http_response_code(404);
        echo json_encode(['error' => 'Student not found']);
        return;
    }

    // Prevent deleting yourself
    if ($student['id'] == $user['sub']) {
        http_response_code(400);
        echo json_encode(['error' => 'You cannot delete your own account']);
        return;
    }

    // Soft delete by setting is_active to false
    $stmt = $pdo->prepare("UPDATE users SET is_active = FALSE WHERE id = ?");
    $stmt->execute([$studentId]);

    echo json_encode(['success' => true, 'message' => 'Student deactivated successfully']);
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
