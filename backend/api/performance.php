<?php

/**
 * Student Performance API
 * Returns aggregate performance + subject-level performance details.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';
require_once __DIR__ . '/../includes/api_helpers.php';
require_once __DIR__ . '/../includes/gpa_helpers.php';

handleCORS();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', 405);
}

$pdo = getDBConnection();
$user = requireAuth();

$studentIdParam = filter_input(INPUT_GET, 'student_id', FILTER_SANITIZE_NUMBER_INT)
    ?: filter_input(INPUT_GET, 'user_id', FILTER_SANITIZE_NUMBER_INT)
    ?: filter_input(INPUT_GET, 'studentId', FILTER_SANITIZE_NUMBER_INT);

$targetStudentId = $studentIdParam ? (int) $studentIdParam : (int) $user['user_id'];
if (!in_array($user['role'], ['admin', 'teacher']) && $targetStudentId !== (int) $user['user_id']) {
    sendError('Access denied', 403);
}

try {
    $stmt = $pdo->prepare("
        SELECT
            se.id as enrollment_id,
            se.status,
            se.final_percentage,
            se.final_grade,
            se.enrolled_at,
            s.id as subject_id,
            s.name as subject_name,
            s.code as subject_code,
            s.semester,
            s.credits,
            COALESCE(att.attendance_percentage, 0) as attendance_percentage
        FROM student_enrollments se
        JOIN subjects s ON s.id = se.subject_id
        LEFT JOIN (
            SELECT
                sa.enrollment_id,
                ROUND(
                    (SUM(CASE WHEN sa.status = 'present' THEN 1 ELSE 0 END) * 100.0)
                    / NULLIF(COUNT(*), 0),
                    2
                ) as attendance_percentage
            FROM student_attendance sa
            GROUP BY sa.enrollment_id
        ) att ON att.enrollment_id = se.id
        WHERE se.user_id = ?
        ORDER BY s.semester ASC, s.name ASC
    ");
    $stmt->execute([$targetStudentId]);
    $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $gradePointsWeighted = 0.0;
    $gradePoints4Weighted = 0.0;
    $gradeCredits = 0;
    $scoreSum = 0.0;
    $scoreCount = 0;
    $attendanceSum = 0.0;
    $attendanceCount = 0;
    $creditsEarned = 0;
    $creditsInProgress = 0;

    foreach ($subjects as &$subject) {
        $credits = (int) ($subject['credits'] ?? 0);
        $status = strtolower((string) ($subject['status'] ?? ''));
        $percentage = $subject['final_percentage'] !== null ? (float) $subject['final_percentage'] : null;
        $attendance = (float) ($subject['attendance_percentage'] ?? 0);

        if ($status === 'completed') {
            $creditsEarned += $credits;
        } elseif ($status === 'active') {
            $creditsInProgress += $credits;
        }

        if ($percentage !== null) {
            $points10 = percentageToPoints10($percentage);
            $gradePointsWeighted += $points10 * $credits;
            $gradePoints4Weighted += percentageToGPA4($percentage) * $credits;
            $gradeCredits += $credits;
            $scoreSum += $percentage;
            $scoreCount++;
        }

        if ($attendance > 0) {
            $attendanceSum += $attendance;
            $attendanceCount++;
        }

        $subject['credits'] = $credits;
        $subject['attendance_percentage'] = round($attendance, 2);
        $subject['final_percentage'] = $percentage !== null ? round($percentage, 2) : null;
    }

    $gpa10 = $gradeCredits > 0 ? round($gradePointsWeighted / $gradeCredits, 2) : 0.0;
    $gpa4 = $gradeCredits > 0 ? round($gradePoints4Weighted / $gradeCredits, 2) : 0.0;
    $avgScore = $scoreCount > 0 ? round($scoreSum / $scoreCount, 2) : 0.0;
    $avgAttendance = $attendanceCount > 0 ? round($attendanceSum / $attendanceCount, 2) : 0.0;

    sendResponse([
        'success' => true,
        'data' => [
            'summary' => [
                'gpa_10' => $gpa10,
                'gpa_4' => $gpa4,
                'average_score' => $avgScore,
                'attendance' => $avgAttendance,
                'subjects_count' => count($subjects),
                'credits_earned' => $creditsEarned,
                'credits_in_progress' => $creditsInProgress
            ],
            'subjects' => $subjects
        ]
    ]);
} catch (Exception $e) {
    sendError('Internal Server Error', 500, $e->getMessage());
}

function percentageToPoints10(float $percentage): float
{
    if ($percentage >= 90.0) {
        return 10.0;
    }
    if ($percentage >= 80.0) {
        return 9.0;
    }
    if ($percentage >= 70.0) {
        return 8.0;
    }
    if ($percentage >= 60.0) {
        return 7.0;
    }
    if ($percentage >= 50.0) {
        return 6.0;
    }
    if ($percentage >= 40.0) {
        return 5.0;
    }
    return 0.0;
}
