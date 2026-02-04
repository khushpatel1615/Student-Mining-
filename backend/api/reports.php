<?php

/**
 * PDF Report Generation API
 * Generates report cards, transcripts, and attendance reports
 * Uses the actual database schema: student_grades, student_enrollments, evaluation_criteria
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';
setCORSHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();
try {
    if ($method === 'GET') {
        handleGet($pdo);
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
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $action = $_GET['action'] ?? 'report_card';
    $studentId = $_GET['student_id'] ?? null;
// If no student_id provided and user is a student, use their own ID
    if (!$studentId && $user['role'] === 'student') {
        $studentId = $user['user_id'];
    }

    // Admin/teacher need to specify a student_id or we pick a random student for demo
    if (!$studentId && ($user['role'] === 'admin' || $user['role'] === 'teacher')) {
        $stmt = $pdo->query("SELECT id FROM users WHERE role = 'student' LIMIT 1");
        $student = $stmt->fetch(PDO::FETCH_ASSOC);
        $studentId = $student ? $student['id'] : null;
    }

    if (!$studentId) {
        echo json_encode(['error' => 'No student found']);
        return;
    }

    switch ($action) {
        case 'report_card':
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    generateReportCard($pdo, $studentId);

            break;
        case 'transcript':
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    generateTranscript($pdo, $studentId);

            break;
        case 'attendance_report':
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    generateAttendanceReport($pdo, $studentId);

            break;
        case 'performance_report':
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    generatePerformanceReport($pdo, $studentId);

            break;
        default:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    echo json_encode(['error' => 'Invalid action']);
    }
}

function generateReportCard($pdo, $studentId)
{
    // Get student info
    $stmt = $pdo->prepare("
        SELECT u.*, p.name as program_name
        FROM users u
        LEFT JOIN programs p ON u.program_id = p.id
        WHERE u.id = ?
    ");
    $stmt->execute([$studentId]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$student) {
        echo json_encode(['error' => 'Student not found']);
        return;
    }

    // Get current semester to filter report card
    $currentSemester = $student['current_semester'] ?? 1;
// Get enrollments with final grades (from student_enrollments table) for CURRENT SEMESTER ONLY
    $stmt = $pdo->prepare("
        SELECT 
            s.code as subject_code,
            s.name as subject_name,
            s.credits,
            s.subject_type,
            se.final_percentage as score,
            se.final_grade as letter_grade,
            s.semester,
            CASE 
                WHEN se.final_percentage >= 90 THEN 4.0
                WHEN se.final_percentage >= 80 THEN 3.7
                WHEN se.final_percentage >= 70 THEN 3.0
                WHEN se.final_percentage >= 60 THEN 2.3
                WHEN se.final_percentage >= 50 THEN 1.0
                ELSE 0.0
            END as grade_points
        FROM student_enrollments se
        JOIN subjects s ON se.subject_id = s.id
        WHERE se.user_id = ? AND s.semester = ?
        ORDER BY s.name
    ");
    $stmt->execute([$studentId, $currentSemester]);
    $grades = $stmt->fetchAll(PDO::FETCH_ASSOC);
// Calculate GPA
    $totalPoints = 0;
    $totalCredits = 0;
    foreach ($grades as $grade) {
        if ($grade['score'] !== null) {
            $credits = $grade['credits'] ?? 3;
            $totalPoints += $grade['grade_points'] * $credits;
            $totalCredits += $credits;
        }
    }
    $gpa = $totalCredits > 0 ? round($totalPoints / $totalCredits, 2) : 0;
// Get attendance summary
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN sa.status = 'present' THEN 1 ELSE 0 END) as present
        FROM student_attendance sa
        JOIN student_enrollments se ON sa.enrollment_id = se.id
        WHERE se.user_id = ?
    ");
    $stmt->execute([$studentId]);
    $attendance = $stmt->fetch(PDO::FETCH_ASSOC);
    $attendancePercentage = ($attendance && $attendance['total'] > 0)
        ? round(($attendance['present'] / $attendance['total']) * 100, 1)
        : 100;
    echo json_encode([
        'success' => true,
        'data' => [
            'report_type' => 'Report Card',
            'generated_at' => date('Y-m-d H:i:s'),
            'student' => [
                'id' => $student['id'],
                'name' => $student['full_name'] ?? 'Student',
                'email' => $student['email'] ?? '',
                'program' => $student['program_name'] ?? 'N/A',
                'semester' => $student['current_semester'] ?? 1
            ],
            'academic' => [
                'grades' => $grades,
                'gpa' => $gpa,
                'total_credits' => $totalCredits,
                'attendance_percentage' => $attendancePercentage
            ],
            'remarks' => getAcademicRemarks($gpa, $attendancePercentage)
        ]
    ]);
}

function generateTranscript($pdo, $studentId)
{
    // Get student info
    $stmt = $pdo->prepare("
        SELECT u.*, p.name as program_name
        FROM users u
        LEFT JOIN programs p ON u.program_id = p.id
        WHERE u.id = ?
    ");
    $stmt->execute([$studentId]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$student) {
        echo json_encode(['error' => 'Student not found']);
        return;
    }

    // Get all enrollments with final grades
    $stmt = $pdo->prepare("
        SELECT 
            s.semester,
            s.code as subject_code,
            s.name as subject_name,
            s.credits,
            se.final_percentage as score,
            se.final_grade as letter_grade,
            se.status,
            CASE 
                WHEN se.final_percentage >= 90 THEN 4.0
                WHEN se.final_percentage >= 80 THEN 3.7
                WHEN se.final_percentage >= 70 THEN 3.0
                WHEN se.final_percentage >= 60 THEN 2.3
                WHEN se.final_percentage >= 50 THEN 1.0
                ELSE 0.0
            END as grade_points
        FROM student_enrollments se
        JOIN subjects s ON se.subject_id = s.id
        WHERE se.user_id = ?
        ORDER BY s.semester ASC, s.name
    ");
    $stmt->execute([$studentId]);
    $allGrades = $stmt->fetchAll(PDO::FETCH_ASSOC);
// Group by semester
    $semesters = [];
    foreach ($allGrades as $grade) {
        $sem = $grade['semester'] ?? 1;
        if (!isset($semesters[$sem])) {
            $semesters[$sem] = [
                'semester' => $sem,
                'academic_year' => date('Y'),
                'courses' => [],
                'semester_gpa' => 0,
                'credits' => 0
            ];
        }
        $semesters[$sem]['courses'][] = $grade;
    }

    // Calculate semester GPAs
    foreach ($semesters as &$sem) {
        $points = 0;
        $credits = 0;
        foreach ($sem['courses'] as $course) {
            if ($course['score'] !== null) {
                $c = $course['credits'] ?? 3;
                $points += $course['grade_points'] * $c;
                $credits += $c;
            }
        }
        $sem['semester_gpa'] = $credits > 0 ? round($points / $credits, 2) : 0;
        $sem['credits'] = $credits;
    }

    // Calculate cumulative GPA
    $totalPoints = 0;
    $totalCredits = 0;
    foreach ($allGrades as $grade) {
        if ($grade['score'] !== null) {
            $c = $grade['credits'] ?? 3;
            $totalPoints += $grade['grade_points'] * $c;
            $totalCredits += $c;
        }
    }
    $cgpa = $totalCredits > 0 ? round($totalPoints / $totalCredits, 2) : 0;
    echo json_encode([
        'success' => true,
        'data' => [
            'report_type' => 'Academic Transcript',
            'generated_at' => date('Y-m-d H:i:s'),
            'institution' => 'Student Data Mining University',
            'student' => [
                'id' => $student['id'],
                'name' => $student['full_name'] ?? 'Student',
                'email' => $student['email'] ?? '',
                'program' => $student['program_name'] ?? 'N/A',
                'enrollment_date' => $student['created_at'] ?? date('Y-m-d')
            ],
            'semesters' => array_values($semesters),
            'summary' => [
                'cgpa' => $cgpa,
                'total_credits_earned' => $totalCredits,
                'total_courses' => count($allGrades),
                'standing' => getAcademicStanding($cgpa)
            ]
        ]
    ]);
}

function generateAttendanceReport($pdo, $studentId)
{
    // Get student info
    $stmt = $pdo->prepare("
        SELECT u.full_name, p.name as program_name
        FROM users u
        LEFT JOIN programs p ON u.program_id = p.id
        WHERE u.id = ?
    ");
    $stmt->execute([$studentId]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);
// Get attendance by subject
    $stmt = $pdo->prepare("
        SELECT 
            s.code as subject_code,
            s.name as subject_name,
            COUNT(sa.id) as total_classes,
            SUM(CASE WHEN sa.status = 'present' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN sa.status = 'absent' THEN 1 ELSE 0 END) as absent,
            SUM(CASE WHEN sa.status = 'late' THEN 1 ELSE 0 END) as late,
            SUM(CASE WHEN sa.status = 'excused' THEN 1 ELSE 0 END) as excused
        FROM student_enrollments se
        JOIN subjects s ON se.subject_id = s.id
        LEFT JOIN student_attendance sa ON sa.enrollment_id = se.id
        WHERE se.user_id = ?
        GROUP BY s.id, s.code, s.name
    ");
    $stmt->execute([$studentId]);
    $subjectAttendance = $stmt->fetchAll(PDO::FETCH_ASSOC);
// Calculate percentages
    foreach ($subjectAttendance as &$subject) {
        $subject['percentage'] = $subject['total_classes'] > 0
            ? round(($subject['present'] / $subject['total_classes']) * 100, 1)
            : 100;
        $subject['status'] = $subject['percentage'] >= 75 ? 'Good Standing' : 'Warning';
    }

    // Get monthly breakdown
    $stmt = $pdo->prepare("
        SELECT 
            DATE_FORMAT(sa.attendance_date, '%Y-%m') as month,
            COUNT(*) as total,
            SUM(CASE WHEN sa.status = 'present' THEN 1 ELSE 0 END) as present
        FROM student_attendance sa
        JOIN student_enrollments se ON sa.enrollment_id = se.id
        WHERE se.user_id = ?
        GROUP BY DATE_FORMAT(sa.attendance_date, '%Y-%m')
        ORDER BY month DESC
        LIMIT 6
    ");
    $stmt->execute([$studentId]);
    $monthlyData = $stmt->fetchAll(PDO::FETCH_ASSOC);
// Calculate overall
    $totalClasses = array_sum(array_column($subjectAttendance, 'total_classes'));
    $totalPresent = array_sum(array_column($subjectAttendance, 'present'));
    $overallPercentage = $totalClasses > 0 ? round(($totalPresent / $totalClasses) * 100, 1) : 100;
    echo json_encode([
        'success' => true,
        'data' => [
            'report_type' => 'Attendance Report',
            'generated_at' => date('Y-m-d H:i:s'),
            'student' => [
                'name' => $student['full_name'] ?? 'Student',
                'program' => $student['program_name'] ?? 'N/A'
            ],
            'summary' => [
                'overall_percentage' => $overallPercentage,
                'total_classes' => $totalClasses,
                'total_present' => $totalPresent,
                'status' => $overallPercentage >= 75 ? 'Good Standing' : 'Attendance Warning'
            ],
            'by_subject' => $subjectAttendance,
            'monthly_trend' => $monthlyData
        ]
    ]);
}

function generatePerformanceReport($pdo, $studentId)
{
    // Get component-level grades using actual schema (student_grades + evaluation_criteria)
    $stmt = $pdo->prepare("
        SELECT 
            s.name as subject_name,
            s.code as subject_code,
            ec.component_name,
            sg.marks_obtained as score,
            ec.max_marks,
            sg.graded_at as updated_at
        FROM student_grades sg
        JOIN evaluation_criteria ec ON sg.criteria_id = ec.id
        JOIN student_enrollments se ON sg.enrollment_id = se.id
        JOIN subjects s ON se.subject_id = s.id
        WHERE se.user_id = ?
        ORDER BY s.name, ec.component_name
    ");
    $stmt->execute([$studentId]);
    $grades = $stmt->fetchAll(PDO::FETCH_ASSOC);
// Group by subject
    $subjects = [];
    foreach ($grades as $grade) {
        $name = $grade['subject_name'];
        if (!isset($subjects[$name])) {
            $subjects[$name] = [
                'code' => $grade['subject_code'],
                'name' => $name,
                'components' => [],
                'average' => 0
            ];
        }
        if ($grade['score'] !== null && $grade['max_marks'] > 0) {
            $percentage = round(($grade['score'] / $grade['max_marks']) * 100, 1);
            $subjects[$name]['components'][$grade['component_name']] = $percentage;
        }
    }

    // Calculate averages
    foreach ($subjects as &$subject) {
        $scores = array_filter($subject['components']);
        $subject['average'] = count($scores) > 0 ? round(array_sum($scores) / count($scores), 1) : 0;
    }

    // Get strengths and weaknesses
    $subjectList = array_values($subjects);
    usort($subjectList, fn($a, $b) => $b['average'] - $a['average']);
    $strengths = array_slice($subjectList, 0, 3);
    $weaknesses = array_slice(array_reverse($subjectList), 0, 3);
// Overall average
    $overallAvg = count($subjectList) > 0
        ? round(array_sum(array_column($subjectList, 'average')) / count($subjectList), 1)
        : 0;
    echo json_encode([
        'success' => true,
        'data' => [
            'report_type' => 'Performance Analysis Report',
            'generated_at' => date('Y-m-d H:i:s'),
            'subjects' => array_values($subjects),
            'analysis' => [
                'strengths' => $strengths,
                'areas_for_improvement' => $weaknesses,
                'overall_average' => $overallAvg
            ],
            'recommendations' => generateRecommendations($weaknesses)
        ]
    ]);
}

function getAcademicRemarks($gpa, $attendance)
{
    $remarks = [];
    if ($gpa >= 3.5) {
        $remarks[] = "Excellent academic performance - Dean's List eligible";
    } elseif ($gpa >= 3.0) {
        $remarks[] = "Good academic standing";
    } elseif ($gpa >= 2.0) {
        $remarks[] = "Satisfactory performance - Room for improvement";
    } elseif ($gpa > 0) {
        $remarks[] = "Academic probation warning - Immediate improvement required";
    } else {
        $remarks[] = "No grades recorded yet";
    }

    if ($attendance >= 90) {
        $remarks[] = "Outstanding attendance record";
    } elseif ($attendance >= 75) {
        $remarks[] = "Attendance meets minimum requirements";
    } else {
        $remarks[] = "Attendance below required minimum - Risk of course withdrawal";
    }

    return $remarks;
}

function getAcademicStanding($cgpa)
{
    if ($cgpa >= 3.7) {
        return 'Summa Cum Laude';
    }
    if ($cgpa >= 3.5) {
        return 'Magna Cum Laude';
    }
    if ($cgpa >= 3.3) {
        return 'Cum Laude';
    }
    if ($cgpa >= 2.0) {
        return 'Good Standing';
    }
    if ($cgpa > 0) {
        return 'Academic Probation';
    }
    return 'No Grades Yet';
}

function generateRecommendations($weakSubjects)
{
    $recommendations = [];
    foreach ($weakSubjects as $subject) {
        if ($subject['average'] > 0 && $subject['average'] < 60) {
            $recommendations[] = "Consider tutoring for {$subject['name']}";
        } elseif ($subject['average'] > 0 && $subject['average'] < 70) {
            $recommendations[] = "Additional practice recommended for {$subject['name']}";
        }
    }
    if (empty($recommendations)) {
        $recommendations[] = "Continue maintaining current study habits";
        $recommendations[] = "Consider challenging yourself with advanced coursework";
    }
    return $recommendations;
}
