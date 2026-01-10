<?php
/**
 * Student Attendance API
 * Handles attendance tracking for enrolled subjects
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';
require_once __DIR__ . '/../includes/notifications.php';

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
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

/**
 * GET - Get attendance records
 */
function handleGet($pdo)
{
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $userId = $_GET['user_id'] ?? $user['user_id'];
    $enrollmentId = $_GET['enrollment_id'] ?? null;
    $subjectId = $_GET['subject_id'] ?? null;
    $date = $_GET['date'] ?? null;
    $month = $_GET['month'] ?? null; // Format: YYYY-MM

    // If not admin, can only view own attendance
    if ($user['role'] !== 'admin' && $userId != $user['user_id']) {
        http_response_code(403);
        echo json_encode(['error' => 'Access denied']);
        return;
    }

    // 3. Admin/Teacher: Fetch all students for a specific subject and date
    if (in_array($user['role'], ['admin', 'teacher']) && $subjectId && $date) {
        $stmt = $pdo->prepare("
            SELECT 
                se.id,
                u.full_name as student_name,
                u.student_id as student_code,
                sa.status as attendance_status,
                sa.remarks
            FROM student_enrollments se
            JOIN users u ON se.user_id = u.id
            LEFT JOIN student_attendance sa ON se.id = sa.enrollment_id AND sa.attendance_date = ?
            WHERE se.subject_id = ?
            ORDER BY u.full_name ASC
        ");
        $stmt->execute([$date, $subjectId]);
        $enrollments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => [
                'enrollments' => $enrollments
            ]
        ]);
        return;
    }

    if ($enrollmentId) {
        // Get attendance for specific enrollment
        $sql = "
            SELECT 
                sa.id,
                sa.attendance_date,
                sa.status,
                sa.remarks,
                DATE_FORMAT(sa.attendance_date, '%W') as day_name
            FROM student_attendance sa
            WHERE sa.enrollment_id = ?
        ";
        $params = [$enrollmentId];

        if ($month) {
            $sql .= " AND DATE_FORMAT(sa.attendance_date, '%Y-%m') = ?";
            $params[] = $month;
        }

        $sql .= " ORDER BY sa.attendance_date DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate summary
        $summary = [
            'total' => count($records),
            'present' => 0,
            'absent' => 0,
            'late' => 0,
            'excused' => 0,
            'percentage' => 0
        ];

        foreach ($records as $record) {
            $summary[$record['status']]++;
        }

        if ($summary['total'] > 0) {
            $summary['percentage'] = round(
                (($summary['present'] + $summary['late']) / $summary['total']) * 100,
                2
            );
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'records' => $records,
                'summary' => $summary
            ]
        ]);

    } else {
        // Get attendance summary for all subjects
        $sql = "
            SELECT 
                se.id as enrollment_id,
                s.id as subject_id,
                s.name as subject_name,
                s.code as subject_code,
                s.semester,
                COUNT(sa.id) as total_classes,
                COUNT(CASE WHEN sa.status = 'present' THEN 1 END) as present_count,
                COUNT(CASE WHEN sa.status = 'absent' THEN 1 END) as absent_count,
                COUNT(CASE WHEN sa.status = 'late' THEN 1 END) as late_count,
                COUNT(CASE WHEN sa.status = 'excused' THEN 1 END) as excused_count,
                ROUND(
                    (COUNT(CASE WHEN sa.status IN ('present', 'late') THEN 1 END) * 100.0) / 
                    NULLIF(COUNT(sa.id), 0), 2
                ) as attendance_percentage
            FROM student_enrollments se
            JOIN subjects s ON se.subject_id = s.id
            LEFT JOIN student_attendance sa ON se.id = sa.enrollment_id
            WHERE se.user_id = ?
        ";
        $params = [$userId];

        if ($subjectId) {
            $sql .= " AND s.id = ?";
            $params[] = $subjectId;
        }

        $sql .= " GROUP BY se.id, s.id ORDER BY s.semester ASC, s.name ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $results]);
    }
}

/**
 * POST - Mark attendance (Admin only)
 */
