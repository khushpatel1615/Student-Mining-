<?php
/**
 * Academic Calendar API
 * Fetches upcoming academic events
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

try {
    if ($method === 'GET') {
        handleGet($pdo);
    } elseif ($method === 'POST') {
        handlePost($pdo);
    } elseif ($method === 'PUT') {
        handlePut($pdo);
    } elseif ($method === 'DELETE') {
        handleDelete($pdo);
    } elseif ($method === 'OPTIONS') {
        http_response_code(200);
        exit();
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function handleGet($pdo)
{
    // 1. Verify User
    $token = getTokenFromHeader();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'No token provided']);
        return;
    }

    $result = verifyToken($token);
    if (!$result['valid']) {
        http_response_code(401);
        echo json_encode(['error' => $result['error']]);
        return;
    }

    $user = $result['payload'];
    $role = $user['role'];
    $userId = $user['id'];

    // 2. Build Query based on Role
    $sql = "SELECT ac.*, s.name as subject_name 
            FROM academic_calendar ac
            LEFT JOIN subjects s ON ac.target_subject_id = s.id 
            WHERE 1=1 ";
    $params = [];

    // Admins see everything
    if ($role === 'admin') {
        // No filter needed
        $sql .= " ORDER BY ac.event_date ASC";
    } elseif ($role === 'student') {
        $sql .= " AND (ac.target_audience IN ('all', 'students') ";

        // Fetch student details to filter by program/semester
        $stmtUser = $pdo->prepare("SELECT program_id, current_semester FROM users WHERE id = ? AND role = 'student'");
        $stmtUser->execute([$userId]);
        $studentData = $stmtUser->fetch(PDO::FETCH_ASSOC);

        if ($studentData) {
            // Match department events if the student has a program_id (treating program as department)
            if ($studentData['program_id']) {
                $sql .= " OR (ac.target_audience = 'department' AND ac.target_dept_id = ?) ";
                $params[] = $studentData['program_id'];

                $sql .= " OR (ac.target_audience = 'program' AND ac.target_program_id = ?) ";
                $params[] = $studentData['program_id'];

                // New: Program + Semester specific
                if ($studentData['current_semester']) {
                    $sql .= " OR (ac.target_audience = 'program_semester' AND ac.target_program_id = ? AND ac.target_semester = ?) ";
                    $params[] = $studentData['program_id'];
                    $params[] = $studentData['current_semester'];
                }
            }

            // Match semester-specific events (Global semester)
            if ($studentData['current_semester']) {
                $sql .= " OR (ac.target_audience = 'semester' AND ac.target_semester = ?) ";
                $params[] = $studentData['current_semester'];
            }
        }
        $sql .= ")";
        $sql .= " ORDER BY ac.event_date ASC";
    } else {
        $sql .= " ORDER BY ac.event_date ASC";
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $events
    ]);
}

function handlePost($pdo)
{
    // Verify User
    $token = getTokenFromHeader();
    $result = verifyToken($token);
    if (!$result['valid']) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $user = $result['payload'];
    $role = $user['role'];
    $userId = $user['id'];

    if (!in_array($role, ['admin', 'teacher'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $data = json_decode(file_get_contents("php://input"), true);

    // Validate Basic Fields
    if (empty($data['title']) || empty($data['event_date']) || empty($data['type'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        return;
    }

    // Role-Based Validation
    if ($role === 'teacher') {
        // Teacher can ONLY post 'assignment' or 'event'
        if (!in_array($data['type'], ['assignment', 'event'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Teachers can only post Assignments or Events']);
            return;
        }

        // Teacher MUST target a subject they are assigned to
        if ($data['target_audience'] !== 'subject' || empty($data['target_subject_id'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Teachers must select a specific subject']);
            return;
        }

        // Verify assignment
        $stmt = $pdo->prepare("SELECT 1 FROM teacher_subjects WHERE teacher_id = ? AND subject_id = ?");
        $stmt->execute([$userId, $data['target_subject_id']]);
        if (!$stmt->fetch()) {
            http_response_code(403);
            echo json_encode(['error' => 'You are not assigned to this subject']);
            return;
        }
    }

    $stmt = $pdo->prepare("INSERT INTO academic_calendar 
        (title, event_date, type, description, target_audience, target_dept_id, target_program_id, target_semester, target_subject_id, created_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    $stmt->execute([
        $data['title'],
        $data['event_date'],
        $data['type'],
        $data['description'] ?? '',
        $data['target_audience'] ?? 'all',
        $data['target_dept_id'] ?? null,
        $data['target_program_id'] ?? null,
        $data['target_semester'] ?? null,
        $data['target_subject_id'] ?? null,
        $userId // created_by
    ]);

    echo json_encode(['success' => true, 'message' => 'Event created']);
}

function handlePut($pdo)
{
    // Verify User
    $token = getTokenFromHeader();
    $result = verifyToken($token);
    if (!$result['valid']) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $user = $result['payload'];
    $role = $user['role'];
    $userId = $user['id'];

    $data = json_decode(file_get_contents("php://input"), true);

    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing Event ID']);
        return;
    }

    // Check Existence & Ownership
    $stmt = $pdo->prepare("SELECT created_by FROM academic_calendar WHERE id = ?");
    $stmt->execute([$data['id']]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$event) {
        http_response_code(404);
        echo json_encode(['error' => 'Event not found']);
        return;
    }

    // Auth Check
    if ($role !== 'admin' && $event['created_by'] != $userId) {
        http_response_code(403);
        echo json_encode(['error' => 'You can only edit your own events']);
        return;
    }

    // Build Dynamic Update
    $updates = [];
    $params = [];

    // Allowed fields to update
    $allowed = ['title', 'event_date', 'description', 'type', 'target_audience', 'target_dept_id', 'target_program_id', 'target_semester', 'target_subject_id'];

    foreach ($allowed as $field) {
        if (isset($data[$field])) {
            $updates[] = "$field = ?";
            $params[] = $data[$field];
        }
    }

    if (empty($updates)) {
        echo json_encode(['success' => true, 'message' => 'No changes made']);
        return;
    }

    $params[] = $data['id'];
    $sql = "UPDATE academic_calendar SET " . implode(', ', $updates) . " WHERE id = ?";

    $pdo->prepare($sql)->execute($params);
    echo json_encode(['success' => true, 'message' => 'Event updated']);
}

function handleDelete($pdo)
{
    // Verify User
    $token = getTokenFromHeader();
    $result = verifyToken($token);
    if (!$result['valid']) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $user = $result['payload'];
    $role = $user['role'];
    $userId = $user['id'];

    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing ID']);
        return;
    }

    // Check ownership
    $stmt = $pdo->prepare("SELECT created_by FROM academic_calendar WHERE id = ?");
    $stmt->execute([$id]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$event) {
        http_response_code(404);
        echo json_encode(['error' => 'Event not found']);
        return;
    }

    // Admin can delete anything. Authors can delete their own.
    if ($role !== 'admin' && $event['created_by'] != $userId) {
        http_response_code(403);
        echo json_encode(['error' => 'You can only delete your own events']);
        return;
    }

    $pdo->prepare("DELETE FROM academic_calendar WHERE id = ?")->execute([$id]);
    echo json_encode(['success' => true]);
}
?>