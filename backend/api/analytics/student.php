<?php
/**
 * Student Analytics API
 * Provides comprehensive analytics for student dashboard
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';
require_once __DIR__ . '/../includes/analytics.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    // Verify authentication
    $token = getTokenFromHeader();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'No token provided']);
        exit;
    }

    $result = verifyToken($token);
    if (!$result['valid']) {
        http_response_code(401);
        echo json_encode(['error' => $result['error']]);
        exit;
    }

    $user = $result['payload'];
    $userId = $user['id'];
    $role = $user['role'];

    // Students can only view their own analytics
    // Admins can view any student's analytics
    $targetStudentId = $_GET['student_id'] ?? $userId;

    if ($role === 'student' && $targetStudentId != $userId) {
        http_response_code(403);
        echo json_encode(['error' => 'Access denied']);
        exit;
    }

    $pdo = getDBConnection();

    // Get student info
    $stmt = $pdo->prepare("SELECT id, full_name, email, program_id, current_semester, enrollment_year 
                           FROM users WHERE id = ? AND role = 'student'");
    $stmt->execute([$targetStudentId]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) {
        http_response_code(404);
        echo json_encode(['error' => 'Student not found']);
        exit;
    }

    // Get all grades for the student
    $stmt = $pdo->prepare("SELECT g.*, s.name as subject_name, s.credits, s.semester as subject_semester
                           FROM grades g
                           JOIN subjects s ON g.subject_id = s.id  
                           WHERE g.student_id = ?
                           ORDER BY s.semester, s.name");
    $stmt->execute([$targetStudentId]);
    $allGrades = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get attendance data
    $stmt = $pdo->prepare("SELECT subject_id, 
                                  (SUM(status = 'present') / COUNT(*)) * 100 as attendance_percentage,
                                  SUM(status = 'present') as classes_attended,
                                  COUNT(*) as total_classes
                           FROM attendance
                           WHERE student_id = ?
                           GROUP BY subject_id");
    $stmt->execute([$targetStudentId]);
    $attendanceData = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Calculate overall metrics
    $currentSemester = intval($student['current_semester'] ?? 1);
    $currentSemesterGrades = array_filter($allGrades, function ($g) use ($currentSemester) {
        return intval($g['subject_semester'] ?? 1) === $currentSemester;
    });

    $cumulativeGPA = calculateGPA($allGrades, true);
    $semesterGPA = calculateGPA($currentSemesterGrades, true);

    // Get all student GPAs for percentile calculation
    $stmt = $pdo->query("SELECT g.student_id, AVG(g.grade) as avg_grade
                         FROM grades g
                         JOIN users u ON g.student_id = u.id
                         WHERE u.role = 'student' AND u.program_id = {$student['program_id']}
                         GROUP BY g.student_id");
    $allStudentGrades = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $allGPAs = array_map(function ($s) {
        return calculateGPA([['grade' => $s['avg_grade']]], false);
    }, $allStudentGrades);

    $percentile = calculatePercentile($cumulativeGPA, $allGPAs);
    $performanceTier = getPerformanceTier($cumulativeGPA);

    // Calculate attendance percentage
    $overallAttendance = 0;
    if (!empty($attendanceData)) {
        $totalPresent = array_sum(array_column($attendanceData, 'classes_attended'));
        $totalClasses = array_sum(array_column($attendanceData, 'total_classes'));
        $overallAttendance = $totalClasses > 0 ? ($totalPresent / $totalClasses) * 100 : 0;
    }

    // Identify at-risk subjects
    $atRiskSubjects = identifyAtRiskSubjects($currentSemesterGrades);

    // Generate predictions
    $predictions = [];

    // Predict final GPA
    if (count($allGrades) >= 2) {
        $semesterGPAs = [];
        for ($sem = 1; $sem <= $currentSemester; $sem++) {
            $semGrades = array_filter($allGrades, function ($g) use ($sem) {
                return intval($g['subject_semester'] ?? 1) === $sem;
            });
            if (!empty($semGrades)) {
                $semesterGPAs[] = ['grade' => calculateGPA($semGrades, true) * 25]; // Scale to 100
            }
        }

        if (count($semesterGPAs) >= 2) {
            $gpaPrediction = predictFinalGrade($semesterGPAs, $cumulativeGPA * 25);
            $predictions['gpa'] = [
                'predicted_gpa' => round($gpaPrediction['predicted_grade'] / 25, 2),
                'confidence' => $gpaPrediction['confidence'],
                'trend' => $gpaPrediction['trend']
            ];
        }
    }

    // Calculate what's needed for target GPA
    $targetGPA = 3.5; // Default target
    $creditsCompleted = array_sum(array_column($allGrades, 'credits'));
    $creditsRemaining = 120 - $creditsCompleted; // Assuming 120 credit program

    if ($creditsRemaining > 0) {
        $requiredGrade = calculateRequiredGrade($cumulativeGPA, $targetGPA, $creditsCompleted, $creditsRemaining);
        $predictions['target_gpa'] = array_merge(['target' => $targetGPA], $requiredGrade);
    }

    // Generate recommendations
    $recommendations = generateRecommendations($currentSemesterGrades, $attendanceData);

    // Subject-wise performance
    $subjectPerformance = array_map(function ($grade) {
        return [
            'subject_id' => $grade['subject_id'],
            'subject_name' => $grade['subject_name'],
            'grade' => floatval($grade['grade']),
            'letter_grade' => getLetterGrade(floatval($grade['grade'])),
            'gpa' => percentageToGPA(floatval($grade['grade'])),
            'credits' => intval($grade['credits'] ?? 3),
            'semester' => intval($grade['subject_semester'] ?? 1)
        ];
    }, $allGrades);

    // Semester progression
    $semesterProgression = [];
    for ($sem = 1; $sem <= $currentSemester; $sem++) {
        $semGrades = array_filter($allGrades, function ($g) use ($sem) {
            return intval($g['subject_semester'] ?? 1) === $sem;
        });

        if (!empty($semGrades)) {
            $semGPA = calculateGPA($semGrades, true);
            $semesterProgression[] = [
                'semester' => $sem,
                'gpa' => $semGPA,
                'credits' => array_sum(array_column($semGrades, 'credits')),
                'subjects_count' => count($semGrades)
            ];
        }
    }

    // Build response
    $analytics = [
        'student_info' => [
            'id' => $student['id'],
            'name' => $student['full_name'],
            'email' => $student['email'],
            'program_id' => $student['program_id'],
            'current_semester' => $currentSemester,
            'enrollment_year' => $student['enrollment_year']
        ],
        'performance_summary' => [
            'cumulative_gpa' => $cumulativeGPA,
            'semester_gpa' => $semesterGPA,
            'performance_tier' => $performanceTier,
            'percentile_rank' => $percentile,
            'credits_completed' => $creditsCompleted,
            'attendance_percentage' => round($overallAttendance, 2)
        ],
        'subject_performance' => $subjectPerformance,
        'semester_progression' => $semesterProgression,
        'at_risk_subjects' => $atRiskSubjects,
        'predictions' => $predictions,
        'recommendations' => $recommendations,
        'attendance' => $attendanceData
    ];

    echo json_encode([
        'success' => true,
        'data' => $analytics
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>