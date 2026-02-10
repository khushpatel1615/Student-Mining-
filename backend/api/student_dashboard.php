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
 * Helper to get attendance stats from DB
 */
function getSubjectAttendanceFromDb($pdo, $userId, $subjectId)
{
    $stats = [
        'present' => 0,
        'absent' => 0,
        'late' => 0,
        'excused' => 0,
        'total_classes' => 0,
        'percentage' => 0,
        'records' => []
    ];

    $stmt = $pdo->prepare("
        SELECT sa.attendance_date, sa.status
        FROM student_attendance sa
        JOIN student_enrollments se ON se.id = sa.enrollment_id
        WHERE se.user_id = ? AND se.subject_id = ?
        ORDER BY sa.attendance_date
    ");
    $stmt->execute([$userId, $subjectId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as $row) {
        $stats['total_classes']++;
        $status = $row['status'];
        if ($status === 'present') {
            $stats['present']++;
        } elseif ($status === 'absent') {
            $stats['absent']++;
        } elseif ($status === 'late') {
            $stats['late']++;
        } elseif ($status === 'excused') {
            $stats['excused']++;
        }
        $stats['records'][] = [
            'date' => $row['attendance_date'],
            'status' => $status
        ];
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

    // Optional analytics action
    if (isset($_GET['action']) && $_GET['action'] === 'analytics') {
        handleAnalytics($pdo, $dataDir, $userId);
        return;
    }
    if (isset($_GET['action']) && $_GET['action'] === 'analytics_stream') {
        handleAnalyticsStream($pdo, $dataDir, $userId);
        return;
    }

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
                    if ($componentPercent > 100) {
                        $componentPercent = 100;
                    } elseif ($componentPercent < 0) {
                        $componentPercent = 0;
                    }
                    $weightedScore += ($componentPercent * $comp['weight_percentage']) / 100;
                    $totalWeight += $comp['weight_percentage'];
                }
            }

            if ($totalWeight > 0) {
                $overallPercentage = round(($weightedScore / $totalWeight) * 100, 2);
                if ($overallPercentage > 100) {
                    $overallPercentage = 100;
                } elseif ($overallPercentage < 0) {
                    $overallPercentage = 0;
                }
                $subjectData['overall_grade'] = $overallPercentage;

                $gradeData = calculateGrade($overallPercentage); // Returns letter and points (0-10)
                $subjectData['grade_letter'] = $gradeData['letter'];

                // Track for GPA (weighted by credits)
                $gradePointsSum += ($gradeData['points'] * $subject['credits']);
                $earnedCredits += $subject['credits'];
            }

            // Real Attendance from DB
            $attStats = getSubjectAttendanceFromDb($pdo, $userId, $subject['id']);
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

function handleAnalytics($pdo, $dataDir, $userId)
{
    $range = isset($_GET['range']) ? $_GET['range'] : '30d'; // 7d, 30d, term
    $requestedSemester = isset($_GET['semester']) ? intval($_GET['semester']) : null;
    $data = buildAnalyticsData($pdo, $dataDir, $userId, $range, $requestedSemester);

    sendResponse([
        'success' => true,
        'data' => $data
    ]);
}

function handleAnalyticsStream($pdo, $dataDir, $userId)
{
    $range = isset($_GET['range']) ? $_GET['range'] : '30d'; // 7d, 30d, term
    $requestedSemester = isset($_GET['semester']) ? intval($_GET['semester']) : null;

    @ini_set('output_buffering', 'off');
    @ini_set('zlib.output_compression', 0);
    while (ob_get_level() > 0) {
        ob_end_flush();
    }
    ob_implicit_flush(true);
    set_time_limit(0);

    header('Content-Type: text/event-stream');
    header('Cache-Control: no-cache');
    header('Connection: keep-alive');
    header('X-Accel-Buffering: no');

    $retryMs = 5000;
    echo "retry: {$retryMs}\n\n";
    flush();

    while (true) {
        if (connection_aborted()) {
            break;
        }

        $payload = buildAnalyticsData($pdo, $dataDir, $userId, $range, $requestedSemester);
        echo "event: analytics\n";
        echo "data: " . json_encode(['success' => true, 'data' => $payload]) . "\n\n";
        flush();

        sleep(15);
    }
}

function buildAnalyticsData($pdo, $dataDir, $userId, $range, $requestedSemester)
{
    // 1. Get student profile
    $stmt = $pdo->prepare("
        SELECT 
            u.id, u.email, u.full_name, u.avatar_url, u.student_id, 
            u.program_id, u.current_semester, u.created_at as enrollment_date,
            p.name as program_name, p.code as program_code
        FROM users u
        LEFT JOIN programs p ON u.program_id = p.id
        WHERE u.id = ?
    ");
    $stmt->execute([$userId]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student || !$student['program_id']) {
        return [
            'enrolled' => false,
            'summary' => [],
            'trends' => ['grades' => [], 'attendance' => [], 'risk' => []]
        ];
    }

    $semester = $requestedSemester ?: ($student['current_semester'] ?? 1);

    // 2. Fetch subjects for semester
    $stmt = $pdo->prepare("
        SELECT id, name, code, credits 
        FROM subjects 
        WHERE program_id = ? AND semester = ? AND is_active = 1
    ");
    $stmt->execute([$student['program_id'], $semester]);
    $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Attendance trend from DB (date -> present/total)
    $attendanceByDate = [];
    $totalPresentOverall = 0;
    $totalClassesOverall = 0;

    $stmt = $pdo->prepare("
        SELECT sa.attendance_date as date,
               SUM(CASE WHEN sa.status = 'present' THEN 1 ELSE 0 END) AS present,
               COUNT(*) AS total
        FROM student_attendance sa
        JOIN student_enrollments se ON se.id = sa.enrollment_id
        JOIN subjects s ON s.id = se.subject_id
        WHERE se.user_id = ? AND s.program_id = ? AND s.semester = ?
        GROUP BY sa.attendance_date
        ORDER BY sa.attendance_date
    ");
    $stmt->execute([$userId, $student['program_id'], $semester]);
    $attendanceRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($attendanceRows as $row) {
        $date = $row['date'];
        $present = (int) $row['present'];
        $total = (int) $row['total'];
        $attendanceByDate[$date] = ['present' => $present, 'total' => $total];
        $totalPresentOverall += $present;
        $totalClassesOverall += $total;
    }

    // 4. Grade trend from student_grades (graded_at -> avg percent)
    $gradeByDate = [];
    $stmt = $pdo->prepare("
        SELECT sg.graded_at, sg.marks_obtained, ec.max_marks
        FROM student_enrollments se
        JOIN student_grades sg ON sg.enrollment_id = se.id
        JOIN evaluation_criteria ec ON ec.id = sg.criteria_id
        WHERE se.user_id = ? AND sg.graded_at IS NOT NULL
    ");
    $stmt->execute([$userId]);
    $grades = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($grades as $g) {
        if ($g['max_marks'] <= 0 || $g['marks_obtained'] === null) {
            continue;
        }
        $date = substr($g['graded_at'], 0, 10);
        $pct = ($g['marks_obtained'] / $g['max_marks']) * 100;
        if (!isset($gradeByDate[$date])) {
            $gradeByDate[$date] = ['sum' => 0, 'count' => 0];
        }
        $gradeByDate[$date]['sum'] += $pct;
        $gradeByDate[$date]['count'] += 1;
    }

    // 5. Determine date window
    $dateWindow = getDateWindow($range, array_keys($attendanceByDate), array_keys($gradeByDate));
    $startDate = $dateWindow['start'];
    $endDate = $dateWindow['end'];

    // 6. Build trend arrays
    $attendanceTrend = [];
    foreach ($attendanceByDate as $date => $vals) {
        if ($date < $startDate || $date > $endDate) continue;
        $pct = $vals['total'] > 0 ? round(($vals['present'] / $vals['total']) * 100, 1) : 0;
        $attendanceTrend[] = ['t' => $date, 'value' => $pct];
    }
    usort($attendanceTrend, function ($a, $b) { return strcmp($a['t'], $b['t']); });

    $gradeTrend = [];
    foreach ($gradeByDate as $date => $vals) {
        if ($date < $startDate || $date > $endDate) continue;
        $avg = $vals['count'] > 0 ? round($vals['sum'] / $vals['count'], 1) : 0;
        $gradeTrend[] = ['t' => $date, 'value' => $avg];
    }
    usort($gradeTrend, function ($a, $b) { return strcmp($a['t'], $b['t']); });

    // 7. Summary metrics
    $overallAttendance = $totalClassesOverall > 0
        ? round(($totalPresentOverall / $totalClassesOverall) * 100, 1)
        : 0;

    $latestGrade = !empty($gradeTrend) ? $gradeTrend[count($gradeTrend) - 1]['value'] : 0;
    $riskScore = calculateRiskScore($overallAttendance, $latestGrade);
    $riskLabel = getRiskLabel($riskScore);
    $engagement = getEngagementLevel($overallAttendance, $latestGrade);

    // 8. Risk trend (merge dates)
    $riskTrend = [];
    $allDates = array_unique(array_merge(
        array_map(function ($x) { return $x['t']; }, $attendanceTrend),
        array_map(function ($x) { return $x['t']; }, $gradeTrend)
    ));
    sort($allDates);
    $lastAttendance = $overallAttendance;
    $lastGrade = $latestGrade;
    foreach ($allDates as $date) {
        foreach ($attendanceTrend as $a) {
            if ($a['t'] === $date) {
                $lastAttendance = $a['value'];
                break;
            }
        }
        foreach ($gradeTrend as $g) {
            if ($g['t'] === $date) {
                $lastGrade = $g['value'];
                break;
            }
        }
        $riskTrend[] = ['t' => $date, 'value' => calculateRiskScore($lastAttendance, $lastGrade)];
    }

    $insights = buildInsights($gradeTrend, $attendanceTrend, $riskScore, $riskLabel, $overallAttendance, $latestGrade);

    return [
        'enrolled' => true,
        'summary' => [
            'attendance_rate' => $overallAttendance,
            'average_grade' => $latestGrade,
            'risk_score' => $riskScore,
            'risk_label' => $riskLabel,
            'engagement' => $engagement,
            'updated_at' => date('c')
        ],
        'insights' => $insights,
        'trends' => [
            'grades' => $gradeTrend,
            'attendance' => $attendanceTrend,
            'risk' => $riskTrend
        ],
        'meta' => [
            'range' => $range,
            'semester' => $semester
        ]
    ];
}

function buildInsights($gradeTrend, $attendanceTrend, $riskScore, $riskLabel, $overallAttendance, $latestGrade)
{
    $insights = [];

    // Grade trend insight
    if (count($gradeTrend) >= 2) {
        $last = $gradeTrend[count($gradeTrend) - 1]['value'];
        $prev = $gradeTrend[count($gradeTrend) - 2]['value'];
        if ($prev > 0) {
            $delta = (($last - $prev) / $prev) * 100;
            if ($delta >= 2) {
                $insights[] = [
                    'type' => 'grade_improvement',
                    'tone' => 'success',
                    'title' => 'Grade Improvement',
                    'message' => 'Your grades improved by ' . round($delta, 1) . '% since the last assessment.'
                ];
            } elseif ($delta <= -2) {
                $insights[] = [
                    'type' => 'grade_drop',
                    'tone' => 'warning',
                    'title' => 'Grade Dip',
                    'message' => 'Your grades dropped by ' . abs(round($delta, 1)) . '% since the last assessment.'
                ];
            }
        }
    }

    // Attendance insight
    if ($overallAttendance > 0) {
        if ($overallAttendance < 90) {
            $insights[] = [
                'type' => 'attendance_watch',
                'tone' => 'warning',
                'title' => 'Attendance Watch',
                'message' => 'Your attendance is ' . $overallAttendance . '%. Try to stay above 90% to avoid risk.'
            ];
        } elseif ($overallAttendance >= 95) {
            $insights[] = [
                'type' => 'attendance_strong',
                'tone' => 'success',
                'title' => 'Great Attendance',
                'message' => 'Your attendance is excellent at ' . $overallAttendance . '%. Keep it up!'
            ];
        }
    }

    // Risk insight
    if ($riskScore >= 70) {
        $insights[] = [
            'type' => 'risk_high',
            'tone' => 'danger',
            'title' => 'High Risk Alert',
            'message' => 'Your risk score is ' . $riskScore . '. Consider scheduling a check-in with your advisor.'
        ];
    } elseif ($riskScore >= 40) {
        $insights[] = [
            'type' => 'risk_moderate',
            'tone' => 'warning',
            'title' => 'Moderate Risk',
            'message' => 'Your risk score is ' . $riskScore . '. Focus on consistent attendance and assessments.'
        ];
    } else {
        $insights[] = [
            'type' => 'risk_safe',
            'tone' => 'success',
            'title' => 'Low Risk',
            'message' => 'You are in the safe zone. Keep your current momentum.'
        ];
    }

    // If no grade trend, add a neutral insight
    if (empty($gradeTrend)) {
        $insights[] = [
            'type' => 'no_grades',
            'tone' => 'neutral',
            'title' => 'Grades Pending',
            'message' => 'No graded assessments yet. Insights will appear after your first marks are uploaded.'
        ];
    }

    return $insights;
}

function calculateGrade($percentage)
{
    if ($percentage >= 90) {
        return ['letter' => 'A+', 'points' => 10];
    }
    if ($percentage >= 80) {
        return ['letter' => 'A', 'points' => 9];
    }
    if ($percentage >= 70) {
        return ['letter' => 'B+', 'points' => 8];
    }
    if ($percentage >= 60) {
        return ['letter' => 'B', 'points' => 7];
    }
    if ($percentage >= 50) {
        return ['letter' => 'C', 'points' => 6];
    }
    if ($percentage >= 40) {
        return ['letter' => 'D', 'points' => 5];
    }
    return ['letter' => 'F', 'points' => 0];
}

function getDateWindow($range, $attendanceDates, $gradeDates)
{
    $today = date('Y-m-d');
    if ($range === '7d') {
        return ['start' => date('Y-m-d', strtotime('-6 days')), 'end' => $today];
    }
    if ($range === '30d') {
        return ['start' => date('Y-m-d', strtotime('-29 days')), 'end' => $today];
    }

    // term: pick earliest date we have, fallback to 120 days
    $allDates = array_merge($attendanceDates, $gradeDates);
    sort($allDates);
    if (!empty($allDates)) {
        return ['start' => $allDates[0], 'end' => $today];
    }
    return ['start' => date('Y-m-d', strtotime('-120 days')), 'end' => $today];
}

function calculateRiskScore($attendanceRate, $gradePercent)
{
    $attendanceRate = max(0, min(100, $attendanceRate));
    $gradePercent = max(0, min(100, $gradePercent));
    $score = 100 - (($attendanceRate * 0.6) + ($gradePercent * 0.4));
    return round(max(0, min(100, $score)), 1);
}

function getRiskLabel($riskScore)
{
    if ($riskScore >= 70) return 'High Risk';
    if ($riskScore >= 40) return 'Moderate';
    return 'Safe';
}

function getEngagementLevel($attendanceRate, $gradePercent)
{
    if ($attendanceRate >= 90 && $gradePercent >= 75) return 'High';
    if ($attendanceRate >= 75 && $gradePercent >= 60) return 'Medium';
    return 'Low';
}

function getGPAGrade($gpa)
{
    if ($gpa >= 9.0) {
        return 'Outstanding';
    }
    if ($gpa >= 8.0) {
        return 'Excellent';
    }
    if ($gpa >= 7.0) {
        return 'Very Good';
    }
    if ($gpa >= 6.0) {
        return 'Good';
    }
    if ($gpa >= 5.0) {
        return 'Average';
    }
    return 'Needs Improvement';
}
