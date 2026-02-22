<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/cache.php';
require_once __DIR__ . '/../includes/jwt.php';
require_once __DIR__ . '/../includes/api_helpers.php';

error_reporting(E_ALL);
ini_set('display_errors', 0);
handleCORS();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

try {
    if ($method === 'OPTIONS')
        exit(0);
    if ($method !== 'GET')
        sendError('Method not allowed', 405);

    $user = requireAuth();

    $report = $_GET['report'] ?? null;
    $studentGpaHistory = $_GET['student_gpa_history'] ?? null;
    $studentId = $_GET['student_id'] ?? null;

    if ($report === 'grade_integrity') {
        if ($user['role'] !== 'admin') {
            sendError('Unauthorized', 403);
        }

        $programId = $_GET['program_id'] ?? 'all';
        $cacheKey = "grade_integrity_{$programId}";

        // Clear cache for grade integrity to ensure we get fresh results
        Cache::forget($cacheKey);

        // STEP 2 — Fix the query definitively.
        $sql = "
            SELECT 
                s.id,
                s.name AS subject_name,
                s.code,
                s.semester,
                s.subject_type,
                COALESCE(p.name, 'No Program') AS program_name,
                
                (SELECT COUNT(id) FROM evaluation_criteria WHERE subject_id = s.id) AS criteria_count,
                COALESCE((SELECT SUM(weight_percentage) FROM evaluation_criteria WHERE subject_id = s.id), 0) AS total_weight,
                ABS(100 - COALESCE((SELECT SUM(weight_percentage) FROM evaluation_criteria WHERE subject_id = s.id), 0)) AS weight_deviation,
                
                (SELECT COUNT(id) FROM student_enrollments WHERE subject_id = s.id) AS enrolled_students,
                (SELECT COUNT(id) FROM student_enrollments WHERE subject_id = s.id AND is_finalized = 1) AS finalized_count,
                
                CASE 
                  WHEN (SELECT COUNT(id) FROM evaluation_criteria WHERE subject_id = s.id) = 0 THEN 'no_criteria'
                  WHEN ABS(100 - COALESCE((SELECT SUM(weight_percentage) FROM evaluation_criteria WHERE subject_id = s.id), 0)) > 0.01 
                    THEN 'weight_error'
                  ELSE 'healthy'
                END AS status
                
            FROM subjects s
            LEFT JOIN programs p ON s.program_id = p.id
            ORDER BY weight_deviation DESC, s.name ASC
        ";

        try {
            $stmt = $pdo->query($sql);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Map types correctly
            foreach ($results as &$row) {
                $row['criteria_count'] = (int) $row['criteria_count'];
                $row['total_weight'] = (float) $row['total_weight'];
                $row['weight_deviation'] = (float) $row['weight_deviation'];
                $row['enrolled_students'] = (int) $row['enrolled_students'];
                $row['finalized_count'] = (int) $row['finalized_count'];
            }

            // STEP 3 — Fix the response shape.
            $response = [
                'subjects' => $results,
                'summary' => [
                    'total' => count($results),
                    'weight_errors' => count(array_filter($results, fn($r) => $r['status'] === 'weight_error')),
                    'no_criteria' => count(array_filter($results, fn($r) => $r['status'] === 'no_criteria')),
                    'healthy' => count(array_filter($results, fn($r) => $r['status'] === 'healthy')),
                    'finalized' => count(array_filter($results, fn($r) => $r['enrolled_students'] > 0 && $r['finalized_count'] === $r['enrolled_students']))
                ]
            ];

            Cache::set($cacheKey, $response, 600);
            sendResponse($response);
        } catch (PDOException $e) {
            error_log("Grade Integrity Query Error: " . $e->getMessage());
            sendError('Failed to generate report', 500, $e->getMessage());
        }

    } elseif ($studentGpaHistory) {
        if (!$studentId) {
            $studentId = $user['user_id'];
        } elseif ($user['role'] !== 'admin' && $user['role'] !== 'teacher' && $user['user_id'] != $studentId) {
            sendError('Unauthorized', 403);
        }

        $cacheKey = "gpa_history_{$studentId}";
        if ($cached = Cache::get($cacheKey)) {
            sendResponse($cached);
        }

        $sql = "
            SELECT 
                s.semester,
                SUM(sa_sub.gpa_points * s.credits) / SUM(s.credits) as semester_gpa,
                SUM(s.credits) as semester_credits,
                COUNT(se.id) as subjects_completed
            FROM student_enrollments se
            JOIN subjects s ON se.subject_id = s.id
            JOIN (
                SELECT id as enrollment_id,
                CASE 
                    WHEN final_grade IN ('A+','A') THEN 4.0
                    WHEN final_grade = 'B+' THEN 3.5
                    WHEN final_grade = 'B' THEN 3.0
                    WHEN final_grade = 'C' THEN 2.0
                    WHEN final_grade = 'D' THEN 1.0
                    ELSE 0.0 
                END as gpa_points
                FROM student_enrollments
            ) sa_sub ON sa_sub.enrollment_id = se.id
            WHERE se.user_id = ? AND se.status = 'completed'
            GROUP BY s.semester
            ORDER BY s.semester ASC
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$studentId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $history = [];
        $cumPoints = 0;
        $cumCredits = 0;

        foreach ($rows as $row) {
            $semGpa = (float) $row['semester_gpa'];
            $semCreds = (int) $row['semester_credits'];

            $cumPoints += ($semGpa * $semCreds);
            $cumCredits += $semCreds;

            $cumGpa = $cumCredits > 0 ? ($cumPoints / $cumCredits) : 0;

            $history[] = [
                'semester' => (int) $row['semester'],
                'semester_gpa' => round($semGpa, 2),
                'cumulative_gpa' => round($cumGpa, 2),
                'credits' => $semCreds,
                'subjects' => (int) $row['subjects_completed']
            ];
        }

        Cache::set($cacheKey, $history, 900);
        sendResponse($history);

    } else {
        sendError('Invalid request parameters', 400);
    }

} catch (Exception $e) {
    error_log("Analytics API Error: " . $e->getMessage());
    sendError('Internal Server Error', 500, $e->getMessage());
}