function handlePost($pdo)
{
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? null;

    // 1. Start Smart Session (Teacher/Admin)
    if ($action === 'start_session') {
        if (!in_array($user['role'], ['admin', 'teacher'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        if (empty($data['subject_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Subject ID required']);
            return;
        }

        $sessionCode = strtoupper(substr(md5(uniqid()), 0, 6));
        $expiry = date('Y-m-d H:i:s', strtotime('+15 minutes'));
        $authorizedIp = $_SERVER['REMOTE_ADDR'];

        $stmt = $pdo->prepare("
            INSERT INTO attendance_sessions (subject_id, teacher_id, authorized_ip, session_code, expires_at)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['subject_id'],
            $user['user_id'],
            $authorizedIp,
            $sessionCode,
            $expiry
        ]);

        echo json_encode([
            'success' => true,
            'data' => [
                'session_id' => $pdo->lastInsertId(),
                'session_code' => $sessionCode,
                'expires_at' => $expiry,
                'authorized_ip' => $authorizedIp
            ]
        ]);
        return;
    }

    // 2. Mark Attendance via QR/WiFi (Student)
    if ($action === 'mark_self') {
        if ($user['role'] !== 'student') {
            http_response_code(403);
            echo json_encode(['error' => 'Only students can mark their own attendance']);
            return;
        }

        if (empty($data['session_code'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Session code required']);
            return;
        }

        // Find active session
        $stmt = $pdo->prepare("
            SELECT * FROM attendance_sessions 
            WHERE session_code = ? AND expires_at > NOW() AND is_active = 1
            LIMIT 1
        ");
        $stmt->execute([$data['session_code']]);
        $session = $stmt->fetch();

        if (!$session) {
            http_response_code(404);
            echo json_encode(['error' => 'Invalid or expired session code']);
            return;
        }

        $studentIp = $_SERVER['REMOTE_ADDR'];

        // 🛡️ WiFi Check: Must match Teacher's IP
        if ($studentIp !== $session['authorized_ip']) {
            http_response_code(403);
            echo json_encode([
                'error' => 'WiFi Network Mismatch',
                'details' => 'You must be connected to the same classroom WiFi as the teacher.'
            ]);
            return;
        }

        // 🛡️ Proxy Check: One IP per Session
        $stmt = $pdo->prepare("
            SELECT id FROM student_attendance 
            WHERE session_id = ? AND ip_address = ?
        ");
        $stmt->execute([$session['id'], $studentIp]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'Device already used. One device per student is enforced.']);
            return;
        }

        // Get Enrollment
        $stmt = $pdo->prepare("
            SELECT id FROM student_enrollments 
            WHERE user_id = ? AND subject_id = ?
            LIMIT 1
        ");
        $stmt->execute([$user['user_id'], $session['subject_id']]);
        $enrollment = $stmt->fetch();

        if (!$enrollment) {
            http_response_code(403);
            echo json_encode(['error' => 'You are not enrolled in this subject']);
            return;
        }

        // Mark Attendance
        $stmt = $pdo->prepare("
            INSERT INTO student_attendance (enrollment_id, attendance_date, status, marked_by, session_id, ip_address)
            VALUES (?, CURDATE(), 'present', ?, ?, ?)
            ON DUPLICATE KEY UPDATE status = 'present', marked_by = ?, session_id = ?, ip_address = ?
        ");
        $stmt->execute([
            $enrollment['id'],
            $user['user_id'],
            $session['id'],
            $studentIp,
            $user['user_id'],
            $session['id'],
            $studentIp
        ]);

        echo json_encode(['success' => true, 'message' => 'Attendance verified & recorded!']);
        return;
    }

    // --- FALLBACK TO ADMIN ACTIONS ---
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Admin access required for manual marking']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    // Single attendance entry
    if (!empty($data['enrollment_id']) && !empty($data['date'])) {
        $stmt = $pdo->prepare("
            INSERT INTO student_attendance (enrollment_id, attendance_date, status, remarks, marked_by)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE status = ?, remarks = ?, marked_by = ?
        ");

        $status = $data['status'] ?? 'present';
        $remarks = $data['remarks'] ?? null;

        $stmt->execute([
            $data['enrollment_id'],
            $data['date'],
            $status,
            $remarks,
            $user['user_id'],
            $status,
            $remarks,
            $user['user_id']
        ]);

        // Notify if absent or late
        if (in_array($status, ['absent', 'late'])) {
            // Get user and subject info
            $infoStmt = $pdo->prepare("
                SELECT se.user_id, se.subject_id, s.name as subject_name 
                FROM student_enrollments se 
                JOIN subjects s ON se.subject_id = s.id 
                WHERE se.id = ?
            ");
            $infoStmt->execute([$data['enrollment_id']]);
            $info = $infoStmt->fetch(PDO::FETCH_ASSOC);

            if ($info) {
                $title = $status === 'absent' ? 'Absence Recorded' : 'Late Attendance Recorded';
                createNotification(
                    $pdo,
                    $info['user_id'],
                    'attendance_warning',
                    $title,
                    "You have been marked {$status} for {$info['subject_name']} on {$data['date']}.",
                    $data['enrollment_id']
                );
            }
        }

        echo json_encode(['success' => true, 'message' => 'Attendance marked']);
        return;
    }

    // Bulk attendance for a subject/date
    if (!empty($data['subject_id']) && !empty($data['date']) && !empty($data['students'])) {
        $pdo->beginTransaction();

        try {
            $stmt = $pdo->prepare("
                INSERT INTO student_attendance (enrollment_id, attendance_date, status, remarks, marked_by)
                SELECT se.id, ?, ?, ?, ?
                FROM student_enrollments se
                WHERE se.user_id = ? AND se.subject_id = ?
                ON DUPLICATE KEY UPDATE status = ?, remarks = ?, marked_by = ?
            ");

            $markedCount = 0;

            foreach ($data['students'] as $student) {
                $status = $student['status'] ?? 'present';
                $remarks = $student['remarks'] ?? null;

                $stmt->execute([
                    $data['date'],
                    $status,
                    $remarks,
                    $user['user_id'],
                    $student['user_id'],
                    $data['subject_id'],
                    $status,
                    $remarks,
                    $user['user_id']
                ]);
                $markedCount++;

                // Notify if absent or late
                if (in_array($status, ['absent', 'late'])) {
                    $title = $status === 'absent' ? 'Absence Recorded' : 'Late Attendance Recorded';
                    createNotification(
                        $pdo,
                        $student['user_id'],
                        'attendance_warning',
                        $title,
                        "You have been marked {$status} for subject ID {$data['subject_id']} on {$data['date']}.",
                        null
                    );
                }
            }

            $pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => "Attendance marked for $markedCount students"
            ]);

        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
        return;
    }

    http_response_code(400);
    echo json_encode(['error' => 'Invalid request format']);
}

/**
 * PUT - Update attendance record (Admin only)
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
        echo json_encode(['error' => 'Attendance record ID is required']);
        return;
    }

    $fields = [];
    $params = [];

    if (isset($data['status'])) {
        $fields[] = 'status = ?';
        $params[] = $data['status'];
    }
    if (isset($data['remarks'])) {
        $fields[] = 'remarks = ?';
        $params[] = $data['remarks'];
    }

    if (empty($fields)) {
        http_response_code(400);
        echo json_encode(['error' => 'No fields to update']);
        return;
    }

    $fields[] = 'marked_by = ?';
    $params[] = $user['user_id'];
    $params[] = $data['id'];

    $stmt = $pdo->prepare("UPDATE student_attendance SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($params);

    // Notify if status was updated to absent/late
    if (isset($data['status']) && in_array($data['status'], ['absent', 'late'])) {
        // Get enrollment info
        $infoStmt = $pdo->prepare("
            SELECT se.user_id, s.name as subject_name 
            FROM student_attendance sa
            JOIN student_enrollments se ON sa.enrollment_id = se.id
            JOIN subjects s ON se.subject_id = s.id 
            WHERE sa.id = ?
        ");
        $infoStmt->execute([$data['id']]);
        $info = $infoStmt->fetch(PDO::FETCH_ASSOC);

        if ($info) {
            $title = $data['status'] === 'absent' ? 'Absence Updated' : 'Late Attendance Updated';
            createNotification(
                $pdo,
                $info['user_id'],
                'attendance_warning',
                $title,
                "Your attendance status has been updated to {$data['status']} for {$info['subject_name']}.",
                null
            );
        }
    }

    echo json_encode(['success' => true, 'message' => 'Attendance updated']);
}

/**
 * Helper: Get authenticated user payload
 */
function getAuthUser()
{
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return null;
    }

    $result = verifyToken($matches[1]);

    if (!$result['valid']) {
        return null;
    }

    return $result['payload'];
}

/**
 * Helper: Verify admin token
 */
function verifyAdminToken()
{
    $user = getAuthUser();
    if (!$user || $user['role'] !== 'admin') {
        return null;
    }
    return $user;
}
