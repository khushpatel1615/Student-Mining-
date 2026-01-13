<?php
/**
 * Career Predictor API
 * Matches student skills to career paths using weighted algorithms.
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

try {
    $user = getAuthUser();
    if (!$user || $user['role'] !== 'student') {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }

    $studentId = $user['user_id'];

    // 1. Mine Skills (Logic from skills.php)
    // Ideally refactor this into a shared function
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

    foreach ($grades as $grade) {
        $subject = strtolower($grade['subject_name']);
        $score = floatval($grade['score']);
        $matched = false;
        foreach ($skillMap as $skill => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($subject, $keyword) !== false) {
                    $studentSkills[$skill][] = $score;
                    $matched = true;
                }
            }
        }
        if (!$matched)
            $studentSkills['Analysis'][] = $score;
    }

    // Calculate Skill Averages (0-100)
    $finalSkills = [];
    foreach ($studentSkills as $skill => $scores) {
        $finalSkills[$skill] = count($scores) > 0 ? round(array_sum($scores) / count($scores)) : 50; // Default 50
    }

    // 2. Define Career Profiles (Weights sum to 1.0)
    $careers = [
        'Data Scientist' => [
            'weights' => ['Analysis' => 0.4, 'Technical' => 0.4, 'Logic' => 0.2],
            'description' => 'Extracts insights from large datasets using statistical analysis and coding.',
            'industry' => 'Tech & Finance'
        ],
        'Software Engineer' => [
            'weights' => ['Technical' => 0.5, 'Logic' => 0.3, 'Communication' => 0.2],
            'description' => 'Builds and maintains software systems and applications.',
            'industry' => 'Technology'
        ],
        'Product Manager' => [
            'weights' => ['Communication' => 0.4, 'Analysis' => 0.3, 'Creativity' => 0.3],
            'description' => 'Guides the success of a product and leads cross-functional teams.',
            'industry' => 'Business & Tech'
        ],
        'UX/UI Designer' => [
            'weights' => ['Creativity' => 0.5, 'Communication' => 0.3, 'Technical' => 0.2],
            'description' => 'Designs intuitive and aesthetically pleasing user interfaces.',
            'industry' => 'Design & Tech'
        ],
        'Financial Analyst' => [
            'weights' => ['Analysis' => 0.5, 'Logic' => 0.3, 'Communication' => 0.2],
            'description' => 'Guides businesses and individuals in investment decisions.',
            'industry' => 'Finance'
        ],
        'System Architect' => [
            'weights' => ['Technical' => 0.4, 'Logic' => 0.4, 'Analysis' => 0.2],
            'description' => 'Defines the architecture of a computerized system.',
            'industry' => 'Technology'
        ]
    ];

    // 3. Match
    $matches = [];
    foreach ($careers as $name => $profile) {
        $score = 0;
        foreach ($profile['weights'] as $skill => $weight) {
            $studentScore = $finalSkills[$skill] ?? 50;
            $score += $studentScore * $weight;
        }

        $matches[] = [
            'title' => $name,
            'match_percentage' => round($score),
            'description' => $profile['description'],
            'industry' => $profile['industry'],
            'top_skill_required' => array_keys($profile['weights'], max($profile['weights']))[0]
        ];
    }

    // Sort by match percentage DESC
    usort($matches, function ($a, $b) {
        return $b['match_percentage'] - $a['match_percentage'];
    });

    echo json_encode([
        'success' => true,
        'data' => [
            'matches' => $matches,
            'skills' => $finalSkills
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
