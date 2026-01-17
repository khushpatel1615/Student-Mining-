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
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $role = $user['role'];
    $userId = $user['user_id'];

    // 2. Build Query based on Role
    $sql = "SELECT ac.id, ac.title, ac.event_date, ac.type, ac.description, ac.target_audience, 
                   ac.target_program_id, ac.target_semester, ac.target_subject_id, 
                   ac.created_by, s.name as subject_name 
            FROM academic_calendar ac
            LEFT JOIN subjects s ON ac.target_subject_id = s.id 
            WHERE 1=1 ";
    $params = [];
    $extraEvents = [];

    // Admins see everything
    if ($role === 'admin') {
        // No filter needed for calendar events

        // Fetch ALL Assignments
        $stmtEx = $pdo->query("SELECT a.id, a.title, DATE(a.due_date) as event_date, 'assignment' as type, 
                              a.description, s.name as subject_name 
                              FROM assignments a
                              JOIN subjects s ON a.subject_id = s.id");
        while ($row = $stmtEx->fetch(PDO::FETCH_ASSOC)) {
            $row['id'] = 'assign_' . $row['id']; // Avoid ID collision
            $row['target_audience'] = 'subject';
            $extraEvents[] = $row;
        }

        // Fetch ALL Exams
        $stmtEx = $pdo->query("SELECT e.id, e.title, DATE(e.start_datetime) as event_date, 'exam' as type, 
                              'Exam' as description, s.name as subject_name 
                              FROM exams e
                              JOIN subjects s ON e.subject_id = s.id");
        while ($row = $stmtEx->fetch(PDO::FETCH_ASSOC)) {
            $row['id'] = 'exam_' . $row['id'];
            $row['target_audience'] = 'subject';
            $extraEvents[] = $row;
        }

    } elseif ($role === 'student') {
        $sql .= " AND (ac.target_audience IN ('all', 'students') ";

        // Fetch student details to filter by program/semester
        $stmtUser = $pdo->prepare("SELECT program_id, current_semester FROM users WHERE id = ? AND role = 'student'");
        $stmtUser->execute([$userId]);
        $studentData = $stmtUser->fetch(PDO::FETCH_ASSOC);

        $enrolledSubjectIds = [];
        // Get enrolled subjects for fetching specific assignments/exams
        $stmtSubs = $pdo->prepare("SELECT subject_id FROM student_enrollments WHERE user_id = ? AND status = 'active'");
        $stmtSubs->execute([$user['id']]); // Use user['id'] from token payload which is the ID in users table
        $enrolledSubjectIds = $stmtSubs->fetchAll(PDO::FETCH_COLUMN);

        if ($studentData) {
            // Match program events if the student has a program_id
            if ($studentData['program_id']) {
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

        // Match subject specific events
        if (!empty($enrolledSubjectIds)) {
            $inQuery = implode(',', array_fill(0, count($enrolledSubjectIds), '?'));
            $sql .= " OR (ac.target_audience = 'subject' AND ac.target_subject_id IN ($inQuery)) ";
            foreach ($enrolledSubjectIds as $sid) {
                $params[] = $sid;
            }
        }

        $sql .= ")";

        // Fetch Assignments for enrolled subjects
        if (!empty($enrolledSubjectIds)) {
            $inQuery = implode(',', array_fill(0, count($enrolledSubjectIds), '?'));

            $stmtEx = $pdo->prepare("SELECT a.id, a.title, DATE(a.due_date) as event_date, 'assignment' as type, 
                                     a.description, s.name as subject_name 
                                     FROM assignments a
                                     JOIN subjects s ON a.subject_id = s.id
                                     WHERE a.subject_id IN ($inQuery)");
            $stmtEx->execute($enrolledSubjectIds);
            while ($row = $stmtEx->fetch(PDO::FETCH_ASSOC)) {
                $row['id'] = 'assign_' . $row['id'];
                $row['target_audience'] = 'subject';
                $extraEvents[] = $row;
            }

            // Fetch Exams for enrolled subjects
            $stmtEx = $pdo->prepare("SELECT e.id, e.title, DATE(e.start_datetime) as event_date, 'exam' as type, 
                                     'Exam' as description, s.name as subject_name 
                                     FROM exams e
                                     JOIN subjects s ON e.subject_id = s.id
                                     WHERE e.subject_id IN ($inQuery)");
            $stmtEx->execute($enrolledSubjectIds);
            while ($row = $stmtEx->fetch(PDO::FETCH_ASSOC)) {
                $row['id'] = 'exam_' . $row['id'];
                $row['target_audience'] = 'subject';
                $extraEvents[] = $row;
            }
        }

    } elseif ($role === 'teacher') {
        // Teacher sees all/teacher events OR events for their subjects
        $sql .= " AND (ac.target_audience IN ('all', 'teachers') ";

        // Get subjects taught by teacher
        $stmtSubs = $pdo->prepare("SELECT subject_id FROM teacher_subjects WHERE teacher_id = ?");
        $stmtSubs->execute([$userId]);
        $teacherSubjectIds = $stmtSubs->fetchAll(PDO::FETCH_COLUMN);

        if (!empty($teacherSubjectIds)) {
            $inQuery = implode(',', array_fill(0, count($teacherSubjectIds), '?'));
            $sql .= " OR (ac.target_audience = 'subject' AND ac.target_subject_id IN ($inQuery)) ";
            foreach ($teacherSubjectIds as $sid) {
                $params[] = $sid;
            }
        }
        $sql .= ")";

        // Fetch Assignments created by this teacher (via subjects)
        if (!empty($teacherSubjectIds)) {
            $inQuery = implode(',', array_fill(0, count($teacherSubjectIds), '?'));

            $stmtEx = $pdo->prepare("SELECT a.id, a.title, DATE(a.due_date) as event_date, 'assignment' as type, 
                                     a.description, s.name as subject_name 
                                     FROM assignments a
                                     JOIN subjects s ON a.subject_id = s.id
                                     WHERE a.subject_id IN ($inQuery)");
            $stmtEx->execute($teacherSubjectIds);
            while ($row = $stmtEx->fetch(PDO::FETCH_ASSOC)) {
                $row['id'] = 'assign_' . $row['id'];
                $row['target_audience'] = 'subject';
                $extraEvents[] = $row;
            }

            // Fetch Exams created by this teacher
            $stmtEx = $pdo->prepare("SELECT e.id, e.title, DATE(e.start_datetime) as event_date, 'exam' as type, 
                                     'Exam' as description, s.name as subject_name 
                                     FROM exams e
                                     JOIN subjects s ON e.subject_id = s.id
                                     WHERE e.subject_id IN ($inQuery)");
            $stmtEx->execute($teacherSubjectIds);
            while ($row = $stmtEx->fetch(PDO::FETCH_ASSOC)) {
                $row['id'] = 'exam_' . $row['id'];
                $row['target_audience'] = 'subject';
                $extraEvents[] = $row;
            }
        }
    }

    $sql .= " ORDER BY ac.event_date ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Merge standard events with assignments/exams
    $allEvents = array_merge($events, $extraEvents);

    echo json_encode([
        'success' => true,
        'data' => $allEvents
    ]);
}

function handlePost($pdo)
{
    // Verify User
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $role = $user['role'];
    $userId = $user['user_id'];

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
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $role = $user['role'];
    $userId = $user['user_id'];

    $data = json_decode(file_get_contents("php://input"), true);

    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing Event ID']);
        return;
    }

    // 1. Handle Assignments
    if (strpos($data['id'], 'assign_') === 0) {
        $realId = substr($data['id'], 7);
        $stmt = $pdo->prepare("SELECT a.id, a.teacher_id FROM assignments a WHERE a.id = ?");
        $stmt->execute([$realId]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$item) {
            http_response_code(404);
            echo json_encode(['error' => 'Assignment not found']);
            return;
        }

        if ($role !== 'admin' && $item['teacher_id'] != $userId) {
            http_response_code(403);
            echo json_encode(['error' => 'You can only edit your own assignments']);
            return;
        }

        if (isset($data['event_date'])) {
            $pdo->prepare("UPDATE assignments SET due_date = ? WHERE id = ?")->execute([$data['event_date'], $realId]);
        }
        echo json_encode(['success' => true, 'message' => 'Assignment updated']);
        return;
    }

    // 2. Handle Exams
    if (strpos($data['id'], 'exam_') === 0) {
        $realId = substr($data['id'], 5);
        $stmt = $pdo->prepare("SELECT e.id, e.teacher_id FROM exams e WHERE e.id = ?");
        $stmt->execute([$realId]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$item) {
            http_response_code(404);
            echo json_encode(['error' => 'Exam not found']);
            return;
        }

        if ($role !== 'admin' && $item['teacher_id'] != $userId) {
            http_response_code(403);
            echo json_encode(['error' => 'You can only edit your own exams']);
            return;
        }

        if (isset($data['event_date'])) {
            $pdo->prepare("UPDATE exams SET start_datetime = ? WHERE id = ?")->execute([$data['event_date'], $realId]);
        }
        echo json_encode(['success' => true, 'message' => 'Exam updated']);
        return;
    }

    // 3. Handle Standard Calendar Events
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
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $role = $user['role'];
    $userId = $user['user_id'];

    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing ID']);
        return;
    }

    // 1. Handle Assignments
    if (strpos($id, 'assign_') === 0) {
        $realId = substr($id, 7);
        $stmt = $pdo->prepare("SELECT id, teacher_id FROM assignments WHERE id = ?");
        $stmt->execute([$realId]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$item) {
            http_response_code(404);
            echo json_encode(['error' => 'Assignment not found']);
            return;
        }

        if ($role !== 'admin' && $item['teacher_id'] != $userId) {
            http_response_code(403);
            echo json_encode(['error' => 'You can only delete your own assignments']);
            return;
        }

        $pdo->prepare("DELETE FROM assignments WHERE id = ?")->execute([$realId]);
        echo json_encode(['success' => true]);
        return;
    }

    // 2. Handle Exams
    if (strpos($id, 'exam_') === 0) {
        $realId = substr($id, 5);
        $stmt = $pdo->prepare("SELECT id, teacher_id FROM exams WHERE id = ?");
        $stmt->execute([$realId]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$item) {
            http_response_code(404);
            echo json_encode(['error' => 'Exam not found']);
            return;
        }

        if ($role !== 'admin' && $item['teacher_id'] != $userId) {
            http_response_code(403);
            echo json_encode(['error' => 'You can only delete your own exams']);
            return;
        }

        $pdo->prepare("DELETE FROM exams WHERE id = ?")->execute([$realId]);
        echo json_encode(['success' => true]);
        return;
    }

    // 3. Handle Standard Calendar Events
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