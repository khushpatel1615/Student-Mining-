<?php

/**
 * Subject Details API
 * Returns detailed information about a subject for a student
 * including grades, attendance, and course info
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';
setCORSHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();
try {
    if ($method === 'GET') {
        handleGet($pdo);
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function handleGet($pdo)
{
    // Get token from header and verify it
    $token = getTokenFromHeader();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'No token provided']);
        return;
    }

    $result = verifyToken($token);
    if (!$result['valid']) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => $result['error']]);
        return;
    }

    $user = $result['payload'];
    $userId = $user['user_id'];
    $subjectId = $_GET['subject_id'] ?? null;
    if (!$subjectId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'subject_id is required']);
        return;
    }

    // Get subject info
    $stmt = $pdo->prepare("
        SELECT 
            s.id, s.name, s.code, s.semester, s.credits, s.subject_type, s.description,
            p.name as program_name, p.code as program_code
        FROM subjects s
        JOIN programs p ON s.program_id = p.id
        WHERE s.id = ? AND s.is_active = TRUE
    ");
    $stmt->execute([$subjectId]);
    $subject = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$subject) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Subject not found']);
        return;
    }

    // Get enrollment for this student/subject
    $enrollStmt = $pdo->prepare("
        SELECT id, status, enrolled_at, final_grade, final_percentage, academic_year
        FROM student_enrollments
        WHERE user_id = ? AND subject_id = ?
    ");
    $enrollStmt->execute([$userId, $subjectId]);
    $enrollment = $enrollStmt->fetch(PDO::FETCH_ASSOC);
    if (!$enrollment) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Not enrolled in this subject']);
        return;
    }

    // Get grades with detailed breakdown
    $gradesStmt = $pdo->prepare("
        SELECT 
            ec.id as criteria_id,
            ec.component_name,
            ec.weight_percentage,
            ec.max_marks,
            ec.description as criteria_description,
            sg.id as grade_id,
            sg.marks_obtained,
            sg.remarks,
            sg.graded_at,
            u.full_name as graded_by_name
        FROM evaluation_criteria ec
        LEFT JOIN student_grades sg ON ec.id = sg.criteria_id AND sg.enrollment_id = ?
        LEFT JOIN users u ON sg.graded_by = u.id
        WHERE ec.subject_id = ?
        ORDER BY ec.weight_percentage DESC
    ");
    $gradesStmt->execute([$enrollment['id'], $subjectId]);
    $grades = $gradesStmt->fetchAll(PDO::FETCH_ASSOC);
// Calculate totals
    $totalObtained = 0;
    $totalMax = 0;
    $totalWeightAchieved = 0;
    $totalWeight = 0;
    foreach ($grades as &$grade) {
        $totalWeight += $grade['weight_percentage'];
        $totalMax += $grade['max_marks'];
        if ($grade['marks_obtained'] !== null) {
            $totalObtained += $grade['marks_obtained'];
        // Calculate weight achieved for this component
            $weightAchieved = ($grade['marks_obtained'] / $grade['max_marks']) * $grade['weight_percentage'];
            $grade['weight_achieved'] = round($weightAchieved, 2);
            $grade['percentage'] = round(($grade['marks_obtained'] / $grade['max_marks']) * 100, 2);
            $totalWeightAchieved += $weightAchieved;
        } else {
            $grade['weight_achieved'] = null;
            $grade['percentage'] = null;
        }
    }

    $overallPercentage = $totalMax > 0 ? round(($totalObtained / $totalMax) * 100, 2) : null;
    $letterGrade = calculateLetterGrade($overallPercentage);
// Get attendance stats
    $attendanceStmt = $pdo->prepare("
        SELECT 
            COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
            COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
            COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
            COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused,
            COUNT(*) as total
        FROM student_attendance
        WHERE enrollment_id = ?
    ");
    $attendanceStmt->execute([$enrollment['id']]);
    $attendance = $attendanceStmt->fetch(PDO::FETCH_ASSOC);
    $attendancePercentage = $attendance['total'] > 0
        ? round(($attendance['present'] / $attendance['total']) * 100, 1)
        : null;
    echo json_encode([
        'success' => true,
        'data' => [
            'subject' => $subject,
            'enrollment' => $enrollment,
            'grades' => [
                'items' => $grades,
                'summary' => [
                    'total_obtained' => $totalObtained,
                    'total_max' => $totalMax,
                    'weight_achieved' => round($totalWeightAchieved, 2),
                    'total_weight' => $totalWeight,
                    'overall_percentage' => $overallPercentage,
                    'letter_grade' => $letterGrade
                ]
            ],
            'attendance' => [
                'present' => (int) $attendance['present'],
                'absent' => (int) $attendance['absent'],
                'late' => (int) $attendance['late'],
                'excused' => (int) $attendance['excused'],
                'total' => (int) $attendance['total'],
                'percentage' => $attendancePercentage
            ]
        ]
    ]);
}

function calculateLetterGrade($percentage)
{
    if ($percentage === null) {
        return null;
    }
    if ($percentage >= 90) {
        return 'A+';
    }
    if ($percentage >= 80) {
        return 'A';
    }
    if ($percentage >= 70) {
        return 'B+';
    }
    if ($percentage >= 60) {
        return 'B';
    }
    if ($percentage >= 50) {
        return 'C';
    }
    if ($percentage >= 40) {
        return 'D';
    }
    return 'F';
}
