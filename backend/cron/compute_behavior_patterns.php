<?php
/**
 * Compute Behavior Patterns - Nightly Cron Job
 * Run daily at 2 AM via crontab (Windows Task Scheduler)
 * 
 * Usage:
 * php compute_behavior_patterns.php [current_week|all|user_id]
 * 
 * CRON SETUP (Linux):
 * 0 2 * * * /usr/bin/php /path/to/compute_behavior_patterns.php
 * 
 * WINDOWS TASK SCHEDULER:
 * php E:\XAMP\htdocs\StudentDataMining\backend\cron\compute_behavior_patterns.php
 */

define('SCRIPT_START', time());
define('MAX_EXECUTION_TIME', 3600); // 1 hour max

function logMessage($msg)
{
    $timestamp = date('Y-m-d H:i:s');
    if (php_sapi_name() === 'cli') {
        echo "[$timestamp] $msg\n";
    }
    error_log("[$timestamp] BEHAVIOR_PATTERNS: $msg");
}

function logError($msg)
{
    $timestamp = date('Y-m-d H:i:s');
    if (php_sapi_name() === 'cli') {
        echo "[$timestamp] ERROR: $msg\n";
    }
    error_log("[$timestamp] BEHAVIOR_PATTERNS ERROR: $msg");
}

function runBehaviorPatternComputation($pdo, $userFilter)
{
    logMessage("Starting behavior pattern computation...");

    $users = [];

    if ($userFilter === 'all') {
        $stmt = $pdo->query("SELECT id FROM users WHERE role = 'student' AND is_active = 1 ORDER BY id");
        $users = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'id');
    } elseif ($userFilter === 'current_week') {
        // Users with activity in the last 7 days OR students enrolled in current semester
        $stmt = $pdo->query("
            SELECT DISTINCT u.id 
            FROM users u
            LEFT JOIN learning_sessions ls ON u.id = ls.user_id AND ls.session_start >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            LEFT JOIN activity_logs al ON u.id = al.user_id AND al.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            WHERE u.role = 'student' AND u.is_active = 1
            AND (ls.id IS NOT NULL OR al.id IS NOT NULL OR u.current_semester IS NOT NULL)
            ORDER BY u.id
        ");
        $users = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'id');
    } elseif (is_numeric($userFilter)) {
        $users = [(int) $userFilter];
    } else {
        logError("Invalid user filter: $userFilter");
        return ['processed' => 0, 'errors' => 1, 'execution_time' => 0, 'error' => 'Invalid user filter'];
    }

    logMessage("Processing " . count($users) . " users");

    $processed = 0;
    $errors = 0;
    $weekStart = date('Y-m-d', strtotime('monday this week'));

    foreach ($users as $userId) {
        if (time() - SCRIPT_START > MAX_EXECUTION_TIME) {
            logMessage("Max execution time reached, stopping");
            break;
        }

        try {
            computeUserPatterns($pdo, $userId, $weekStart);
            $processed++;

            if ($processed % 50 === 0) {
                logMessage("Processed $processed users...");
            }
        } catch (Exception $e) {
            logError("Failed to compute patterns for user $userId: " . $e->getMessage());
            $errors++;
        }
    }

    logMessage("Completed: $processed processed, $errors errors");
    logMessage("Execution time: " . (time() - SCRIPT_START) . " seconds");

    return [
        'processed' => $processed,
        'errors' => $errors,
        'execution_time' => time() - SCRIPT_START
    ];
}

if (!defined('BEHAVIOR_COMPUTE_LIB')) {
    // Allow running from command line
    if (php_sapi_name() !== 'cli') {
        // Check for admin access if run from web
        require_once __DIR__ . '/../includes/jwt.php';
        require_once __DIR__ . '/../config/database.php';

        setCORSHeaders();

        $headers = getallheaders();
        $token = null;
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            $token = $matches[1];
        }

        $validation = verifyToken($token);
        if (!$validation['valid'] || $validation['payload']['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin access required']);
            exit;
        }
    } else {
        require_once __DIR__ . '/../config/database.php';
    }

    try {
        $pdo = getDBConnection();
    } catch (Exception $e) {
        logError('Database connection failed: ' . $e->getMessage());
        exit(1);
    }

    // Determine which users to process
    $userFilter = isset($argv[1]) ? $argv[1] : (isset($_GET['mode']) ? $_GET['mode'] : 'current_week');
    $result = runBehaviorPatternComputation($pdo, $userFilter);

    // Output result for web requests
    if (php_sapi_name() !== 'cli') {
        echo json_encode([
            'success' => true,
            'processed' => $result['processed'],
            'errors' => $result['errors'],
            'execution_time' => $result['execution_time']
        ]);
    }
}

