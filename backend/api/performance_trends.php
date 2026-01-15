<?php
/**
 * Performance Trends API
 * Provides grade trends, predictions, and performance analytics
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
    $subjectId = $_GET['subject_id'] ?? null;

    // Get enrolled subjects
    $stmt = $pdo->prepare("
        SELECT s.id, s.name, s.code, s.credits
        FROM subjects s
        JOIN student_enrollments se ON se.subject_id = s.id
        WHERE se.user_id = ? AND se.status = 'active'
        ORDER BY s.name
    ");
    $stmt->execute([$studentId]);
    $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $trends = [];

    foreach ($subjects as $subject) {
        $subjectTrend = analyzeSubjectTrend($pdo, $studentId, $subject['id']);
        if ($subjectTrend) {
            $trends[] = array_merge($subject, $subjectTrend);
        }
    }

    // Calculate overall performance
    $overallStats = calculateOverallStats($trends);

    echo json_encode([
        'success' => true,
        'data' => [
            'trends' => $trends,
            'overall' => $overallStats
        ]
    ]);
}

function analyzeSubjectTrend($pdo, $studentId, $subjectId)
{
    // Try to get grades with timestamps
    try {
        $stmt = $pdo->prepare("
            SELECT 
                g.grade,
                g.created_at,
                gc.name as component_name,
                gc.max_marks,
                g.marks_obtained
            FROM grades g
            LEFT JOIN grade_components gc ON g.component_id = gc.id
            JOIN student_enrollments se ON g.enrollment_id = se.id
            WHERE se.user_id = ? AND se.subject_id = ?
            ORDER BY g.created_at ASC
        ");
        $stmt->execute([$studentId, $subjectId]);
        $grades = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        // Fallback: try simpler grade structure
        try {
            $stmt = $pdo->prepare("
                SELECT 
                    g.grade,
                    g.created_at
                FROM grades g
                JOIN student_enrollments se ON g.enrollment_id = se.id
                WHERE se.user_id = ? AND se.subject_id = ?
                ORDER BY g.created_at ASC
            ");
            $stmt->execute([$studentId, $subjectId]);
            $grades = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e2) {
            return null;
        }
    }

    if (empty($grades)) {
        return null;
    }

    // Calculate percentages
    $gradeValues = [];
    $timeline = [];

    foreach ($grades as $grade) {
        if (isset($grade['marks_obtained']) && isset($grade['max_marks']) && $grade['max_marks'] > 0) {
            $percentage = ($grade['marks_obtained'] / $grade['max_marks']) * 100;
        } else {
            $percentage = $grade['grade'] ?? 0;
        }

        $gradeValues[] = $percentage;
        $timeline[] = [
            'date' => $grade['created_at'] ?? date('Y-m-d'),
            'grade' => round($percentage, 2),
            'component' => $grade['component_name'] ?? 'Assessment'
        ];
    }

    // Calculate statistics
    $currentGrade = end($gradeValues);
    $avgGrade = array_sum($gradeValues) / count($gradeValues);
    $minGrade = min($gradeValues);
    $maxGrade = max($gradeValues);

    // Calculate trend (improving/declining)
    $trend = 'stable';
    if (count($gradeValues) >= 2) {
        $firstHalf = array_slice($gradeValues, 0, ceil(count($gradeValues) / 2));
        $secondHalf = array_slice($gradeValues, ceil(count($gradeValues) / 2));

        $firstAvg = array_sum($firstHalf) / count($firstHalf);
        $secondAvg = array_sum($secondHalf) / count($secondHalf);

        if ($secondAvg > $firstAvg + 5) {
            $trend = 'improving';
        } elseif ($secondAvg < $firstAvg - 5) {
            $trend = 'declining';
        }
    }

    // Predict final grade (simple linear regression)
    $predictedFinal = predictFinalGrade($gradeValues);

    // Determine risk level
    $riskLevel = 'low';
    if ($currentGrade < 50) {
        $riskLevel = 'high';
    } elseif ($currentGrade < 60) {
        $riskLevel = 'medium';
    }

    // Calculate what's needed for target grades
    $targetCalculations = calculateTargetGrades($gradeValues, count($timeline));

    return [
        'current_grade' => round($currentGrade, 2),
        'average_grade' => round($avgGrade, 2),
        'min_grade' => round($minGrade, 2),
        'max_grade' => round($maxGrade, 2),
        'trend' => $trend,
        'predicted_final' => round($predictedFinal, 2),
        'risk_level' => $riskLevel,
        'total_assessments' => count($gradeValues),
        'timeline' => $timeline,
        'target_calculations' => $targetCalculations
    ];
}

function predictFinalGrade($grades)
{
    if (count($grades) < 2) {
        return $grades[0] ?? 0;
    }

    // Simple linear regression
    $n = count($grades);
    $sumX = 0;
    $sumY = 0;
    $sumXY = 0;
    $sumX2 = 0;

    foreach ($grades as $i => $grade) {
        $x = $i + 1;
        $y = $grade;
        $sumX += $x;
        $sumY += $y;
        $sumXY += $x * $y;
        $sumX2 += $x * $x;
    }

    $slope = ($n * $sumXY - $sumX * $sumY) / ($n * $sumX2 - $sumX * $sumX);
    $intercept = ($sumY - $slope * $sumX) / $n;

    // Predict for next assessment (n+1)
    $prediction = $slope * ($n + 1) + $intercept;

    // Clamp between 0 and 100
    return max(0, min(100, $prediction));
}

function calculateTargetGrades($currentGrades, $totalAssessments)
{
    $currentAvg = array_sum($currentGrades) / count($currentGrades);
    $remainingAssessments = max(1, 10 - $totalAssessments); // Assume 10 total assessments

    $targets = [];

    foreach ([90, 80, 70, 60] as $targetGrade) {
        $neededGrade = (($targetGrade * 10) - ($currentAvg * $totalAssessments)) / $remainingAssessments;
        $neededGrade = max(0, min(100, $neededGrade));

        $targets[] = [
            'target' => $targetGrade,
            'letter' => getLetterGrade($targetGrade),
            'needed_average' => round($neededGrade, 2),
            'achievable' => $neededGrade <= 100
        ];
    }

    return $targets;
}

function getLetterGrade($percentage)
{
    if ($percentage >= 90)
        return 'A+';
    if ($percentage >= 80)
        return 'A';
    if ($percentage >= 70)
        return 'B';
    if ($percentage >= 60)
        return 'C';
    if ($percentage >= 50)
        return 'D';
    return 'F';
}

function calculateOverallStats($trends)
{
    if (empty($trends)) {
        return [
            'overall_gpa' => 0,
            'subjects_at_risk' => 0,
            'improving_subjects' => 0,
            'declining_subjects' => 0
        ];
    }

    $totalGrade = 0;
    $atRisk = 0;
    $improving = 0;
    $declining = 0;

    foreach ($trends as $trend) {
        $totalGrade += $trend['current_grade'];

        if ($trend['risk_level'] === 'high' || $trend['risk_level'] === 'medium') {
            $atRisk++;
        }

        if ($trend['trend'] === 'improving') {
            $improving++;
        } elseif ($trend['trend'] === 'declining') {
            $declining++;
        }
    }

    $avgPercentage = $totalGrade / count($trends);
    $gpa = ($avgPercentage / 100) * 4; // Convert to 4.0 scale

    return [
        'overall_gpa' => round($gpa, 2),
        'overall_percentage' => round($avgPercentage, 2),
        'subjects_at_risk' => $atRisk,
        'improving_subjects' => $improving,
        'declining_subjects' => $declining,
        'total_subjects' => count($trends)
    ];
}
?>