<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

try {
    if ($method === 'GET') {
        handleGet($pdo);
    } else {
        throw new Exception('Invalid request method');
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

    if ($user['role'] !== 'student') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Unauthorized - Student access only']);
        return;
    }

    $userId = $user['user_id'];  // JWT uses user_id, not id

    // 1. Get Complete Student Profile
    $stmt = $pdo->prepare("
        SELECT 
            u.id, u.email, u.full_name, u.avatar_url, u.student_id, 
            u.program_id, u.current_semester, u.created_at as enrollment_date,
            p.name as program_name, p.code as program_code, p.duration_years
        FROM users u
        LEFT JOIN programs p ON u.program_id = p.id
        WHERE u.id = ?
    ");
    $stmt->execute([$userId]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student || !$student['program_id']) {
        echo json_encode([
            'success' => true,
            'data' => [
                'enrolled' => false,
                'student' => [
                    'name' => $student['full_name'] ?? $user['full_name'],
                    'email' => $student['email'] ?? $user['email'],
                    'student_id' => $student['student_id'] ?? null,
                    'enrollment_date' => $student['enrollment_date'] ?? null
                ]
            ]
        ]);
        return;
    }

    $programId = $student['program_id'];

    // Determine semester to fetch (default to current, or use requested)
    $currentSemester = $student['current_semester'] ?? 1;
    $requestedSemester = isset($_GET['semester']) ? intval($_GET['semester']) : $currentSemester;

    // Validate requested semester
    if ($requestedSemester < 1 || $requestedSemester > $currentSemester) {
        $requestedSemester = $currentSemester;
    }

    $semester = $requestedSemester;

    // 2. Fetch Subjects for Current Semester
    $stmt = $pdo->prepare("
        SELECT id, name, code, credits, subject_type 
        FROM subjects 
        WHERE program_id = ? AND semester = ? AND is_active = 1
    ");
    $stmt->execute([$programId, $semester]);
    $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Process each subject for grades and attendance
    $subjectsData = [];
    $totalAttendance = ['present' => 0, 'total' => 0];
    $totalCredits = 0;
    $earnedCredits = 0;
    $gradePoints = 0; // For GPA calculation

    foreach ($subjects as $subject) {
        // Get Enrollment
        $stmt = $pdo->prepare("
            SELECT id, status, final_percentage 
            FROM student_enrollments 
            WHERE user_id = ? AND subject_id = ?
        ");
        $stmt->execute([$userId, $subject['id']]);
        $enrollment = $stmt->fetch(PDO::FETCH_ASSOC);

        $subjectData = [
            'subject' => $subject,
            'status' => $enrollment ? $enrollment['status'] : 'not_enrolled',
            'enrollment_id' => $enrollment ? $enrollment['id'] : null,
            'overall_grade' => null,
            'grade_letter' => null,
            'components' => [],
            'attendance' => ['present' => 0, 'absent' => 0, 'late' => 0, 'optional' => 0, 'percentage' => 0, 'total_classes' => 0]
        ];

        if ($enrollment) {
            $totalCredits += $subject['credits'];

            // Fetch Component Grades with professor remarks
            $stmt = $pdo->prepare("
                SELECT ec.component_name, ec.max_marks, ec.weight_percentage, sg.marks_obtained, sg.remarks, sg.graded_at
                FROM evaluation_criteria ec
                LEFT JOIN student_grades sg ON ec.id = sg.criteria_id AND sg.enrollment_id = ?
                WHERE ec.subject_id = ?
                ORDER BY ec.weight_percentage DESC
            ");
            $stmt->execute([$enrollment['id'], $subject['id']]);
            $subjectData['components'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate overall grade dynamically from components (weighted average)
            $totalWeight = 0;
            $weightedScore = 0;
            foreach ($subjectData['components'] as $comp) {
                if ($comp['marks_obtained'] !== null && $comp['max_marks'] > 0) {
                    $componentPercent = ($comp['marks_obtained'] / $comp['max_marks']) * 100;
                    $weightedScore += ($componentPercent * $comp['weight_percentage']) / 100;
                    $totalWeight += $comp['weight_percentage'];
                }
            }

            // Calculate overall percentage (normalize to total graded weight)
            $overallPercentage = $totalWeight > 0 ? round(($weightedScore / $totalWeight) * 100, 2) : 0;
            $subjectData['overall_grade'] = $overallPercentage;

            // Calculate Grade Letter and Grade Points
            $gradeData = calculateGrade($overallPercentage);
            $subjectData['grade_letter'] = $gradeData['letter'];

            // Count towards GPA if actively enrolled
            if ($enrollment['status'] === 'active' && $totalWeight > 0) {
                $earnedCredits += $subject['credits'];
                $gradePoints += $gradeData['points'] * $subject['credits'];
            } elseif ($enrollment['status'] === 'completed') {
                $earnedCredits += $subject['credits'];
                $gradePoints += $gradeData['points'] * $subject['credits'];
            }

            // Fetch Attendance Stats
            $stmt = $pdo->prepare("
                SELECT status, COUNT(*) as count 
                FROM student_attendance 
                WHERE enrollment_id = ? 
                GROUP BY status
            ");
            $stmt->execute([$enrollment['id']]);
            $attStats = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

            $present = $attStats['present'] ?? 0;
            $absent = $attStats['absent'] ?? 0;
            $late = $attStats['late'] ?? 0;
            $optional = $attStats['optional'] ?? 0;
            $excused = $attStats['excused'] ?? 0;

            $totalClasses = $present + $absent + $late;
            $percentage = $totalClasses > 0 ? round(($present / $totalClasses) * 100) : 0;

            $subjectData['attendance'] = [
                'present' => $present,
                'absent' => $absent,
                'late' => $late,
                'optional' => $optional,
                'excused' => $excused,
                'total_classes' => $totalClasses,
                'percentage' => $percentage,
                'warning' => $percentage > 0 && $percentage < 75
            ];

            $totalAttendance['present'] += $present;
            $totalAttendance['total'] += $totalClasses;
        }

        $subjectsData[] = $subjectData;
    }

    // Calculate Overall Stats
    $overallAttendance = $totalAttendance['total'] > 0
        ? round(($totalAttendance['present'] / $totalAttendance['total']) * 100)
        : 0;

    $gpa = $earnedCredits > 0 ? round($gradePoints / $earnedCredits, 2) : 0;
    $gpaGrade = getGPAGrade($gpa);

    // 4. Get All-Time Stats (all semesters)
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(DISTINCT se.subject_id) as total_subjects_enrolled,
            SUM(CASE WHEN se.status = 'completed' THEN 1 ELSE 0 END) as completed_subjects
        FROM student_enrollments se
        WHERE se.user_id = ?
    ");
    $stmt->execute([$userId]);
    $allTimeStats = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => [
            'enrolled' => true,
            'student' => [
                'id' => $student['id'],
                'name' => $student['full_name'],
                'email' => $student['email'],
                'student_id' => $student['student_id'],
                'avatar_url' => $student['avatar_url'],
                'enrollment_date' => $student['enrollment_date'],
                'current_semester' => $currentSemester
            ],
            'program' => [
                'name' => $student['program_name'],
                'code' => $student['program_code'],
                'duration' => $student['duration_years']
            ],
            'semester' => $semester,
            'subjects' => $subjectsData,
            'summary' => [
                'gpa' => $gpa,
                'gpa_grade' => $gpaGrade,
                'total_credits' => $totalCredits,
                'earned_credits' => $earnedCredits,
                'overall_attendance' => $overallAttendance,
                'attendance_status' => $overallAttendance >= 75 ? 'good' : 'warning',
                'subjects_completed' => $allTimeStats['completed_subjects'] ?? 0,
                'subjects_enrolled' => count($subjectsData)
            ]
        ]
    ]);
}

function calculateGrade($percentage)
{
    if ($percentage >= 90)
        return ['letter' => 'A+', 'points' => 10];
    if ($percentage >= 80)
        return ['letter' => 'A', 'points' => 9];
    if ($percentage >= 70)
        return ['letter' => 'B+', 'points' => 8];
    if ($percentage >= 60)
        return ['letter' => 'B', 'points' => 7];
    if ($percentage >= 50)
        return ['letter' => 'C', 'points' => 6];
    if ($percentage >= 40)
        return ['letter' => 'D', 'points' => 5];
    return ['letter' => 'F', 'points' => 0];
}

function getGPAGrade($gpa)
{
    if ($gpa >= 9.0)
        return 'Outstanding';
    if ($gpa >= 8.0)
        return 'Excellent';
    if ($gpa >= 7.0)
        return 'Very Good';
    if ($gpa >= 6.0)
        return 'Good';
    if ($gpa >= 5.0)
        return 'Average';
    return 'Needs Improvement';
}
?>