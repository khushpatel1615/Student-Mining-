<?php
/**
 * Students API
 * Handles CRUD operations for student management (Admin only)
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

// Enforce Admin Role for all actions in this file
// (Or granularly per method if needed, but this file seems admin-focused)
// We'll allow GET for teachers maybe? For now, stick to Admin as per previous logic.
requireRole('admin');

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
            sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    sendError($e->getMessage(), 500);
}

/**
 * GET - List students
 */
function handleGet($pdo)
{
    $studentId = $_GET['id'] ?? null;

    if ($studentId) {
        // Get single student
        $stmt = $pdo->prepare("
            SELECT u.id, u.email, u.student_id, u.full_name, u.role, u.avatar_url, 
                   u.is_active, u.created_at, u.updated_at, u.last_login,
                   u.program_id, u.current_semester, p.name as program_name
            FROM users u
            LEFT JOIN programs p ON u.program_id = p.id
            WHERE u.id = ?
        ");
        $stmt->execute([$studentId]);
        $student = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$student) {
            sendError('Student not found', 404);
        }

        sendResponse(['success' => true, 'data' => $student]);
    } else {
        // List students
        $page = max(1, intval($_GET['page'] ?? 1));
        $limit = min(100, max(1, intval($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;

        $search = $_GET['search'] ?? '';
        $role = $_GET['role'] ?? '';
        $activeOnly = isset($_GET['active']) ? filter_var($_GET['active'], FILTER_VALIDATE_BOOLEAN) : null;

        $conditions = [];
        $params = [];

        if (!empty($search)) {
            $conditions[] = "(full_name LIKE ? OR email LIKE ? OR student_id LIKE ?)";
            $searchTerm = "%{$search}%";
            $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
        }

        if (!empty($role) && in_array($role, ['student', 'admin', 'teacher'])) {
            $conditions[] = "role = ?";
            $params[] = $role;
        }

        if ($activeOnly !== null) {
            $conditions[] = "is_active = ?";
            $params[] = $activeOnly ? 1 : 0;
        }

        $programId = $_GET['program_id'] ?? null;
        if (!empty($programId)) {
            $conditions[] = "program_id = ?";
            $params[] = $programId;
        }

        $whereClause = count($conditions) > 0 ? 'WHERE ' . implode(' AND ', $conditions) : '';

        // Total count
        $countStmt = $pdo->prepare("SELECT COUNT(*) as total FROM users $whereClause");
        $countStmt->execute($params);
        $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        // Fetch data
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

        sendResponse([
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
 * POST - Create student
 */
function handlePost($pdo)
{
    $data = getJsonInput();

    if (empty($data['email']) || empty($data['full_name'])) {
        sendError('Email and full name are required');
    }

    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        sendError('Invalid email format');
    }

    // Duplicate Email
    $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $checkStmt->execute([$data['email']]);
    if ($checkStmt->fetch()) {
        sendError('A user with this email already exists', 409);
    }

    // Duplicate Student ID
    if (!empty($data['student_id'])) {
        $checkStmt = $pdo->prepare("SELECT id FROM users WHERE student_id = ?");
        $checkStmt->execute([$data['student_id']]);
        if ($checkStmt->fetch()) {
            sendError('A user with this student ID already exists', 409);
        }
    }

    $password = $data['password'] ?? 'password123';
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // Validate Role (Ensure we allow 'teacher' now!)
    $validRoles = ['student', 'admin', 'teacher'];
    $role = in_array($data['role'] ?? 'student', $validRoles) ? ($data['role'] ?? 'student') : 'student';

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

    sendResponse([
        'success' => true,
        'message' => 'User created successfully',
        'data' => ['id' => $pdo->lastInsertId()]
    ], 201);
}

/**
 * PUT - Update student
 */
function handlePut($pdo)
{
    $data = getJsonInput();

    if (empty($data['id'])) {
        sendError('User ID is required');
    }

    // Exists check
    $checkStmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
    $checkStmt->execute([$data['id']]);
    if (!$checkStmt->fetch()) {
        sendError('User not found', 404);
    }

    $fields = [];
    $params = [];

    if (isset($data['email'])) {
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            sendError('Invalid email format');
        }
        // Unique check
        $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $checkStmt->execute([$data['email'], $data['id']]);
        if ($checkStmt->fetch()) {
            sendError('Email already in use', 409);
        }
        $fields[] = 'email = ?';
        $params[] = $data['email'];
    }

    if (isset($data['student_id'])) {
        if (!empty($data['student_id'])) {
            $checkStmt = $pdo->prepare("SELECT id FROM users WHERE student_id = ? AND id != ?");
            $checkStmt->execute([$data['student_id'], $data['id']]);
            if ($checkStmt->fetch()) {
                sendError('Student ID already in use', 409);
            }
        }
        $fields[] = 'student_id = ?';
        $params[] = $data['student_id'] ?: null;
    }

    if (isset($data['full_name'])) {
        $fields[] = 'full_name = ?';
        $params[] = $data['full_name'];
    }

    if (isset($data['role']) && in_array($data['role'], ['student', 'admin', 'teacher'])) {
        $fields[] = 'role = ?';
        $params[] = $data['role'];
    }

    if (isset($data['is_active'])) {
        $fields[] = 'is_active = ?';
        $params[] = $data['is_active'] ? 1 : 0;
    }

    if (!empty($data['password'])) {
        $fields[] = 'password_hash = ?';
        $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
    }

    if (isset($data['program_id'])) {
        $fields[] = 'program_id = ?';
        $params[] = $data['program_id'] ?: null;
    }

    if (empty($fields)) {
        sendError('No fields to update');
    }

    $params[] = $data['id'];

    $stmt = $pdo->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($params);

    sendResponse(['success' => true, 'message' => 'User updated successfully']);
}

/**
 * DELETE - Soft delete
 */
function handleDelete($pdo)
{
    $studentId = $_GET['id'] ?? null;
    if (!$studentId) {
        sendError('ID is required');
    }

    // Check self-delete
    $currentUser = getAuthUser();
    if ($currentUser && $currentUser['user_id'] == $studentId) {
        sendError('You cannot delete your own account');
    }

    $stmt = $pdo->prepare("UPDATE users SET is_active = FALSE WHERE id = ?");
    $stmt->execute([$studentId]);

    sendResponse(['success' => true, 'message' => 'User deactivated successfully']);
}
?>