function computeUserPatterns($pdo, $userId, $weekStart)
{
    $weekEnd = date('Y-m-d', strtotime($weekStart . ' +6 days'));

    // Get learning sessions
    $stmt = $pdo->prepare("
        SELECT * FROM learning_sessions 
        WHERE user_id = ? 
        AND DATE(session_start) >= ? 
        AND DATE(session_start) <= ?
        ORDER BY session_start
    ");
    $stmt->execute([$userId, $weekStart, $weekEnd]);
    $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get activity logs for this week
    $stmt = $pdo->prepare("
        SELECT * FROM activity_logs 
        WHERE user_id = ? 
        AND DATE(created_at) >= ? 
        AND DATE(created_at) <= ?
    ");
    $stmt->execute([$userId, $weekStart, $weekEnd]);
    $activityLogs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Aggregate metrics
    $metrics = aggregateMetrics($sessions, $activityLogs);
    $assignmentMetrics = getAssignmentMetrics($pdo, $userId, $weekStart, $weekEnd);
    $gradeMetrics = getGradeMetrics($pdo, $userId, $weekStart, $weekEnd);
    $attendanceMetrics = getAttendanceMetrics($pdo, $userId, $weekStart, $weekEnd);
    $riskData = computeRiskFactors($metrics, $assignmentMetrics, $attendanceMetrics, $gradeMetrics);

    $patternData = array_merge($metrics, $assignmentMetrics, $gradeMetrics, $attendanceMetrics, $riskData);

    insertOrUpdatePattern($pdo, $userId, $weekStart, $patternData);

    return true;
}

function aggregateMetrics($sessions, $activityLogs)
{
    $metrics = [
        'total_logins' => 0,
        'total_session_duration_minutes' => 0,
        'avg_session_duration_minutes' => 0,
        'max_session_duration_minutes' => 0,
        'video_sessions' => 0,
        'video_completion_rate' => 0,
        'assignment_sessions' => 0,
        'quiz_attempts' => 0,
        'discussion_posts' => 0,
        'morning_activity_pct' => 0,
        'afternoon_activity_pct' => 0,
        'evening_activity_pct' => 0,
        'night_activity_pct' => 0,
        'study_consistency_score' => 0,
        'preferred_study_time' => 'varied',
        'days_active' => 0,
        'video_engagement_score' => 0,
        'assignment_engagement_score' => 0,
        'discussion_engagement_score' => 0,
        'overall_engagement_score' => 0
    ];

    // Count logins from activity logs
    $loginCount = 0;
    foreach ($activityLogs as $log) {
        if (stripos($log['action'], 'login') !== false) {
            $loginCount++;
        }
    }
    $metrics['total_logins'] = $loginCount + count($sessions);

    if (empty($sessions) && empty($activityLogs)) {
        return $metrics;
    }

    $totalDuration = 0;
    $sessionDurations = [];
    $contentTypeCounts = ['video' => 0, 'video_completed' => 0, 'assignment' => 0, 'quiz' => 0, 'discussion' => 0];
    $timeDistribution = ['morning' => 0, 'afternoon' => 0, 'evening' => 0, 'night' => 0];
    $daysActive = [];

    foreach ($sessions as $session) {
        $duration = (int) $session['duration_seconds'] / 60;
        $totalDuration += $duration;
        $sessionDurations[] = $duration;

        // Count content types
        $type = $session['content_type'];
        if (isset($contentTypeCounts[$type])) {
            $contentTypeCounts[$type]++;
        }
        if ($type === 'video' && $session['is_completed']) {
            $contentTypeCounts['video_completed']++;
        }

        // Time distribution
        $hour = (int) date('H', strtotime($session['session_start']));
        if ($hour >= 6 && $hour < 12)
            $timeDistribution['morning']++;
        elseif ($hour >= 12 && $hour < 18)
            $timeDistribution['afternoon']++;
        elseif ($hour >= 18 && $hour < 23)
            $timeDistribution['evening']++;
        else
            $timeDistribution['night']++;

        // Days active
        $day = date('Y-m-d', strtotime($session['session_start']));
        $daysActive[$day] = true;
    }

    // Also count days from activity logs
    foreach ($activityLogs as $log) {
        $day = date('Y-m-d', strtotime($log['created_at']));
        $daysActive[$day] = true;
    }

    $metrics['total_session_duration_minutes'] = (int) $totalDuration;

    if (!empty($sessionDurations)) {
        $metrics['avg_session_duration_minutes'] = round(array_sum($sessionDurations) / count($sessionDurations), 2);
        $metrics['max_session_duration_minutes'] = (int) max($sessionDurations);
    }

    $metrics['video_sessions'] = $contentTypeCounts['video'];
    $metrics['video_completion_rate'] = $contentTypeCounts['video'] > 0
        ? round(($contentTypeCounts['video_completed'] / $contentTypeCounts['video']) * 100, 2)
        : 0;
    $metrics['assignment_sessions'] = $contentTypeCounts['assignment'];
    $metrics['quiz_attempts'] = $contentTypeCounts['quiz'];
    $metrics['discussion_posts'] = $contentTypeCounts['discussion'];

    // Time distribution percentages
    $totalActivities = array_sum($timeDistribution);
    if ($totalActivities > 0) {
        $metrics['morning_activity_pct'] = round(($timeDistribution['morning'] / $totalActivities) * 100, 2);
        $metrics['afternoon_activity_pct'] = round(($timeDistribution['afternoon'] / $totalActivities) * 100, 2);
        $metrics['evening_activity_pct'] = round(($timeDistribution['evening'] / $totalActivities) * 100, 2);
        $metrics['night_activity_pct'] = round(($timeDistribution['night'] / $totalActivities) * 100, 2);

        // Preferred study time
        $maxTime = max($timeDistribution);
        foreach ($timeDistribution as $period => $count) {
            if ($count === $maxTime) {
                $metrics['preferred_study_time'] = $period;
                break;
            }
        }
    }

    $metrics['days_active'] = count($daysActive);
    $metrics['study_consistency_score'] = min(100, round((count($daysActive) / 7) * 100, 2));

    // Engagement scores (normalized against weekly targets: 7 videos, 5 assignments, 5 discussions)
    $metrics['video_engagement_score'] = min(100, round(($contentTypeCounts['video'] / 7) * 100, 2));
    $metrics['assignment_engagement_score'] = min(100, round(($contentTypeCounts['assignment'] / 5) * 100, 2));
    $metrics['discussion_engagement_score'] = min(100, round(($contentTypeCounts['discussion'] / 5) * 100, 2));

    // Overall engagement (average of all scores)
    $engagementScores = [
        $metrics['video_engagement_score'],
        $metrics['assignment_engagement_score'],
        $metrics['discussion_engagement_score'],
        $metrics['study_consistency_score']
    ];
    $metrics['overall_engagement_score'] = round(array_sum($engagementScores) / 4, 2);

    return $metrics;
}

function getAssignmentMetrics($pdo, $userId, $weekStart, $weekEnd)
{
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN s.submitted_at IS NOT NULL THEN 1 ELSE 0 END) as submitted,
            SUM(CASE WHEN s.submitted_at IS NOT NULL AND s.submitted_at <= a.due_date THEN 1 ELSE 0 END) as on_time
        FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE s.student_id = ?
        AND (a.due_date BETWEEN ? AND ? OR s.submitted_at BETWEEN ? AND ?)
    ");
    $stmt->execute([$userId, $weekStart, $weekEnd, $weekStart, $weekEnd]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    return [
        'assignments_submitted' => (int) ($result['submitted'] ?? 0),
        'assignments_on_time' => (int) ($result['on_time'] ?? 0),
        'on_time_submission_rate' => ($result['submitted'] ?? 0) > 0
            ? round(($result['on_time'] / $result['submitted']) * 100, 2)
            : 0
    ];
}

function getGradeMetrics($pdo, $userId, $weekStart, $weekEnd)
{
    $stmt = $pdo->prepare("
        SELECT AVG(sg.marks_obtained) as avg_grade
        FROM student_grades sg
        JOIN student_enrollments e ON sg.enrollment_id = e.id
        WHERE e.user_id = ?
        AND sg.graded_at BETWEEN ? AND ?
    ");
    $stmt->execute([$userId, $weekStart, $weekEnd]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    // Also get previous week for trend
    $prevWeekStart = date('Y-m-d', strtotime($weekStart . ' -7 days'));
    $prevWeekEnd = date('Y-m-d', strtotime($weekEnd . ' -7 days'));

    $stmt->execute([$userId, $prevWeekStart, $prevWeekEnd]);
    $prevResult = $stmt->fetch(PDO::FETCH_ASSOC);

    $trend = 'stable';
    if ($result['avg_grade'] && $prevResult['avg_grade']) {
        $change = $result['avg_grade'] - $prevResult['avg_grade'];
        if ($change > 5)
            $trend = 'improving';
        elseif ($change < -5)
            $trend = 'declining';
    }

    return [
        'avg_grade_this_week' => $result['avg_grade'] ? round($result['avg_grade'], 2) : null,
        'grade_trend' => $trend
    ];
}

function getAttendanceMetrics($pdo, $userId, $weekStart, $weekEnd)
{
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as attended 
        FROM student_attendance sa
        JOIN student_enrollments e ON sa.enrollment_id = e.id
        WHERE e.user_id = ?
        AND sa.attendance_date BETWEEN ? AND ?
        AND sa.status IN ('present', 'late')
    ");
    $stmt->execute([$userId, $weekStart, $weekEnd]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    return ['days_attended' => (int) ($result['attended'] ?? 0)];
}

function computeRiskFactors($metrics, $assignments, $attendance, $grades)
{
    $riskScore = 0;
    $riskFactors = [];

    // Low engagement (weight: 20)
    if ($metrics['overall_engagement_score'] < 50) {
        $riskScore += 20;
        $riskFactors['low_engagement'] = true;
    }

    // Late submissions (weight: 15)
    if ($assignments['on_time_submission_rate'] < 70) {
        $riskScore += 15;
        $riskFactors['late_submissions'] = true;
    }

    // Missing assignments (weight: 15)
    if ($assignments['assignments_submitted'] < 2) {
        $riskScore += 15;
        $riskFactors['missing_assignments'] = true;
    }

    // Poor attendance (weight: 20)
    if ($attendance['days_attended'] < 3) {
        $riskScore += 20;
        $riskFactors['poor_attendance'] = true;
    }

    // Low activity (weight: 15)
    if ($metrics['total_logins'] < 3) {
        $riskScore += 15;
        $riskFactors['low_activity'] = true;
    }

    // Inconsistent study pattern (weight: 10)
    if ($metrics['study_consistency_score'] < 40) {
        $riskScore += 10;
        $riskFactors['inconsistent_behavior'] = true;
    }

    // Declining grades (weight: 10)
    if (isset($grades['grade_trend']) && $grades['grade_trend'] === 'declining') {
        $riskScore += 10;
        $riskFactors['declining_grades'] = true;
    }

    // Determine risk level
    $riskLevel = 'safe';
    if ($riskScore >= 70)
        $riskLevel = 'critical';
    elseif ($riskScore >= 50)
        $riskLevel = 'at_risk';
    elseif ($riskScore >= 30)
        $riskLevel = 'warning';

    return [
        'risk_score' => min(100, $riskScore),
        'risk_level' => $riskLevel,
        'is_at_risk' => $riskLevel !== 'safe' ? 1 : 0,
        'risk_factors' => json_encode($riskFactors)
    ];
}

function insertOrUpdatePattern($pdo, $userId, $weekStart, $patternData)
{
    $stmt = $pdo->prepare("SELECT id FROM behavior_patterns WHERE user_id = ? AND week_start = ?");
    $stmt->execute([$userId, $weekStart]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        $updates = [];
        $params = [];

        foreach ($patternData as $field => $value) {
            $updates[] = "$field = ?";
            $params[] = $value;
        }

        $params[] = $userId;
        $params[] = $weekStart;

        $query = 'UPDATE behavior_patterns SET ' . implode(', ', $updates) .
            ', calculated_at = NOW() WHERE user_id = ? AND week_start = ?';

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
    } else {
        $fields = array_merge(['user_id', 'week_start'], array_keys($patternData));
        $placeholders = array_fill(0, count($fields), '?');
        $values = array_merge([$userId, $weekStart], array_values($patternData));

        $query = 'INSERT INTO behavior_patterns (' . implode(', ', $fields) . ') 
                  VALUES (' . implode(', ', $placeholders) . ')';

        $stmt = $pdo->prepare($query);
        $stmt->execute($values);
    }
}

if (php_sapi_name() === 'cli') {
    exit(($result['processed'] ?? 0) > 0 && ($result['errors'] ?? 0) === 0 ? 0 : 1);
}
