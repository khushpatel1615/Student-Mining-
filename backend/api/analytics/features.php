<?php

/**
 * Analytics Features API
 * Serves pre-computed student risk profiles and features.
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/jwt.php';
setCORSHeaders();
$method = $_SERVER['REQUEST_METHOD'];
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
    $token = getTokenFromHeader();
    $validation = verifyToken($token);
    if (!$validation || !$validation['valid']) {
        throw new Exception("Unauthorized");
    }

    $authUser = $validation['payload'];
    $requestUserId = $_GET['user_id'] ?? null;
    $action = $_GET['action'] ?? 'profile';
    // Access Control
    if ($authUser['role'] !== 'admin' && $requestUserId && $requestUserId != $authUser['user_id']) {
        throw new Exception("Access denied");
    }

    $pdo = getDBConnection();

    // Check if student_risk_scores table exists
    $tableCheck = $pdo->query("SHOW TABLES LIKE 'student_risk_scores'");
    if ($tableCheck->rowCount() === 0) {
        // Table doesn't exist - return helpful empty response
        if ($action === 'list') {
            echo json_encode(['success' => true, 'data' => [], 'message' => 'Risk scores not computed yet. Run compute_features.php first.']);
        } elseif ($action === 'stats') {
            echo json_encode(['success' => true, 'data' => ['risk_distribution' => [], 'correlation_att_grade' => [], 'cohort_grades' => []]]);
        } else {
            echo json_encode(['success' => true, 'data' => null, 'message' => 'Risk scores not computed yet.']);
        }
        exit();
    }

    if ($action === 'profile') {
        // Get Single Student Profile
        $targetId = $requestUserId ? $requestUserId : $authUser['user_id'];
        $stmt = $pdo->prepare("
            SELECT 
                u.id, u.full_name, u.student_id, u.email, u.avatar_url,
                srs.risk_score, srs.risk_level, 
                srs.attendance_score, srs.grade_avg, srs.engagement_score,
                srs.features_json, srs.risk_factors, srs.updated_at
            FROM users u
            LEFT JOIN student_risk_scores srs ON u.id = srs.user_id
            WHERE u.id = ?
        ");
        $stmt->execute([$targetId]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($profile) {
            // Decode JSON fields
            $profile['features'] = json_decode($profile['features_json'] ?? '{}', true);
            $profile['risk_factors'] = json_decode($profile['risk_factors'] ?? '[]', true);
            unset($profile['features_json']);
        }

        echo json_encode(['success' => true, 'data' => $profile]);
    } elseif ($action === 'list') {
        // List Students (Risk Center View) - Admin Only
        if ($authUser['role'] !== 'admin') {
            throw new Exception("Admin access required");
        }

        $filter = $_GET['filter'] ?? 'all';
        // 'all', 'at_risk', 'star'

        $sql = "
            SELECT 
                u.id, u.full_name, u.student_id, u.email, u.avatar_url,
                srs.risk_score, srs.risk_level, 
                srs.attendance_score, srs.grade_avg, srs.engagement_score,
                srs.risk_factors
            FROM users u
            JOIN student_risk_scores srs ON u.id = srs.user_id
            WHERE u.role = 'student'
        ";
        if ($filter === 'at_risk') {
            $sql .= " AND srs.risk_level = 'At Risk'";
        } elseif ($filter === 'star') {
            $sql .= " AND srs.risk_level = 'Star'";
        }

        $sql .= " ORDER BY srs.risk_score ASC LIMIT 100";
        // Low score = High Risk

        $stmt = $pdo->query($sql);
        $list = $stmt->fetchAll(PDO::FETCH_ASSOC);
        // Decode reasons for list view
        foreach ($list as &$item) {
            $item['risk_factors'] = json_decode($item['risk_factors'] ?? '[]', true);
        }

        echo json_encode(['success' => true, 'data' => $list]);
    } elseif ($action === 'stats') {
        // Phase B: Descriptive Mining Stats
        if ($authUser['role'] !== 'admin') {
            throw new Exception("Admin access required");
        }

        $stats = [];
        // 1. Distribution of Risk Levels
        $stmtDist = $pdo->query("SELECT risk_level, COUNT(*) as count FROM student_risk_scores GROUP BY risk_level");
        $stats['risk_distribution'] = $stmtDist->fetchAll(PDO::FETCH_KEY_PAIR);
        // 2. Correlation Scatter Data (Attendance vs Grade)
        $stmtCorr = $pdo->query("SELECT attendance_score as x, grade_avg as y FROM student_risk_scores WHERE attendance_score > 0 AND grade_avg > 0 LIMIT 200");
        $stats['correlation_att_grade'] = $stmtCorr->fetchAll(PDO::FETCH_ASSOC);
        // 3. Cohort Analysis (Avg Grade per Semester)
        // Need to join users or distinct semester...
        // Assuming current_semester is in users, or we use subjects...
        // Let's use users.current_semester if available
        try {
            $stmtCohort = $pdo->query("
                SELECT u.current_semester, AVG(srs.grade_avg) as avg_grade
                FROM users u 
                JOIN student_risk_scores srs ON u.id = srs.user_id
                WHERE u.role = 'student'
                GROUP BY u.current_semester
                ORDER BY u.current_semester ASC
            ");
            $stats['cohort_grades'] = $stmtCohort->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $stats['cohort_grades'] = [];
        }

        echo json_encode(['success' => true, 'data' => $stats]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
