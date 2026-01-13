<?php
/**
 * Skills Mining API
 * Derives student competencies from subject grades.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $user = getAuthUser();
    if (!$user || $user['role'] !== 'student') {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }

    $studentId = $user['user_id'];

    // Fetch all completed subjects and their grades
    $stmt = $pdo->prepare("
        SELECT 
            s.name as subject_name,
            e.final_percentage as score
        FROM student_enrollments e
        JOIN subjects s ON e.subject_id = s.id
        WHERE e.user_id = ? AND e.final_percentage IS NOT NULL
    ");
    $stmt->execute([$studentId]);
    $grades = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Skill Mapping Logic
    $skillMap = [
        'Logic' => ['math', 'calculus', 'algebra', 'statistics', 'physics'],
        'Technical' => ['computer', 'programming', 'database', 'network', 'mining', 'web'],
        'Communication' => ['english', 'history', 'literature', 'communication', 'business'],
        'Creativity' => ['art', 'design', 'graphics', 'ui', 'ux'],
        'Analysis' => ['science', 'physics', 'chemistry', 'biology', 'economics', 'data']
    ];

    $studentSkills = [
        'Logic' => [],
        'Technical' => [],
        'Communication' => [],
        'Creativity' => [],
        'Analysis' => []
    ];

    // Distribute grades into skills
    foreach ($grades as $grade) {
        $subject = strtolower($grade['subject_name']);
        $score = floatval($grade['score']);

        $matched = false;
        foreach ($skillMap as $skill => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($subject, $keyword) !== false) {
                    $studentSkills[$skill][] = $score;
                    $matched = true;
                    // Don't break, a subject can contribute to multiple skills
                }
            }
        }

        // If subject didn't match any specific keyword, assign to general Logic/Analysis as fallback if score is decent
        if (!$matched) {
            $studentSkills['Analysis'][] = $score;
        }
    }

    // Calculate Averages
    $finalSkills = [];
    foreach ($studentSkills as $skill => $scores) {
        if (count($scores) > 0) {
            $finalSkills[$skill] = round(array_sum($scores) / count($scores), 1);
        } else {
            // Default base score for newbie
            $finalSkills[$skill] = 50;
        }
    }

    // Prepare response for Chart.js
    $labels = array_keys($finalSkills);
    $data = array_values($finalSkills);

    echo json_encode([
        'success' => true,
        'data' => [
            'labels' => $labels,
            'values' => $data,
            'raw_counts' => array_map('count', $studentSkills)
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
