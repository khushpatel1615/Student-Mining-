<?php
/**
 * Course Recommendations API
 * Provides AI-based course recommendations for students
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

    // Get student's program and semester (career_goal is optional)
    $stmt = $pdo->prepare("SELECT program_id, current_semester FROM users WHERE id = ?");
    $stmt->execute([$studentId]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) {
        http_response_code(404);
        echo json_encode(['error' => 'Student not found']);
        return;
    }

    // Try to get career goal if column exists (optional)
    $careerGoal = null;
    try {
        $stmt = $pdo->prepare("SELECT career_goal FROM users WHERE id = ?");
        $stmt->execute([$studentId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $careerGoal = $result['career_goal'] ?? null;
    } catch (PDOException $e) {
        // Column doesn't exist, continue without it
        $careerGoal = null;
    }

    // Get courses already taken
    $stmt = $pdo->prepare("
        SELECT subject_id 
        FROM student_enrollments 
        WHERE user_id = ? AND status = 'active'
    ");
    $stmt->execute([$studentId]);
    $takenCourseIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // Get student's grades for performance analysis
    // Try with grade_components first, fallback to direct grades
    $studentGrades = [];
    try {
        $stmt = $pdo->prepare("
            SELECT 
                s.id as subject_id,
                s.name as subject_name,
                AVG(g.marks_obtained / gc.max_marks * 100) as avg_percentage
            FROM grades g
            JOIN grade_components gc ON g.component_id = gc.id
            JOIN subjects s ON gc.subject_id = s.id
            JOIN student_enrollments se ON g.student_id = se.user_id AND se.subject_id = s.id
            WHERE g.student_id = ?
            GROUP BY s.id
        ");
        $stmt->execute([$studentId]);
        $studentGrades = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        // grade_components table doesn't exist, try direct grades table
        try {
            $stmt = $pdo->prepare("
                SELECT 
                    s.id as subject_id,
                    s.name as subject_name,
                    AVG(g.grade) as avg_percentage
                FROM grades g
                JOIN student_enrollments se ON g.enrollment_id = se.id
                JOIN subjects s ON se.subject_id = s.id
                WHERE se.user_id = ?
                GROUP BY s.id
            ");
            $stmt->execute([$studentId]);
            $studentGrades = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e2) {
            // No grades available, continue with empty array
            $studentGrades = [];
        }
    }

    // Calculate overall GPA
    $totalPercentage = 0;
    $gradeCount = count($studentGrades);
    foreach ($studentGrades as $grade) {
        $totalPercentage += $grade['avg_percentage'];
    }
    $gpa = $gradeCount > 0 ? ($totalPercentage / $gradeCount) / 25 : 0; // Convert to 4.0 scale

    // Get available elective courses
    // Build query dynamically based on whether student has taken courses
    $baseQuery = "
        SELECT 
            id, code, name, credits, semester, description,
            NULL as is_elective, NULL as difficulty_level, NULL as prerequisites
        FROM subjects 
        WHERE program_id = ?
    ";

    // Add NOT IN clause only if student has taken courses
    if (!empty($takenCourseIds)) {
        $placeholders = implode(',', array_fill(0, count($takenCourseIds), '?'));
        $baseQuery .= " AND id NOT IN ($placeholders)";
    }

    $baseQuery .= " AND semester >= ?";

    // Try with is_elective column first
    try {
        $query = str_replace("NULL as is_elective", "is_elective", $baseQuery);
        $query = str_replace("NULL as difficulty_level", "difficulty_level", $query);
        $query = str_replace("NULL as prerequisites", "prerequisites", $query);
        $query .= " AND is_elective = 1";

        $stmt = $pdo->prepare($query);
        $params = array_merge([$student['program_id']], $takenCourseIds, [$student['current_semester']]);
        $stmt->execute($params);
        $availableCourses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        // is_elective column doesn't exist, get all courses not taken
        $stmt = $pdo->prepare($baseQuery);
        $params = array_merge([$student['program_id']], $takenCourseIds, [$student['current_semester']]);
        $stmt->execute($params);
        $availableCourses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Score each course
    $recommendations = [];
    foreach ($availableCourses as $course) {
        $score = 0;
        $reasons = [];

        // 1. Performance Match (40 points)
        $relatedGrades = array_filter($studentGrades, function ($g) use ($course) {
            // Simple keyword matching for related subjects
            return stripos($course['name'], $g['subject_name']) !== false ||
                stripos($g['subject_name'], $course['name']) !== false;
        });

        if (!empty($relatedGrades)) {
            $avgRelatedPerf = array_sum(array_column($relatedGrades, 'avg_percentage')) / count($relatedGrades);
            if ($avgRelatedPerf >= 80) {
                $score += 40;
                $relatedSubject = $relatedGrades[0]['subject_name'];
                $reasons[] = "Strong performance in $relatedSubject (" . round($avgRelatedPerf) . "%)";
            } elseif ($avgRelatedPerf >= 60) {
                $score += 25;
                $reasons[] = "Good foundation in related subjects";
            } else {
                $score += 10;
            }
        } else {
            $score += 20; // Neutral score for unrelated courses
        }

        // 2. Career Path Fit (30 points)
        if ($careerGoal) {
            $careerKeywords = explode(' ', strtolower($careerGoal));
            $courseKeywords = explode(' ', strtolower($course['name']));
            $matches = array_intersect($careerKeywords, $courseKeywords);

            if (count($matches) > 0) {
                $score += 30;
                $reasons[] = "Aligns with your " . $careerGoal . " career goal";
            } elseif (stripos($course['description'], $careerGoal) !== false) {
                $score += 15;
                $reasons[] = "Related to your career interests";
            }
        }

        // 3. Difficulty Balance (20 points)
        $difficultyScore = 0;
        if ($course['difficulty_level']) {
            if ($gpa >= 3.5 && $course['difficulty_level'] === 'Advanced') {
                $difficultyScore = 20;
                $reasons[] = "Advanced course matches your excellent GPA (" . number_format($gpa, 2) . ")";
            } elseif ($gpa >= 2.5 && $gpa < 3.5 && $course['difficulty_level'] === 'Intermediate') {
                $difficultyScore = 20;
                $reasons[] = "Intermediate level suits your current performance";
            } elseif ($gpa < 2.5 && $course['difficulty_level'] === 'Beginner') {
                $difficultyScore = 20;
                $reasons[] = "Foundational course to build your skills";
            } else {
                $difficultyScore = 10;
            }
        } else {
            $difficultyScore = 15; // Neutral
        }
        $score += $difficultyScore;

        // 4. Semester Proximity (10 points)
        if ($course['semester'] == $student['current_semester'] + 1) {
            $score += 10;
            $reasons[] = "Available in your next semester";
        } elseif ($course['semester'] == $student['current_semester']) {
            $score += 5;
        }

        // Only recommend if score is reasonable
        if ($score >= 40) {
            $recommendations[] = [
                'id' => $course['id'],
                'code' => $course['code'],
                'name' => $course['name'],
                'credits' => $course['credits'],
                'semester' => $course['semester'],
                'description' => $course['description'],
                'difficulty' => $course['difficulty_level'] ?: 'Intermediate',
                'prerequisites' => $course['prerequisites'] ? explode(',', $course['prerequisites']) : [],
                'score' => round($score, 1),
                'reasoning' => implode('. ', $reasons) . '.'
            ];
        }
    }

    // Sort by score descending
    usort($recommendations, function ($a, $b) {
        return $b['score'] - $a['score'];
    });

    // Return top 8
    $recommendations = array_slice($recommendations, 0, 8);

    echo json_encode([
        'success' => true,
        'data' => $recommendations,
        'meta' => [
            'total_available' => count($availableCourses),
            'total_recommended' => count($recommendations),
            'student_gpa' => round($gpa, 2)
        ]
    ]);
}
?>