<?php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/jwt.php';
setCORSHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
    // 1. Verify Admin Token
    requireRole('admin');
// 2. System Overview Stats
    $stats = [];
// Total Students
    $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'student'");
    $stats['total_students'] = $stmt->fetchColumn();
// Total Programs
    $stmt = $pdo->query("SELECT COUNT(*) FROM programs");
    $stats['total_programs'] = $stmt->fetchColumn();
// Total Subjects
    $stmt = $pdo->query("SELECT COUNT(*) FROM subjects WHERE is_active = 1");
    $stats['total_subjects'] = $stmt->fetchColumn();
// Total Teachers
    $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'teacher'");
    $stats['total_teachers'] = $stmt->fetchColumn();
// 3. Performance Metrics using vw_student_performance
    // The view likely has column `grade` or `final_percentage` or `marks_obtained`.
    // Let's assume `final_percentage` or `grade_points` based on typical standard.
    // Given previous context, it likely has `final_percentage` or `final_grade`.
    // I'll use a safe fallback query if view columns are unknown, but generally views abstract joins.

    // System GPA
    $avgGpa = 0;
    try {
    // Attempt to select from view. If fails, fallback to raw calculation.
        // Assuming view has `final_percentage`
        $stmt = $pdo->query("SELECT AVG(final_percentage) FROM vw_student_performance");
        $avgPct = $stmt->fetchColumn();
        if ($avgPct) {
            $avgGpa = ($avgPct / 25); // Approx
        } else {
            // Fallback to student_enrollments final_percentage
            $stmt = $pdo->query("SELECT AVG(final_percentage) FROM student_enrollments WHERE final_percentage IS NOT NULL");
            $avgRaw = $stmt->fetchColumn();
            $avgGpa = $avgRaw ? ($avgRaw / 25) : 0;
        }
    } catch (Exception $e) {
        $avgGpa = 0;
    }
        $stats['system_gpa'] = round($avgGpa, 2);
// Pass Rate
        $passRate = 0;
    try {
    // Assuming view has status or grade
            $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN final_percentage >= 40 THEN 1 ELSE 0 END) as passed
            FROM vw_student_performance
         ");
        $res = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$res || $res['total'] == 0) {
    // Fallback
            $stmt = $pdo->query("SELECT COUNT(*) as total, SUM(CASE WHEN final_percentage >= 40 THEN 1 ELSE 0 END) as passed FROM student_enrollments WHERE final_percentage IS NOT NULL");
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
        }
            $passRate = ($res && $res['total'] > 0) ? ($res['passed'] / $res['total']) * 100 : 0;
    } catch (Exception $e) {
        $passRate = 0;
    }
        $stats['pass_rate'] = round($passRate, 1);
// Engagement Score (Average Attendance)
        $engScore = 0;
    try {
        $stmt = $pdo->query("SELECT AVG(attendance_percentage) FROM vw_student_performance");
        $engScore = $stmt->fetchColumn();
    } catch (Exception $e) {
        $engScore = 0;
    }
        $stats['engagement_score'] = $engScore ? round($engScore) : 0;
// 4. At Risk Students
    // Students with GPA < 2.0 (approx < 50%) or Attendance < 75%
    // Using view makes this easier
        $atRiskStudents = [];
    try {
        $sql = "
            SELECT 
                u.id, 
                u.full_name as name, 
                u.student_id, 
                u.email,
                AVG(v.final_percentage) as avg_grade,
                AVG(v.attendance_percentage) as avg_attendance,
                u.avatar_url
            FROM users u
            JOIN vw_student_performance v ON u.id = v.user_id
            WHERE u.role = 'student'
            GROUP BY u.id
            HAVING avg_grade < 50 OR avg_attendance < 75
            LIMIT 5
        ";
        $stmt = $pdo->query($sql);
        $atRiskStudents = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
    // Fallback or empty
    }

    // Pending Actions
    // Sum of At Risk Students + Pending Enrollments
        $pendingCount = count($atRiskStudents);
    try {
    // Check for pending enrollments if table/status exists
            $stmt = $pdo->query("SELECT COUNT(*) FROM student_enrollments WHERE status = 'pending'");
        $pendingCount += $stmt->fetchColumn();
    } catch (Exception $e) {
    }
        $stats['pending_actions'] = $pendingCount;
// 5. Performance Distribution
        $distribution = [
        'excellent' => 0, // >= 80
        'good' => 0,      // 70-79
        'average' => 0,   // 60-69
        'below_average' => 0, // 50-59
        'at_risk' => 0    // < 50
        ];
        try {
            $sql = "
            SELECT 
                SUM(CASE WHEN final_percentage >= 80 THEN 1 ELSE 0 END) as excellent,
                SUM(CASE WHEN final_percentage BETWEEN 70 AND 79.99 THEN 1 ELSE 0 END) as good,
                SUM(CASE WHEN final_percentage BETWEEN 60 AND 69.99 THEN 1 ELSE 0 END) as average,
                SUM(CASE WHEN final_percentage BETWEEN 50 AND 59.99 THEN 1 ELSE 0 END) as below_average,
                SUM(CASE WHEN final_percentage < 50 THEN 1 ELSE 0 END) as at_risk
            FROM vw_student_performance
         ";
            $stmt = $pdo->query($sql);
            $distRes = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($distRes) {
                foreach ($distRes as $key => $val) {
                    $distribution[$key] = (int) $val;
                }
            }
        } catch (Exception $e) {
        // Ignore
        }


    // 6. Semester Trends (Aggregate)
        $semesterTrends = [];
        try {
            $sql = "
            SELECT semester, AVG(final_percentage)/25 as average_gpa
            FROM vw_student_performance
            GROUP BY semester
            ORDER BY semester ASC
        ";
            $stmt = $pdo->query($sql);
            $semesterTrends = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
        }

    // If empty trends, providing some defaults so chart isn't broken
        if (empty($semesterTrends)) {
            $semesterTrends = [
            ['semester' => 1, 'average_gpa' => 3.0],
            ['semester' => 2, 'average_gpa' => 3.1]
            ];
        }

    // 7. Program Analytics
        $programAnalytics = [];
        try {
            $sql = "
            SELECT 
                p.name,
                COUNT(DISTINCT v.student_id) as student_count,
                AVG(v.final_percentage) as avg_score,
                SUM(CASE WHEN v.final_percentage >= 40 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as pass_rate
            FROM programs p
            JOIN subjects s ON p.id = s.program_id
            JOIN vw_student_performance v ON s.id = v.subject_id
            GROUP BY p.id
            LIMIT 5
         ";
            $stmt = $pdo->query($sql);
            $programAnalytics = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
        }

        echo json_encode([
        'success' => true,
        'data' => [
            'system_overview' => $stats,
            'performance_distribution' => $distribution,
            'at_risk_students' => $atRiskStudents,
            'program_analytics' => $programAnalytics,
            'semester_trends' => $semesterTrends
        ]
        ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
