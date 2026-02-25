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
    $studentIdParam = $_GET['student_id'] ?? $_GET['user_id'] ?? $_GET['studentId'] ?? null;

    // Auth Check
    if (!$studentIdParam && $user['role'] === 'student') {
        $studentIdParam = $user['user_id'];
    } elseif ($user['role'] !== 'admin' && $user['role'] !== 'teacher' && $user['user_id'] != $studentIdParam) {
        sendError('Unauthorized', 403);
    }

    if (!$studentIdParam) {
        sendError('student_id is required', 400);
    }

    $cacheKey = "degree_audit_{$studentIdParam}";
    if ($cached = Cache::get($cacheKey)) {
        sendResponse(['success' => true, 'data' => $cached]);
    }

    // Get user's active program_id
    $progStmt = $pdo->prepare("SELECT program_id FROM users WHERE id = ?");
    $progStmt->execute([$studentIdParam]);
    $programId = $progStmt->fetchColumn();

    if (!$programId) {
        sendError("Student not assigned to a program", 400);
    }

    // Get Program Details
    $pStmt = $pdo->prepare("SELECT name, total_credits_required, min_gpa_required, total_semesters FROM programs WHERE id = ?");
    $pStmt->execute([$programId]);
    $program = $pStmt->fetch(PDO::FETCH_ASSOC);

    if (!$program)
        sendError("Program not found", 404);

    // Get Subjects + Enrollments
    $subsStmt = $pdo->prepare("
        SELECT 
            s.id, s.name, s.code, s.semester, s.credits, s.subject_type,
            se.status as enrollment_status, 
            se.final_grade, se.final_percentage
        FROM subjects s
        LEFT JOIN student_enrollments se ON se.subject_id = s.id AND se.user_id = ?
        WHERE s.program_id = ?
        ORDER BY s.semester ASC, s.name ASC
    ");
    $subsStmt->execute([$studentIdParam, $programId]);
    $subjectsData = $subsStmt->fetchAll(PDO::FETCH_ASSOC);

    // Compute Summary
    $credits_earned = 0;
    $credits_in_progress = 0;
    $credits_failed = 0;

    $total_gpa_points = 0;
    $total_gpa_credits = 0;

    $semestersMap = [];
    foreach ($subjectsData as $s) {
        $sem = $s['semester'];
        if (!isset($semestersMap[$sem])) {
            $semestersMap[$sem] = [
                'semester' => $sem,
                'subjects' => []
            ];
        }

        $status = $s['enrollment_status'] ?: 'not_enrolled';
        $item = [
            'id' => $s['id'],
            'name' => $s['name'],
            'code' => $s['code'],
            'credits' => (int) $s['credits'],
            'subject_type' => $s['subject_type'],
            'enrollment_status' => $status,
            'final_grade' => $s['final_grade'],
            'final_percentage' => $s['final_percentage'] !== null ? (float) $s['final_percentage'] : null
        ];

        $semestersMap[$sem]['subjects'][] = $item;

        $c = (int) $s['credits'];
        if ($status === 'completed') {
            $credits_earned += $c;

            // GPA calculation mapping
            $fg = $s['final_grade'];
            $pts = 0.0;
            if (in_array($fg, ['A+', 'A']))
                $pts = 4.0;
            else if ($fg === 'B+')
                $pts = 3.5;
            else if ($fg === 'B')
                $pts = 3.0;
            else if ($fg === 'C')
                $pts = 2.0;
            else if ($fg === 'D')
                $pts = 1.0;

            $total_gpa_points += ($pts * $c);
            $total_gpa_credits += $c;

        } else if ($status === 'active') {
            $credits_in_progress += $c;
        } else if ($status === 'failed') {
            $credits_failed += $c;
            $total_gpa_credits += $c; // Failed credits count against GPA (0 pts)
        }
    }

    $req = (int) ($program['total_credits_required'] ?? 120);
    $min_gpa = (float) ($program['min_gpa_required'] ?? 2.00);

    $credits_remaining = max(0, $req - $credits_earned - $credits_in_progress);

    $progress_pct = 0;
    if ($req > 0) {
        $progress_pct = round(($credits_earned / $req) * 100, 1);
    }

    $cum_gpa = 0.00;
    if ($total_gpa_credits > 0) {
        $cum_gpa = round($total_gpa_points / $total_gpa_credits, 2);
    }

    $on_track = ($credits_earned + $credits_in_progress) >= ($req * 0.9);

    $summary = [
        'credits_earned' => $credits_earned,
        'credits_in_progress' => $credits_in_progress,
        'credits_remaining' => $credits_remaining,
        'credits_failed' => $credits_failed,
        'graduation_progress_percentage' => $progress_pct,
        'cumulative_gpa' => $cum_gpa,
        'meets_gpa_requirement' => ($cum_gpa >= $min_gpa),
        'on_track' => $on_track
    ];

    $response = [
        'program' => [
            'name' => $program['name'],
            'total_credits_required' => $req,
            'min_gpa_required' => $min_gpa
        ],
        'summary' => $summary,
        'semesters' => array_values($semestersMap)
    ];

    Cache::set($cacheKey, $response, 1800);
    sendResponse(['success' => true, 'data' => $response]);

} catch (Exception $e) {
    error_log("Degree Audit API Error: " . $e->getMessage());
    sendError('Internal Server Error', 500, $e->getMessage());
}
