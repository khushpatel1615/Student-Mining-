<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';
header('Content-Type: application/json');
$headers = getallheaders();
$token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
if (!$token) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No token provided']);
    exit();
}

$result = verifyToken($token);
if (!$result['valid']) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => $result['error']]);
    exit();
}

$pdo = getDBConnection();
$decoded = (object) $result['payload'];
$user_id = $decoded->user_id;
$user_role = $decoded->role;
// Only teachers and admins can access this
if ($user_role !== 'teacher' && $user_role !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$action = $_GET['action'] ?? 'my_subjects';
try {
    switch ($action) {
        case 'my_subjects':
            // Get subjects taught by this teacher

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              $stmt = $pdo->prepare("
                SELECT DISTINCT s.id, s.code, s.name, s.credits, s.semester
                FROM subjects s
                JOIN teacher_subjects ts ON s.id = ts.subject_id
                WHERE ts.teacher_id = ?
                ORDER BY s.semester, s.code
            ");
            $stmt->execute([$user_id]);
            $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $subjects]);

            break;
        case 'subject_students':
            // Get students enrolled in a specific subject

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              $subject_id = $_GET['subject_id'] ?? null;
            if (!$subject_id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Subject ID required']);
                exit();
            }

            $stmt = $pdo->prepare("
                SELECT u.id, u.student_id, u.full_name, u.email,
                       se.enrollment_date, se.status
                FROM student_enrollments se
                JOIN users u ON se.user_id = u.id
                WHERE se.subject_id = ?
                ORDER BY u.full_name
            ");
            $stmt->execute([$subject_id]);
            $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $students]);

            break;
        case 'subject_stats':
            // Get statistics for a subject

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              $subject_id = $_GET['subject_id'] ?? null;
            if (!$subject_id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Subject ID required']);
                exit();
            }

            // Get enrollment count
            $stmt = $pdo->prepare("
                SELECT COUNT(*) as total_students
                FROM student_enrollments
                WHERE subject_id = ? AND status = 'active'
            ");
            $stmt->execute([$subject_id]);
            $enrollment = $stmt->fetch(PDO::FETCH_ASSOC);
        // Get average attendance
                // Attendance features removed
                $attendance = ['avg_attendance' => 0];
            echo json_encode([
                'success' => true,
                'data' => [
                    'total_students' => $enrollment['total_students'],
                    'avg_attendance' => round($attendance['avg_attendance'] ?? 0, 2)
                ]
            ]);

            break;
        default:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
