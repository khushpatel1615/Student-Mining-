<?php
/**
 * AI Course Recommender API
 * Suggests electives based on Career Goal & Skill Strengths
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/jwt.php';

setCORSHeaders();

// 1. Auth Check
$auth = requireAuth();
$userId = $auth['user_id'];
$role = $auth['role'];

if ($role !== 'student') {
    jsonResponse(['success' => false, 'error' => 'Students only'], 403);
}

try {
    $pdo = getDBConnection();

    // 2. Get Student Profile (Career Goal & Completed Subjects)
    $stmt = $pdo->prepare("
        SELECT career_goal 
        FROM student_profiles 
        WHERE user_id = :uid
    ");
    $stmt->execute(['uid' => $userId]);
    $profile = $stmt->fetch();
    $careerGoal = $profile['career_goal'] ?? 'General';

    // Get IDs of subjects already taken
    $stmt = $pdo->prepare("SELECT subject_id FROM enrollments WHERE student_id = :uid");
    $stmt->execute(['uid' => $userId]);
    $takenSubjectIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $takenStr = empty($takenSubjectIds) ? '0' : implode(',', $takenSubjectIds);

    // 3. Recommendation Logic
    // Strategy: 
    // A. Match subjects with tags similar to career_goal
    // B. Match subjects where high-performing peers (who took this subject) also have this career goal
    // C. Fallback: Popular electives

    $recommendations = [];

    // QUERY A: Career Match
    // (Assuming subjects have a 'category' or we match by name for now as we don't have tags yet)
    $stmt = $pdo->prepare("
        SELECT id, name, code, credits, description, category
        FROM subjects
        WHERE id NOT IN ($takenStr)
        AND (
            description LIKE :goal 
            OR name LIKE :goal 
            OR category LIKE :goal
        )
        LIMIT 3
    ");
    $stmt->execute(['goal' => "%$careerGoal%"]);
    $careerMatches = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($careerMatches as $sub) {
        $sub['reason'] = "Matches your goal: $careerGoal";
        $sub['type'] = 'career';
        $sub['match_score'] = 95;
        $recommendations[] = $sub;
    }

    // QUERY B: Skill/Strength Match (if we had previous high grades)
    // Find top scoring subject category
    $stmt = $pdo->prepare("
        SELECT s.category, AVG(g.grade_points) as avg_perf
        FROM enrollments e
        JOIN subjects s ON e.subject_id = s.id
        JOIN grades g ON e.grade = g.grade_letter
        WHERE e.student_id = :uid
        GROUP BY s.category
        ORDER BY avg_perf DESC
        LIMIT 1
    ");
    $stmt->execute(['uid' => $userId]);
    $strengthParams = $stmt->fetch();

    if ($strengthParams) {
        $strongCat = $strengthParams['category'];
        // Recommend more from this category
        $stmt = $pdo->prepare("
            SELECT id, name, code, credits, description, category
            FROM subjects
            WHERE id NOT IN ($takenStr)
            AND category = :cat
            AND id NOT IN (SELECT id FROM subjects WHERE description LIKE :goal OR name LIKE :goal) 
            LIMIT 2
        ");
        $stmt->execute(['cat' => $strongCat, 'goal' => "%$careerGoal%"]); // Exclude duplicates
        $strengthMatches = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($strengthMatches as $sub) {
            $sub['reason'] = "Based on your strength in $strongCat";
            $sub['type'] = 'strength';
            $sub['match_score'] = 88;
            $recommendations[] = $sub;
        }
    }

    // QUERY C: Popular / General (Fallback)
    if (count($recommendations) < 3) {
        $limit = 3 - count($recommendations);
        $stmt = $pdo->prepare("
            SELECT id, name, code, credits, description, category
            FROM subjects
            WHERE id NOT IN ($takenStr)
            ORDER BY id ASC -- Simplified 'popular' logic
            LIMIT :lim
        ");
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $fallbackMatches = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($fallbackMatches as $sub) {
            $sub['reason'] = "Popular choice for your semester";
            $sub['type'] = 'popular';
            $sub['match_score'] = 75;
            $recommendations[] = $sub;
        }
    }

    jsonResponse([
        'success' => true,
        'data' => [
            'career_goal' => $careerGoal,
            'recommendations' => $recommendations
        ]
    ]);

} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
?>