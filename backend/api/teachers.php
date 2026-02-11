<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

// Ensure method
requireMethod(['GET']);

// Auth & Role check
$user = requireRole(['teacher', 'admin']);
$user_id = $user['user_id'];

$pdo = getDBConnection();

$action = $_GET['action'] ?? 'my_subjects';

try {
    switch ($action) {
        case 'my_subjects':
            $stmt = $pdo->prepare("
                SELECT DISTINCT s.id, s.code, s.name, s.credits, s.semester
                FROM subjects s
                JOIN teacher_subjects ts ON s.id = ts.subject_id
                WHERE ts.teacher_id = ?
                ORDER BY s.semester, s.code
            ");
            $stmt->execute([$user_id]);
            $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);
            sendResponse(['success' => true, 'data' => $subjects]);
            break;

        case 'subject_students':
            $subject_id = filter_input(INPUT_GET, 'subject_id', FILTER_SANITIZE_NUMBER_INT);
            if (!$subject_id) {
                sendError('Subject ID required');
            }

            // Verify teacher access to this subject
            // (Optional security check: ensure teacher teaches this subject)

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
            sendResponse(['success' => true, 'data' => $students]);
            break;

        case 'subject_stats':
            $subject_id = filter_input(INPUT_GET, 'subject_id', FILTER_SANITIZE_NUMBER_INT);
            if (!$subject_id) {
                sendError('Subject ID required');
            }

            // Get enrollment count
            $stmt = $pdo->prepare("
                SELECT COUNT(*) as total_students
                FROM student_enrollments
                WHERE subject_id = ? AND status = 'active'
            ");
            $stmt->execute([$subject_id]);
            $enrollment = $stmt->fetch(PDO::FETCH_ASSOC);

            // Attendance features removed/placeholder
            $attendance = ['avg_attendance' => 0];

            sendResponse([
                'success' => true,
                'data' => [
                    'total_students' => $enrollment['total_students'],
                    'avg_attendance' => round($attendance['avg_attendance'] ?? 0, 2)
                ]
            ]);
            break;

        default:
            sendError('Invalid action');
    }
} catch (Exception $e) {
    sendError('An error occurred', 500, $e->getMessage());
}
