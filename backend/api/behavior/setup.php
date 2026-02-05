<?php
/**
 * Learning Behavior Analysis - Setup Script
 * Run via browser to initialize behavior patterns
 * 
 * URL: http://localhost/StudentDataMining/backend/api/behavior/setup.php
 * 
 * This script:
 * 1. Verifies database tables exist
 * 2. Computes initial behavior patterns for all students
 * 3. Reports progress and results
 */

// Allow more execution time for initial setup
set_time_limit(600);
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../config/database.php';

// Output as HTML for browser viewing
header('Content-Type: text/html; charset=utf-8');

echo '<!DOCTYPE html><html><head><title>Learning Behavior Analysis - Setup</title>';
echo '<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; background: #f5f7fa; }
.container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
h1 { color: #1a1a2e; margin-bottom: 10px; }
h2 { color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px; margin-top: 30px; }
.status { padding: 12px 20px; border-radius: 8px; margin: 10px 0; }
.success { background: #d4edda; color: #155724; border-left: 4px solid #28a745; }
.error { background: #f8d7da; color: #721c24; border-left: 4px solid #dc3545; }
.info { background: #d1ecf1; color: #0c5460; border-left: 4px solid #17a2b8; }
.warning { background: #fff3cd; color: #856404; border-left: 4px solid #ffc107; }
code { background: #e9ecef; padding: 2px 8px; border-radius: 4px; font-size: 0.9em; }
.btn { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: 600; }
.btn:hover { background: #5558e3; }
pre { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 0.85em; }
</style></head><body><div class="container">';

echo '<h1>🎯 Learning Behavior Analysis Setup</h1>';
echo '<p style="color:#666;">Initializing behavior tracking and computing patterns for all students.</p>';

try {
    $pdo = getDBConnection();
    echo '<div class="status success">✅ Database connection successful</div>';
} catch (Exception $e) {
    echo '<div class="status error">❌ Database connection failed: ' . htmlspecialchars($e->getMessage()) . '</div>';
    echo '<p>Please make sure MySQL is running in XAMPP Control Panel.</p>';
    echo '</div></body></html>';
    exit;
}

// Step 1: Check if tables exist
echo '<h2>Step 1: Verifying Database Tables</h2>';

$requiredTables = ['learning_sessions', 'behavior_patterns', 'interventions'];
$missingTables = [];

foreach ($requiredTables as $table) {
    $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
    if ($stmt->rowCount() > 0) {
        echo "<div class='status success'>✅ Table <code>$table</code> exists</div>";
    } else {
        echo "<div class='status error'>❌ Table <code>$table</code> NOT FOUND</div>";
        $missingTables[] = $table;
    }
}

if (!empty($missingTables)) {
    echo '<div class="status warning">⚠️ Missing tables detected! Please run the database migration first.</div>';
    echo '<h3>How to fix:</h3>';
    echo '<ol>';
    echo '<li>Open phpMyAdmin: <a href="http://localhost/phpmyadmin" target="_blank">http://localhost/phpmyadmin</a></li>';
    echo '<li>Select the <code>student_data_mining</code> database</li>';
    echo '<li>Click the <strong>SQL</strong> tab</li>';
    echo '<li>Copy contents from: <code>E:\XAMP\htdocs\StudentDataMining\database\migrations\008_learning_behavior_analysis.sql</code></li>';
    echo '<li>Paste and click <strong>Go</strong></li>';
    echo '<li>Refresh this page</li>';
    echo '</ol>';
    echo '<a href="" class="btn">🔄 Refresh Page</a>';
    echo '</div></body></html>';
    exit;
}

echo '<div class="status success">✅ All required tables exist!</div>';

// Step 2: Count students
echo '<h2>Step 2: Finding Students</h2>';

$stmt = $pdo->query("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND is_active = 1");
$studentCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

echo "<div class='status info'>📊 Found <strong>$studentCount</strong> active students</div>";

if ($studentCount == 0) {
    echo '<div class="status warning">⚠️ No active students found. Add some students first, then run this setup again.</div>';
    echo '</div></body></html>';
    exit;
}

// Step 3: Compute patterns
echo '<h2>Step 3: Computing Behavior Patterns</h2>';
echo '<div class="status info">⏳ Processing... This may take a moment.</div>';
flush();
ob_flush();

$weekStart = date('Y-m-d', strtotime('monday this week'));
$processed = 0;
$errors = 0;

// Get all students
$stmt = $pdo->query("SELECT id, full_name FROM users WHERE role = 'student' AND is_active = 1 ORDER BY id");
$students = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($students as $student) {
    try {
        computeStudentPattern($pdo, $student['id'], $weekStart);
        $processed++;
    } catch (Exception $e) {
        $errors++;
        error_log("Error computing patterns for student {$student['id']}: " . $e->getMessage());
    }
}

echo "<div class='status success'>✅ Processed <strong>$processed</strong> students successfully</div>";
if ($errors > 0) {
    echo "<div class='status warning'>⚠️ <strong>$errors</strong> students had errors (check logs)</div>";
}

// Step 4: Verify results
echo '<h2>Step 4: Verifying Results</h2>';

$stmt = $pdo->query("SELECT COUNT(*) as count FROM behavior_patterns WHERE week_start = '$weekStart'");
$patternCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

echo "<div class='status success'>✅ Created <strong>$patternCount</strong> behavior pattern records for this week</div>";

// Show summary stats
$stmt = $pdo->query("
    SELECT 
        risk_level,
        COUNT(*) as count
    FROM behavior_patterns 
    WHERE week_start = '$weekStart'
    GROUP BY risk_level
    ORDER BY FIELD(risk_level, 'critical', 'at_risk', 'warning', 'safe')
");
$riskStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!empty($riskStats)) {
    echo '<h3>Risk Distribution:</h3>';
    echo '<table style="width:100%;border-collapse:collapse;margin:10px 0;">';
    echo '<tr style="background:#f8fafc;"><th style="padding:10px;text-align:left;border:1px solid #e2e8f0;">Risk Level</th><th style="padding:10px;text-align:right;border:1px solid #e2e8f0;">Count</th></tr>';
    foreach ($riskStats as $stat) {
        $color = match ($stat['risk_level']) {
            'critical' => '#dc3545',
            'at_risk' => '#fd7e14',
            'warning' => '#ffc107',
            'safe' => '#28a745',
            default => '#6c757d'
        };
        echo "<tr><td style='padding:10px;border:1px solid #e2e8f0;'><span style='color:$color;font-weight:600;'>" . ucfirst(str_replace('_', ' ', $stat['risk_level'])) . "</span></td><td style='padding:10px;text-align:right;border:1px solid #e2e8f0;'>{$stat['count']}</td></tr>";
    }
    echo '</table>';
}

echo '<h2>🎉 Setup Complete!</h2>';
echo '<div class="status success">';
echo '<p style="margin:0;"><strong>Your Learning Behavior Analysis dashboard is now ready!</strong></p>';
echo '</div>';

echo '<p style="margin-top:20px;">You can now access the dashboard:</p>';
echo '<a href="http://localhost:5173/admin/dashboard?tab=behavior-analysis" class="btn" target="_blank">Open Dashboard →</a>';

echo '<h3 style="margin-top:40px;">What to do next:</h3>';
echo '<ul>';
echo '<li>Login as admin and go to <strong>Behavior Analysis</strong> in the sidebar</li>';
echo '<li>View at-risk students and create interventions</li>';
echo '<li>The patterns will be automatically updated nightly</li>';
echo '</ul>';

echo '</div></body></html>';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function computeStudentPattern($pdo, $userId, $weekStart)
{
    $weekEnd = date('Y-m-d', strtotime($weekStart . ' +6 days'));

    // Initialize default metrics
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
        'overall_engagement_score' => 0,
        'days_attended' => 0,
        'assignments_submitted' => 0,
        'assignments_on_time' => 0,
        'on_time_submission_rate' => 0,
        'avg_grade_this_week' => null,
        'grade_trend' => 'stable'
    ];

    // Try to get activity logs
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM activity_logs WHERE user_id = ? AND created_at >= ? AND created_at <= ?");
        $stmt->execute([$userId, $weekStart, $weekEnd . ' 23:59:59']);
        $activityCount = $stmt->fetch(PDO::FETCH_ASSOC)['cnt'];
        $metrics['total_logins'] = min($activityCount, 20); // Cap at 20
        $metrics['days_active'] = min(7, ceil($activityCount / 3));
    } catch (Exception $e) {
        // Table might not exist, use defaults
    }

    // Try to get attendance
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM student_attendance WHERE student_id = ? AND attendance_date >= ? AND attendance_date <= ? AND status IN ('present', 'late')");
        $stmt->execute([$userId, $weekStart, $weekEnd]);
        $metrics['days_attended'] = (int) $stmt->fetch(PDO::FETCH_ASSOC)['cnt'];
    } catch (Exception $e) {
        // Use default
    }

    // Try to get assignments
    try {
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN submitted_at IS NOT NULL THEN 1 ELSE 0 END) as submitted,
                SUM(CASE WHEN submitted_at IS NOT NULL AND submitted_at <= due_date THEN 1 ELSE 0 END) as on_time
            FROM assignment_submissions
            WHERE student_id = ?
        ");
        $stmt->execute([$userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $metrics['assignments_submitted'] = (int) ($result['submitted'] ?? 0);
        $metrics['assignments_on_time'] = (int) ($result['on_time'] ?? 0);
        if ($metrics['assignments_submitted'] > 0) {
            $metrics['on_time_submission_rate'] = round(($metrics['assignments_on_time'] / $metrics['assignments_submitted']) * 100, 2);
        }
    } catch (Exception $e) {
        // Use defaults
    }

    // Calculate engagement scores
    $metrics['study_consistency_score'] = min(100, round(($metrics['days_active'] / 7) * 100, 2));
    $metrics['assignment_engagement_score'] = min(100, $metrics['on_time_submission_rate']);
    $metrics['overall_engagement_score'] = round(($metrics['study_consistency_score'] + $metrics['assignment_engagement_score']) / 2, 2);

    // Compute risk factors
    $riskScore = 0;
    $riskFactors = [];

    if ($metrics['overall_engagement_score'] < 50) {
        $riskScore += 20;
        $riskFactors['low_engagement'] = true;
    }
    if ($metrics['on_time_submission_rate'] < 70) {
        $riskScore += 15;
        $riskFactors['late_submissions'] = true;
    }
    if ($metrics['days_attended'] < 3) {
        $riskScore += 20;
        $riskFactors['poor_attendance'] = true;
    }
    if ($metrics['total_logins'] < 3) {
        $riskScore += 15;
        $riskFactors['low_activity'] = true;
    }
    if ($metrics['study_consistency_score'] < 40) {
        $riskScore += 10;
        $riskFactors['inconsistent_behavior'] = true;
    }

    $riskLevel = 'safe';
    if ($riskScore >= 70)
        $riskLevel = 'critical';
    elseif ($riskScore >= 50)
        $riskLevel = 'at_risk';
    elseif ($riskScore >= 30)
        $riskLevel = 'warning';

    $metrics['risk_score'] = min(100, $riskScore);
    $metrics['risk_level'] = $riskLevel;
    $metrics['is_at_risk'] = $riskLevel !== 'safe' ? 1 : 0;
    $metrics['risk_factors'] = json_encode($riskFactors);

    // Insert or update
    $stmt = $pdo->prepare("SELECT id FROM behavior_patterns WHERE user_id = ? AND week_start = ?");
    $stmt->execute([$userId, $weekStart]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        $updates = [];
        $params = [];
        foreach ($metrics as $field => $value) {
            $updates[] = "`$field` = ?";
            $params[] = $value;
        }
        $params[] = $userId;
        $params[] = $weekStart;

        $sql = "UPDATE behavior_patterns SET " . implode(', ', $updates) . ", calculated_at = NOW() WHERE user_id = ? AND week_start = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    } else {
        $fields = array_merge(['user_id', 'week_start'], array_keys($metrics));
        $placeholders = array_fill(0, count($fields), '?');
        $values = array_merge([$userId, $weekStart], array_values($metrics));

        $sql = "INSERT INTO behavior_patterns (`" . implode('`, `', $fields) . "`) VALUES (" . implode(', ', $placeholders) . ")";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
    }

    return true;
}
