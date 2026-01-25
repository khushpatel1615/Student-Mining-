<?php
/**
 * Student Dashboard API
 * Returns summary, subjects, grades and attendance for the logged-in student
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

// Enforce Student Role
requireRole('student');

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();
$DATA_DIR = __DIR__ . '/../data/attendance';

try {
    if ($method === 'GET') {
        handleGet($pdo, $DATA_DIR);
    } else {
        sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    sendError($e->getMessage(), 500);
}

/**
 * Helper to get attendance stats from CSV
 */
function getSubjectAttendanceFromCsv($dataDir, $subjectId, $studentIdKey)
{
    $file = $dataDir . "/attendance_subject_{$subjectId}.csv";
    $stats = [
        'present' => 0,
        'absent' => 0,
        'late' => 0,
        'excused' => 0,
        'total_classes' => 0,
        'percentage' => 0,
        'records' => []
    ];

    if (file_exists($file)) {
        if (($handle = fopen($file, "r")) !== FALSE) {
            $header = fgetcsv($handle);
            if ($header && count($header) > 2) {
                $dates = array_slice($header, 2);
                while (($row = fgetcsv($handle)) !== FALSE) {
                    if ($row[0] === $studentIdKey) {
                        foreach ($dates as $i => $date) {
                            $status = $row[$i + 2] ?? '-';
                            if ($status === '-')
                                continue;

                            $stats['total_classes']++;
                            if ($status === 'P')
                                $stats['present']++;
                            elseif ($status === 'A')
                                $stats['absent']++;
                            elseif ($status === 'E' || $status === 'L')
                                $stats['excused']++; // Simplified

                            $stats['records'][] = ['date' => $date, 'status' => $status];
                        }
                        break;
                    }
                }
            }
            fclose($handle);
        }
    }

    if ($stats['total_classes'] > 0) {
        $stats['percentage'] = round(($stats['present'] / $stats['total_classes']) * 100);
    }

    return $stats;
}

function handleGet($pdo, $dataDir)
{
    $auth = getAuthUser();
    $userId = $auth['user_id'];

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

    if (!$student) {
        sendError('User not found', 404);
    }

    // Determine CSV key (consistent with attendance.php)
    $studentIdKey = $student['student_id'] ?: $student['email'];

    if (!$student['program_id']) {
        sendResponse([
            'success' => true,
            'data' => [
                'enrolled' => false,
                'student' => [
                    'name' => $student['full_name'],
                    'email' => $student['email'],
                    'student_id' => $student['student_id'],
                    'enrollment_date' => $student['enrollment_date']
                ]
            ]
        ]);
        return;
    }

    $programId = $student['program_id'];
    $currentSemester = $student['current_semester'] ?? 1;
    $requestedSemester = isset($_GET['semester']) ? intval($_GET['semester']) : $currentSemester;

    // Use requested semester for fetching subjects
    $semester = $requestedSemester;

    // 2. Fetch Subjects for Selected Semester
    $stmt = $pdo->prepare("
        SELECT id, name, code, credits, subject_type, semester 
        FROM subjects 
        WHERE program_id = ? AND semester = ? AND is_active = 1
    ");
    $stmt->execute([$programId, $semester]);
    $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Process each subject
    $subjectsData = [];
    $totalPresentOverall = 0;
    $totalClassesOverall = 0;
    $totalCredits = 0;
    $earnedCredits = 0;
    $gradePointsSum = 0;

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
            'attendance' => ['present' => 0, 'total_classes' => 0, 'percentage' => 0]
        ];

        if ($enrollment) {
            $totalCredits += $subject['credits'];

            // Fetch Component Grades
            $stmt = $pdo->prepare("
                SELECT ec.component_name, ec.max_marks, ec.weight_percentage, sg.marks_obtained, sg.remarks, sg.graded_at
                FROM evaluation_criteria ec
                LEFT JOIN student_grades sg ON ec.id = sg.criteria_id AND sg.enrollment_id = ?
                WHERE ec.subject_id = ?
                ORDER BY ec.weight_percentage DESC
            ");
            $stmt->execute([$enrollment['id'], $subject['id']]);
            $subjectData['components'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Grade Calculation logic
            $totalWeight = 0;
            $weightedScore = 0;
            foreach ($subjectData['components'] as $comp) {
                if ($comp['marks_obtained'] !== null && $comp['max_marks'] > 0) {
                    $componentPercent = ($comp['marks_obtained'] / $comp['max_marks']) * 100;
                    $weightedScore += ($componentPercent * $comp['weight_percentage']) / 100;
                    $totalWeight += $comp['weight_percentage'];
                }
            }

            if ($totalWeight > 0) {
                $overallPercentage = round(($weightedScore / $totalWeight) * 100, 2);
                $subjectData['overall_grade'] = $overallPercentage;

                $gradeData = calculateGrade($overallPercentage); // Returns letter and points (0-10)
                $subjectData['grade_letter'] = $gradeData['letter'];

                // Track for GPA (weighted by credits)
                $gradePointsSum += ($gradeData['points'] * $subject['credits']);
                $earnedCredits += $subject['credits'];
            }

            // Real Attendance from CSV
            $attStats = getSubjectAttendanceFromCsv($dataDir, $subject['id'], $studentIdKey);
            $subjectData['attendance'] = $attStats;

            $totalPresentOverall += $attStats['present'];
            $totalClassesOverall += $attStats['total_classes'];
        }

        $subjectsData[] = $subjectData;
    }

    // Final Stats
    $overallAttendancePercent = $totalClassesOverall > 0
        ? round(($totalPresentOverall / $totalClassesOverall) * 100)
        : 0;

    $gpa10 = $earnedCredits > 0 ? round($gradePointsSum / $earnedCredits, 2) : 0;
    $gpa4 = round($gpa10 / 2.5, 2); // Quick conversion from 10.0 to 4.0

    sendResponse([
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
                'code' => $student['program_code']
            ],
            'semester' => $semester,
            'subjects' => $subjectsData,
            'summary' => [
                'gpa' => $gpa10,          // 10.0 scale for backward compat or detailed view
                'gpa_4' => $gpa4,         // 4.0 scale for frontend cards
                'gpa_text' => getGPAGrade($gpa10),
                'total_credits' => $totalCredits,
                'earned_credits' => $earnedCredits,
                'overall_attendance' => $overallAttendancePercent,
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