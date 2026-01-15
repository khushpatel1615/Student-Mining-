<?php
/**
 * Submission Analytics API
 * Provides assignment submission history and patterns
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

    // Get all assignment submissions
    $submissions = getSubmissions($pdo, $studentId);

    // Calculate statistics
    $stats = calculateSubmissionStats($submissions);

    // Analyze patterns
    $patterns = analyzeSubmissionPatterns($submissions);

    echo json_encode([
        'success' => true,
        'data' => [
            'submissions' => $submissions,
            'statistics' => $stats,
            'patterns' => $patterns
        ]
    ]);
}

function getSubmissions($pdo, $studentId)
{
    try {
        $stmt = $pdo->prepare("
            SELECT 
                asub.id,
                asub.submitted_at,
                asub.grade,
                a.id as assignment_id,
                a.title as assignment_title,
                a.due_date,
                a.total_marks,
                s.name as subject_name,
                s.code as subject_code,
                CASE 
                    WHEN asub.submitted_at <= a.due_date THEN 'on_time'
                    WHEN asub.submitted_at > a.due_date THEN 'late'
                    ELSE 'pending'
                END as submission_status,
                TIMESTAMPDIFF(HOUR, a.due_date, asub.submitted_at) as hours_late
            FROM assignment_submissions asub
            JOIN assignments a ON asub.assignment_id = a.id
            JOIN subjects s ON a.subject_id = s.id
            WHERE asub.student_id = ?
            ORDER BY asub.submitted_at DESC
        ");
        $stmt->execute([$studentId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        return [];
    }
}

function calculateSubmissionStats($submissions)
{
    if (empty($submissions)) {
        return [
            'total_submissions' => 0,
            'on_time_count' => 0,
            'late_count' => 0,
            'on_time_rate' => 0,
            'average_grade' => 0,
            'average_lateness_hours' => 0
        ];
    }

    $totalSubmissions = count($submissions);
    $onTimeCount = 0;
    $lateCount = 0;
    $totalGrade = 0;
    $gradeCount = 0;
    $totalLateHours = 0;
    $lateSubmissions = 0;

    foreach ($submissions as $sub) {
        if ($sub['submission_status'] === 'on_time') {
            $onTimeCount++;
        } elseif ($sub['submission_status'] === 'late') {
            $lateCount++;
            if ($sub['hours_late'] > 0) {
                $totalLateHours += $sub['hours_late'];
                $lateSubmissions++;
            }
        }

        if ($sub['grade'] !== null) {
            $totalGrade += $sub['grade'];
            $gradeCount++;
        }
    }

    return [
        'total_submissions' => $totalSubmissions,
        'on_time_count' => $onTimeCount,
        'late_count' => $lateCount,
        'on_time_rate' => round(($onTimeCount / $totalSubmissions) * 100, 1),
        'average_grade' => $gradeCount > 0 ? round($totalGrade / $gradeCount, 2) : 0,
        'average_lateness_hours' => $lateSubmissions > 0 ? round($totalLateHours / $lateSubmissions, 1) : 0
    ];
}

function analyzeSubmissionPatterns($submissions)
{
    if (empty($submissions)) {
        return [
            'most_common_day' => null,
            'most_common_hour' => null,
            'early_bird' => false,
            'procrastinator_score' => 0
        ];
    }

    $dayCount = [];
    $hourCount = [];
    $earlySubmissions = 0;
    $lastMinuteSubmissions = 0;

    foreach ($submissions as $sub) {
        $submittedDate = new DateTime($sub['submitted_at']);
        $dueDate = new DateTime($sub['due_date']);

        // Day of week analysis
        $dayOfWeek = $submittedDate->format('l');
        $dayCount[$dayOfWeek] = ($dayCount[$dayOfWeek] ?? 0) + 1;

        // Hour of day analysis
        $hour = (int) $submittedDate->format('H');
        $hourCount[$hour] = ($hourCount[$hour] ?? 0) + 1;

        // Early bird vs procrastinator
        $hoursBeforeDue = ($dueDate->getTimestamp() - $submittedDate->getTimestamp()) / 3600;

        if ($hoursBeforeDue > 24) {
            $earlySubmissions++;
        } elseif ($hoursBeforeDue < 2 && $hoursBeforeDue >= 0) {
            $lastMinuteSubmissions++;
        }
    }

    // Find most common day
    arsort($dayCount);
    $mostCommonDay = !empty($dayCount) ? array_key_first($dayCount) : null;

    // Find most common hour
    arsort($hourCount);
    $mostCommonHour = !empty($hourCount) ? array_key_first($hourCount) : null;

    // Calculate procrastinator score (0-100, higher = more procrastination)
    $procrastinatorScore = round(($lastMinuteSubmissions / count($submissions)) * 100);

    // Determine if early bird (>50% submissions more than 24h early)
    $earlyBird = ($earlySubmissions / count($submissions)) > 0.5;

    return [
        'most_common_day' => $mostCommonDay,
        'most_common_hour' => $mostCommonHour,
        'most_common_time' => $mostCommonHour !== null ? formatHour($mostCommonHour) : null,
        'early_bird' => $earlyBird,
        'procrastinator_score' => $procrastinatorScore,
        'early_submissions_count' => $earlySubmissions,
        'last_minute_count' => $lastMinuteSubmissions
    ];
}

function formatHour($hour)
{
    $period = $hour >= 12 ? 'PM' : 'AM';
    $displayHour = $hour % 12;
    if ($displayHour === 0)
        $displayHour = 12;
    return $displayHour . ':00 ' . $period;
}
?>