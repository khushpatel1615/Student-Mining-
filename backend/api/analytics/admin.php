<?php
/**
 * Admin Analytics API - Compatible Version
 * Works with existing student_grades schema
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/jwt.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    // Verify authentication - admin only
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
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Admin access required']);
        exit;
    }

    $pdo = getDBConnection();

    // === SYSTEM OVERVIEW ===

    // Total counts
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND is_active = 1");
    $totalStudents = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    $stmt = $pdo->query("SELECT COUNT(*) as count FROM programs");
    $totalPrograms = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    $stmt = $pdo->query("SELECT COUNT(*) as count FROM subjects");
    $totalSubjects = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // Calculate system-wide avg from enrollments
    $stmt = $pdo->query("SELECT AVG(final_percentage) as avg_grade FROM student_enrollments WHERE final_percentage IS NOT NULL");
    $avgResult = $stmt->fetch(PDO::FETCH_ASSOC);
    $systemAvg = $avgResult['avg_grade'] ?? 0;

    // Pass rate
    $stmt = $pdo->query("SELECT 
                            COUNT(*) as total,
                            SUM(CASE WHEN final_percentage >= 50 THEN 1 ELSE 0 END) as passed
                         FROM student_enrollments WHERE final_percentage IS NOT NULL");
    $passStats = $stmt->fetch(PDO::FETCH_ASSOC);
    $passRate = $passStats['total'] > 0 ? ($passStats['passed'] / $passStats['total']) * 100 : 0;

    // === PERFORMANCE DISTRIBUTION ===

    // Get students with their average performance
    $stmt = $pdo->query("SELECT u.id, u.full_name, 
                                AVG(se.final_percentage) as avg_grade
                         FROM users u
                         LEFT JOIN student_enrollments se ON u.id = se.user_id
                         WHERE u.role = 'student' AND u.is_active = 1
                         GROUP BY u.id");
    $studentGPAs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $distribution = [
        'excellent' => 0,
        'good' => 0,
        'average' => 0,
        'below_average' => 0,
        'at_risk' => 0
    ];

    foreach ($studentGPAs as &$student) {
        $grade = $student['avg_grade'] ?? 0;

        // Calculate GPA equivalent (approximate)
        $gpa = ($grade / 100) * 4;
        $student['gpa'] = round($gpa, 2);

        // Determine tier
        if ($grade >= 85) {
            $tier = 'excellent';
        } elseif ($grade >= 75) {
            $tier = 'good';
        } elseif ($grade >= 60) {
            $tier = 'average';
        } elseif ($grade >= 50) {
            $tier = 'below_average';
        } else {
            $tier = 'at_risk';
        }

        $student['performance_tier'] = $tier;
        $distribution[$tier]++;
    }

    // === AT-RISK STUDENTS ===

    $atRiskStudents = array_filter($studentGPAs, function ($s) {
        return ($s['avg_grade'] ?? 100) < 60;
    });

    // Sort by GPA (lowest first)
    usort($atRiskStudents, function ($a, $b) {
        return ($a['avg_grade'] ?? 100) - ($b['avg_grade'] ?? 100);
    });

    // Limit to top 10
    $atRiskStudents = array_slice($atRiskStudents, 0, 10);

    // === PROGRAM ANALYTICS ===

    $stmt = $pdo->query("SELECT p.id, p.name, p.code,
                                COUNT(DISTINCT u.id) as student_count
                         FROM programs p
                         LEFT JOIN users u ON p.id = u.program_id AND u.role = 'student' AND u.is_active = 1
                         GROUP BY p.id");
    $programs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($programs as &$program) {
        // Get average grade for this program
        $stmt = $pdo->prepare("SELECT AVG(se.final_percentage) as avg_grade
                               FROM student_enrollments se
                               JOIN users u ON se.user_id = u.id
                               WHERE u.program_id = ? AND u.role = 'student'");
        $stmt->execute([$program['id']]);
        $avgGrade = $stmt->fetch(PDO::FETCH_ASSOC)['avg_grade'];

        $program['average_gpa'] = $avgGrade ? round(($avgGrade / 100) * 4, 2) : 0;

        // Pass rate for this program
        $stmt = $pdo->prepare("SELECT COUNT(*) as total,
                                      SUM(CASE WHEN se.final_percentage >= 50 THEN 1 ELSE 0 END) as passed
                               FROM student_enrollments se
                               JOIN users u ON se.user_id = u.id
                               WHERE u.program_id = ?");
        $stmt->execute([$program['id']]);
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);

        $program['pass_rate'] = $stats['total'] > 0 ? ($stats['passed'] / $stats['total']) * 100 : 0;
    }

    // Sort programs by average GPA
    usort($programs, function ($a, $b) {
        return $b['average_gpa'] - $a['average_gpa'];
    });

    // === SUBJECT DIFFICULTY ANALYSIS ===

    $stmt = $pdo->query("SELECT s.id, s.name, s.code, s.credits,
                                AVG(se.final_percentage) as avg_grade,
                                COUNT(se.id) as student_count,
                                SUM(CASE WHEN se.final_percentage >= 50 THEN 1 ELSE 0 END) as passed,
                                COUNT(se.id) as total
                         FROM subjects s
                         LEFT JOIN student_enrollments se ON s.id = se.subject_id
                         GROUP BY s.id
                         ORDER BY avg_grade ASC");
    $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($subjects as &$subject) {
        $avgGrade = $subject['avg_grade'] ?? 0;
        $passRate = $subject['total'] > 0 ? ($subject['passed'] / $subject['total']) * 100 : 0;

        // Determine difficulty
        if ($avgGrade < 60 || $passRate < 70) {
            $difficulty = 'very_hard';
        } elseif ($avgGrade < 70 || $passRate < 80) {
            $difficulty = 'hard';
        } elseif ($avgGrade >= 80 && $passRate >= 90) {
            $difficulty = 'easy';
        } else {
            $difficulty = 'moderate';
        }

        $subject['difficulty'] = $difficulty;
        $subject['average_grade'] = round($avgGrade, 2);
        $subject['pass_rate'] = round($passRate, 2);
        $subject['fail_rate'] = round(100 - $passRate, 2);
    }

    // === SEMESTER TRENDS ===

    $semesterTrends = [];
    for ($sem = 1; $sem <= 8; $sem++) {
        $stmt = $pdo->prepare("SELECT AVG(se.final_percentage) as avg_grade
                               FROM student_enrollments se
                               JOIN subjects s ON se.subject_id = s.id
                               WHERE s.semester = ?");
        $stmt->execute([$sem]);
        $avgGrade = $stmt->fetch(PDO::FETCH_ASSOC)['avg_grade'];

        if ($avgGrade) {
            $semesterTrends[] = [
                'semester' => $sem,
                'average_gpa' => round(($avgGrade / 100) * 4, 2),
                'average_grade' => round($avgGrade, 2)
            ];
        }
    }

    // Build response
    $analytics = [
        'system_overview' => [
            'total_students' => intval($totalStudents),
            'total_programs' => intval($totalPrograms),
            'total_subjects' => intval($totalSubjects),
            'system_gpa' => round(($systemAvg / 100) * 4, 2),
            'pass_rate' => round($passRate, 2),
            'total_grade_entries' => count($studentGPAs)
        ],
        'performance_distribution' => $distribution,
        'at_risk_students' => array_map(function ($s) {
            return [
                'id' => $s['id'],
                'name' => $s['full_name'],
                'gpa' => $s['gpa'],
                'tier' => $s['performance_tier']
            ];
        }, $atRiskStudents),
        'program_analytics' => array_map(function ($p) {
            return [
                'id' => $p['id'],
                'name' => $p['name'],
                'code' => $p['code'],
                'student_count' => intval($p['student_count']),
                'average_gpa' => round($p['average_gpa'], 2),
                'pass_rate' => round($p['pass_rate'], 2)
            ];
        }, $programs),
        'subject_difficulty' => array_slice(array_map(function ($s) {
            return [
                'id' => $s['id'],
                'name' => $s['name'],
                'code' => $s['code'],
                'difficulty' => $s['difficulty'],
                'average_grade' => round($s['average_grade'] ?? 0, 2),
                'pass_rate' => round($s['pass_rate'] ?? 0, 2),
                'student_count' => intval($s['student_count'])
            ];
        }, $subjects), 0, 10),
        'semester_trends' => $semesterTrends
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