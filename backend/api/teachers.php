<?php
/**
 * Teachers API - Manage teacher assignments to subjects
 * 
 * GET    /teachers.php              - List all teachers
 * GET    /teachers.php?id=X         - Get teacher details with assigned subjects
 * POST   /teachers.php              - Assign subject to teacher (admin only)
 * DELETE /teachers.php?id=X         - Remove subject assignment (admin only)
 */

require_once __DIR__ . '/../includes/jwt.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Verify authentication
$user = requireAuth();
$userId = $user['user_id'];
$userRole = $user['role'];

try {
    $pdo = getDBConnection();

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            handleGet($pdo, $userId, $userRole);
            break;
        case 'POST':
            handlePost($pdo, $userId, $userRole);
            break;
        case 'DELETE':
            handleDelete($pdo, $userId, $userRole);
            break;
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function handleGet($pdo, $userId, $userRole)
{
    $teacherId = $_GET['id'] ?? null;

    if ($teacherId) {
        // Get specific teacher with their assigned subjects
        $stmt = $pdo->prepare("
            SELECT u.id, u.full_name, u.email, u.avatar_url, u.created_at
            FROM users u
            WHERE u.id = ? AND u.role = 'teacher'
        ");
        $stmt->execute([$teacherId]);
        $teacher = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$teacher) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Teacher not found']);
            return;
        }

        // Get assigned subjects
        $stmt = $pdo->prepare("
            SELECT s.id, s.name, s.code, s.semester, s.credits, p.name as program_name, ts.assigned_at
            FROM teacher_subjects ts
            JOIN subjects s ON ts.subject_id = s.id
            JOIN programs p ON s.program_id = p.id
            WHERE ts.teacher_id = ?
            ORDER BY p.name, s.semester, s.name
        ");
        $stmt->execute([$teacherId]);
        $teacher['assigned_subjects'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $teacher]);
    } else {
        // List all teachers
        $stmt = $pdo->query("
            SELECT u.id, u.full_name, u.email, u.avatar_url, u.created_at
            FROM users u
            WHERE u.role = 'teacher'
            ORDER BY u.full_name
        ");
        $teachers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!empty($teachers)) {
            $teacherIds = array_column($teachers, 'id');
            $placeholders = str_repeat('?,', count($teacherIds) - 1) . '?';

            $sql = "SELECT ts.teacher_id, s.id, s.name, s.code, s.semester, s.credits, p.name as program_name, ts.assigned_at
                    FROM teacher_subjects ts
                    JOIN subjects s ON ts.subject_id = s.id
                    JOIN programs p ON s.program_id = p.id
                    WHERE ts.teacher_id IN ($placeholders)
                    ORDER BY p.name, s.semester, s.name";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($teacherIds);
            $allAssignments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $assignmentsMap = [];
            foreach ($allAssignments as $assign) {
                $assignmentsMap[$assign['teacher_id']][] = $assign;
            }

            foreach ($teachers as &$teacher) {
                $teacher['assigned_subjects'] = $assignmentsMap[$teacher['id']] ?? [];
                $teacher['subject_count'] = count($teacher['assigned_subjects']);
            }
        }

        echo json_encode(['success' => true, 'data' => $teachers]);
    }
}

function handlePost($pdo, $userId, $userRole)
{
    // Only admin can manage teachers
    if ($userRole !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Only admins can manage teachers']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? 'assign';

    // Handle creating a new teacher
    if ($action === 'create') {
        $email = trim($data['email'] ?? '');
        $fullName = trim($data['full_name'] ?? '');
        $teacherId = trim($data['teacher_id'] ?? '');

        if (empty($email) || empty($fullName)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Email and full name are required']);
            return;
        }

        // Validate email format
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid email format']);
            return;
        }

        // Check if email already exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'A user with this email already exists']);
            return;
        }

        // Default password: teacher1234
        $defaultPassword = password_hash('teacher1234', PASSWORD_BCRYPT);

        // Generate teacher ID if not provided
        if (empty($teacherId)) {
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM users WHERE role = 'teacher'");
            $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            $teacherId = 'TCH' . str_pad($count + 1, 3, '0', STR_PAD_LEFT);
        }

        try {
            $stmt = $pdo->prepare("
                INSERT INTO users (email, student_id, password_hash, full_name, role) 
                VALUES (?, ?, ?, ?, 'teacher')
            ");
            $stmt->execute([$email, $teacherId, $defaultPassword, $fullName]);

            echo json_encode([
                'success' => true,
                'message' => 'Teacher created successfully. Default password is: teacher1234',
                'id' => $pdo->lastInsertId(),
                'teacher_id' => $teacherId
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to create teacher: ' . $e->getMessage()]);
        }
        return;
    }

    // Handle assigning subject to teacher (existing functionality)
    $teacherId = $data['teacher_id'] ?? null;
    $subjectId = $data['subject_id'] ?? null;

    if (!$teacherId || !$subjectId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'teacher_id and subject_id are required']);
        return;
    }

    // Verify teacher exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role = 'teacher'");
    $stmt->execute([$teacherId]);
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Teacher not found']);
        return;
    }

    // Verify subject exists
    $stmt = $pdo->prepare("SELECT id FROM subjects WHERE id = ?");
    $stmt->execute([$subjectId]);
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Subject not found']);
        return;
    }

    // Create assignment
    try {
        $stmt = $pdo->prepare("INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)");
        $stmt->execute([$teacherId, $subjectId]);

        echo json_encode([
            'success' => true,
            'message' => 'Subject assigned to teacher successfully',
            'id' => $pdo->lastInsertId()
        ]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) { // Duplicate entry
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'This subject is already assigned to this teacher']);
        } else {
            throw $e;
        }
    }
}

function handleDelete($pdo, $userId, $userRole)
{
    // Only admin can remove assignments
    if ($userRole !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Only admins can remove subject assignments']);
        return;
    }

    $assignmentId = $_GET['id'] ?? null;
    $teacherId = $_GET['teacher_id'] ?? null;
    $subjectId = $_GET['subject_id'] ?? null;

    // Support deletion by teacher_id and subject_id
    if ($teacherId && $subjectId) {
        $stmt = $pdo->prepare("DELETE FROM teacher_subjects WHERE teacher_id = ? AND subject_id = ?");
        $stmt->execute([$teacherId, $subjectId]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Assignment removed successfully']);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Assignment not found']);
        }
        return;
    }

    // Support deletion by assignment ID
    if ($assignmentId) {
        $stmt = $pdo->prepare("DELETE FROM teacher_subjects WHERE id = ?");
        $stmt->execute([$assignmentId]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Assignment removed successfully']);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Assignment not found']);
        }
        return;
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Assignment ID or teacher_id and subject_id are required']);
}
