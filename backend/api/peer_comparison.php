<?php
/**
 * Peer Comparison API Enhancement
 * Provides detailed peer comparison with percentile rankings and similar students
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
    if (!$user || $user['role'] !== 'student') {
        http_response_code(403);
        echo json_encode(['error' => 'Students only']);
        return;
    }

    $studentId = $user['user_id'];

    // Get student's program
    $stmt = $pdo->prepare("SELECT program_id FROM users WHERE id = ?");
    $stmt->execute([$studentId]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) {
        http_response_code(404);
        echo json_encode(['error' => 'Student not found']);
        return;
    }

    $programId = $student['program_id'];

    // Calculate percentile rankings
    $percentiles = calculatePercentiles($pdo, $studentId, $programId);

    // Find similar students
    $similarStudents = findSimilarStudents($pdo, $studentId, $programId);

    // Get anonymous leaderboard
    $leaderboard = getAnonymousLeaderboard($pdo, $programId, $studentId);

    echo json_encode([
        'success' => true,
        'data' => [
            'percentiles' => $percentiles,
            'similar_students' => $similarStudents,
            'leaderboard' => $leaderboard
        ]
    ]);
}

function calculatePercentiles($pdo, $studentId, $programId)
{
    try {
        // Overall GPA percentile
        $stmt = $pdo->prepare("
            SELECT 
                (SELECT AVG(g.grade) FROM grades g 
                 JOIN student_enrollments se ON g.enrollment_id = se.id 
                 WHERE se.user_id = ?) as my_avg,
                AVG(g.grade) as class_avg,
                COUNT(DISTINCT se.user_id) as total_students
            FROM grades g
            JOIN student_enrollments se ON g.enrollment_id = se.id
            JOIN users u ON se.user_id = u.id
            WHERE u.program_id = ? AND u.role = 'student'
        ");
        $stmt->execute([$studentId, $programId]);
        $gpaData = $stmt->fetch(PDO::FETCH_ASSOC);

        $myAvg = $gpaData['my_avg'] ?? 0;

        // Calculate percentile
        $stmt = $pdo->prepare("
            SELECT COUNT(DISTINCT se.user_id) as better_students
            FROM grades g
            JOIN student_enrollments se ON g.enrollment_id = se.id
            JOIN users u ON se.user_id = u.id
            WHERE u.program_id = ? AND u.role = 'student'
            GROUP BY se.user_id
            HAVING AVG(g.grade) > ?
        ");
        $stmt->execute([$programId, $myAvg]);
        $betterStudents = $stmt->rowCount();

        $totalStudents = $gpaData['total_students'] ?? 1;
        $gpaPercentile = $totalStudents > 0 ? round((($totalStudents - $betterStudents) / $totalStudents) * 100) : 50;

        // Attendance percentile
        $stmt = $pdo->prepare("
            SELECT 
                (SELECT 
                    (COUNT(CASE WHEN sa.status = 'present' THEN 1 END) * 100.0 / COUNT(*))
                 FROM student_attendance sa
                 JOIN student_enrollments se ON sa.enrollment_id = se.id
                 WHERE se.user_id = ?) as my_attendance,
                AVG(
                    (COUNT(CASE WHEN sa.status = 'present' THEN 1 END) * 100.0 / COUNT(*))
                ) as class_avg_attendance
            FROM student_attendance sa
            JOIN student_enrollments se ON sa.enrollment_id = se.id
            JOIN users u ON se.user_id = u.id
            WHERE u.program_id = ? AND u.role = 'student'
            GROUP BY se.user_id
        ");
        $stmt->execute([$studentId, $programId]);
        $attendanceData = $stmt->fetch(PDO::FETCH_ASSOC);

        $myAttendance = $attendanceData['my_attendance'] ?? 100;
        $attendancePercentile = $myAttendance >= 90 ? 75 : ($myAttendance >= 75 ? 50 : 25);

        // Subject-wise percentiles
        $subjectPercentiles = [];
        $stmt = $pdo->prepare("
            SELECT DISTINCT s.id, s.code, s.name
            FROM subjects s
            JOIN student_enrollments se ON s.id = se.subject_id
            WHERE se.user_id = ?
        ");
        $stmt->execute([$studentId]);
        $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($subjects as $subject) {
            $stmt = $pdo->prepare("
                SELECT 
                    (SELECT AVG(g.grade) 
                     FROM grades g 
                     JOIN student_enrollments se ON g.enrollment_id = se.id
                     WHERE se.user_id = ? AND se.subject_id = ?) as my_grade,
                    AVG(g.grade) as class_avg
                FROM grades g
                JOIN student_enrollments se ON g.enrollment_id = se.id
                WHERE se.subject_id = ?
            ");
            $stmt->execute([$studentId, $subject['id'], $subject['id']]);
            $subjectData = $stmt->fetch(PDO::FETCH_ASSOC);

            $myGrade = $subjectData['my_grade'] ?? 0;
            $classAvg = $subjectData['class_avg'] ?? 0;

            $percentile = $classAvg > 0 ? round(($myGrade / $classAvg) * 50) : 50;

            $subjectPercentiles[] = [
                'subject_code' => $subject['code'],
                'subject_name' => $subject['name'],
                'my_grade' => round($myGrade, 1),
                'class_average' => round($classAvg, 1),
                'percentile' => min(100, max(0, $percentile))
            ];
        }

        return [
            'overall_gpa_percentile' => $gpaPercentile,
            'attendance_percentile' => $attendancePercentile,
            'subject_percentiles' => $subjectPercentiles,
            'interpretation' => getPercentileInterpretation($gpaPercentile)
        ];
    } catch (PDOException $e) {
        return [
            'overall_gpa_percentile' => 50,
            'attendance_percentile' => 50,
            'subject_percentiles' => [],
            'interpretation' => 'Average'
        ];
    }
}

function getPercentileInterpretation($percentile)
{
    if ($percentile >= 90)
        return "You're in the top 10% of your class! 🌟";
    if ($percentile >= 75)
        return "You're in the top 25% of your class! 🎯";
    if ($percentile >= 50)
        return "You're performing above average! 📈";
    if ($percentile >= 25)
        return "You're performing at average level 📊";
    return "There's room for improvement 💪";
}

function findSimilarStudents($pdo, $studentId, $programId)
{
    try {
        // Get student's average grade
        $stmt = $pdo->prepare("
            SELECT AVG(g.grade) as my_avg
            FROM grades g
            JOIN student_enrollments se ON g.enrollment_id = se.id
            WHERE se.user_id = ?
        ");
        $stmt->execute([$studentId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $myAvg = $result['my_avg'] ?? 0;

        // Find students with similar GPA (within 5 points)
        $stmt = $pdo->prepare("
            SELECT 
                s.id,
                s.code,
                s.name,
                COUNT(DISTINCT se2.user_id) as similar_students_count
            FROM subjects s
            JOIN student_enrollments se1 ON s.id = se1.subject_id
            JOIN student_enrollments se2 ON s.id = se2.subject_id
            JOIN users u ON se2.user_id = u.id
            JOIN grades g ON se2.id = g.enrollment_id
            WHERE se1.user_id = ?
            AND u.program_id = ?
            AND u.role = 'student'
            AND se2.user_id != ?
            GROUP BY s.id
            HAVING AVG(g.grade) BETWEEN ? AND ?
            ORDER BY similar_students_count DESC
            LIMIT 5
        ");
        $stmt->execute([$studentId, $programId, $studentId, $myAvg - 5, $myAvg + 5]);
        $popularCourses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'message' => 'Students like you also took:',
            'courses' => $popularCourses,
            'similarity_criteria' => 'Similar GPA range (±5 points)'
        ];
    } catch (PDOException $e) {
        return [
            'message' => 'Students like you also took:',
            'courses' => [],
            'similarity_criteria' => 'Similar GPA range'
        ];
    }
}

function getAnonymousLeaderboard($pdo, $programId, $currentStudentId)
{
    try {
        $stmt = $pdo->prepare("
            SELECT 
                AVG(g.grade) as avg_grade,
                se.user_id
            FROM grades g
            JOIN student_enrollments se ON g.enrollment_id = se.id
            JOIN users u ON se.user_id = u.id
            WHERE u.program_id = ? AND u.role = 'student'
            GROUP BY se.user_id
            ORDER BY avg_grade DESC
            LIMIT 10
        ");
        $stmt->execute([$programId]);
        $topStudents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $leaderboard = [];
        $currentStudentRank = null;

        foreach ($topStudents as $index => $student) {
            $isCurrentStudent = $student['user_id'] == $currentStudentId;

            $leaderboard[] = [
                'rank' => $index + 1,
                'grade' => round($student['avg_grade'], 1),
                'is_you' => $isCurrentStudent,
                'label' => $isCurrentStudent ? 'You' : 'Student ' . ($index + 1)
            ];

            if ($isCurrentStudent) {
                $currentStudentRank = $index + 1;
            }
        }

        return [
            'top_10' => $leaderboard,
            'your_rank' => $currentStudentRank,
            'total_students' => count($topStudents)
        ];
    } catch (PDOException $e) {
        return [
            'top_10' => [],
            'your_rank' => null,
            'total_students' => 0
        ];
    }
}
?>