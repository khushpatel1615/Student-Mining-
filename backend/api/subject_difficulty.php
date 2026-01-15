<?php
/**
 * Subject Difficulty Ranking API
 * Analyzes and ranks subjects by difficulty based on student performance
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

    $programId = $_GET['program_id'] ?? null;

    // Get subject difficulty rankings
    $rankings = getSubjectDifficultyRankings($pdo, $programId);

    echo json_encode([
        'success' => true,
        'data' => $rankings
    ]);
}

function getSubjectDifficultyRankings($pdo, $programId = null)
{
    try {
        $sql = "
            SELECT 
                s.id,
                s.code,
                s.name,
                s.credits,
                COUNT(DISTINCT se.user_id) as total_students,
                AVG(g.grade) as average_grade,
                MIN(g.grade) as lowest_grade,
                MAX(g.grade) as highest_grade,
                STDDEV(g.grade) as grade_std_dev,
                SUM(CASE WHEN g.grade >= 50 THEN 1 ELSE 0 END) as pass_count,
                SUM(CASE WHEN g.grade < 50 THEN 1 ELSE 0 END) as fail_count,
                AVG(sa.attendance_percentage) as avg_attendance
            FROM subjects s
            LEFT JOIN student_enrollments se ON s.id = se.subject_id AND se.status = 'active'
            LEFT JOIN grades g ON se.id = g.enrollment_id
            LEFT JOIN (
                SELECT 
                    enrollment_id,
                    (COUNT(CASE WHEN status = 'present' THEN 1 END) * 100.0 / COUNT(*)) as attendance_percentage
                FROM student_attendance
                GROUP BY enrollment_id
            ) sa ON se.id = sa.enrollment_id
        ";

        if ($programId) {
            $sql .= " WHERE s.program_id = ?";
        }

        $sql .= "
            GROUP BY s.id
            HAVING total_students > 0
            ORDER BY average_grade ASC
        ";

        $stmt = $pdo->prepare($sql);
        if ($programId) {
            $stmt->execute([$programId]);
        } else {
            $stmt->execute();
        }

        $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate difficulty scores and rankings
        $rankings = [];
        foreach ($subjects as $index => $subject) {
            $avgGrade = $subject['average_grade'] ?? 0;
            $passRate = $subject['total_students'] > 0
                ? ($subject['pass_count'] / $subject['total_students']) * 100
                : 0;
            $stdDev = $subject['grade_std_dev'] ?? 0;
            $avgAttendance = $subject['avg_attendance'] ?? 100;

            // Calculate difficulty score (0-100, higher = more difficult)
            // Factors: low avg grade, low pass rate, high std dev, low attendance
            $difficultyScore = 0;
            $difficultyScore += (100 - $avgGrade) * 0.4; // 40% weight
            $difficultyScore += (100 - $passRate) * 0.3; // 30% weight
            $difficultyScore += min($stdDev, 30) * 0.2; // 20% weight (capped at 30)
            $difficultyScore += (100 - $avgAttendance) * 0.1; // 10% weight

            // Determine difficulty level
            $difficultyLevel = 'Easy';
            if ($difficultyScore >= 60) {
                $difficultyLevel = 'Very Hard';
            } elseif ($difficultyScore >= 45) {
                $difficultyLevel = 'Hard';
            } elseif ($difficultyScore >= 30) {
                $difficultyLevel = 'Medium';
            }

            $rankings[] = [
                'rank' => $index + 1,
                'id' => $subject['id'],
                'code' => $subject['code'],
                'name' => $subject['name'],
                'credits' => $subject['credits'],
                'difficulty_score' => round($difficultyScore, 1),
                'difficulty_level' => $difficultyLevel,
                'statistics' => [
                    'total_students' => (int) $subject['total_students'],
                    'average_grade' => round($avgGrade, 1),
                    'lowest_grade' => round($subject['lowest_grade'] ?? 0, 1),
                    'highest_grade' => round($subject['highest_grade'] ?? 0, 1),
                    'pass_rate' => round($passRate, 1),
                    'fail_count' => (int) $subject['fail_count'],
                    'avg_attendance' => round($avgAttendance, 1)
                ]
            ];
        }

        return $rankings;
    } catch (PDOException $e) {
        return [];
    }
}
?>