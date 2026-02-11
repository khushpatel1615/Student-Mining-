<?php
/**
 * ============================================================================
 * LEARNING BEHAVIOR ANALYSIS - DATABASE SEEDER
 * ============================================================================
 * 
 * This script:
 * 1. Creates necessary tables (learning_sessions, behavior_patterns, interventions)
 * 2. Creates helper views (vw_at_risk_students, vw_current_week_behavior)
 * 3. Inserts dummy students (if needed)
 * 4. Inserts dummy behavior_patterns data with critical, at_risk, warning, and safe examples
 * 
 * URL: http://localhost/StudentDataMining/backend/api/behavior/seed_mock_data.php
 * 
 * ============================================================================
 */

// Allow more execution time
set_time_limit(300);
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Database connection - bypass normal auth for seeding
$db_host = 'localhost';
$db_name = 'student_data_mining';
$db_user = 'root';
$db_pass = '';

header('Content-Type: text/html; charset=utf-8');

echo '<!DOCTYPE html><html><head><title>Learning Behavior Analysis - Database Seeder</title>';
echo '<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; margin: 0; }
.container { max-width: 900px; margin: 0 auto; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
h1 { color: #1a1a2e; margin-bottom: 10px; display: flex; align-items: center; gap: 12px; }
h2 { color: #333; border-bottom: 3px solid #6366f1; padding-bottom: 10px; margin-top: 40px; }
.status { padding: 14px 20px; border-radius: 10px; margin: 12px 0; font-weight: 500; display: flex; align-items: center; gap: 10px; }
.success { background: linear-gradient(90deg, #d4edda, #c3e6cb); color: #155724; border-left: 5px solid #28a745; }
.error { background: linear-gradient(90deg, #f8d7da, #f5c6cb); color: #721c24; border-left: 5px solid #dc3545; }
.info { background: linear-gradient(90deg, #d1ecf1, #bee5eb); color: #0c5460; border-left: 5px solid #17a2b8; }
.warning { background: linear-gradient(90deg, #fff3cd, #ffeeba); color: #856404; border-left: 5px solid #ffc107; }
code { background: #e9ecef; padding: 3px 10px; border-radius: 6px; font-family: "Fira Code", monospace; font-size: 0.9em; }
.btn { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; border-radius: 10px; margin-top: 20px; font-weight: 600; transition: all 0.3s; border: none; cursor: pointer; }
.btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4); }
table { width: 100%; border-collapse: collapse; margin: 20px 0; border-radius: 10px; overflow: hidden; }
th { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px; text-align: left; }
td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; }
tr:hover { background: #f8fafc; }
.risk-critical { color: #dc3545; font-weight: 700; }
.risk-at-risk { color: #fd7e14; font-weight: 700; }
.risk-warning { color: #ffc107; font-weight: 600; }
.risk-safe { color: #28a745; font-weight: 600; }
.step-number { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; margin-right: 10px; }
</style></head><body><div class="container">';

echo '<h1>🌱 Learning Behavior Analysis - Database Seeder</h1>';
echo '<p style="color:#666; margin-bottom: 30px;">Creating tables and seeding mock data for development and testing.</p>';

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    echo '<div class="status success">✅ Database connection successful</div>';
} catch (PDOException $e) {
    echo '<div class="status error">❌ Database connection failed: ' . htmlspecialchars($e->getMessage()) . '</div>';
    echo '<p>Check:</p><ul><li>MySQL is running in XAMPP</li><li>Database <code>student_data_mining</code> exists</li></ul>';
    echo '</div></body></html>';
    exit;
}

// ============================================================================
// STEP 1: CREATE TABLES
// ============================================================================
echo '<h2><span class="step-number">1</span>Creating Tables</h2>';

$tables = [
    'learning_sessions' => "
        CREATE TABLE IF NOT EXISTS learning_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            subject_id INT DEFAULT NULL,
            content_type ENUM('video', 'reading', 'assignment', 'quiz', 'discussion', 'page_view', 'other') NOT NULL DEFAULT 'page_view',
            content_id INT DEFAULT NULL,
            content_title VARCHAR(255) DEFAULT NULL,
            session_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            session_end TIMESTAMP NULL,
            duration_seconds INT DEFAULT 0,
            is_completed BOOLEAN DEFAULT 0,
            interaction_count INT DEFAULT 0,
            metadata JSON DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user_date (user_id, session_start),
            INDEX idx_content (content_type, content_id),
            INDEX idx_user_subject (user_id, subject_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ",
    'behavior_patterns' => "
        CREATE TABLE IF NOT EXISTS behavior_patterns (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            week_start DATE NOT NULL,
            total_logins INT DEFAULT 0,
            total_session_duration_minutes INT DEFAULT 0,
            avg_session_duration_minutes DECIMAL(8,2) DEFAULT 0,
            max_session_duration_minutes INT DEFAULT 0,
            video_sessions INT DEFAULT 0,
            video_completion_rate DECIMAL(5,2) DEFAULT 0,
            assignment_sessions INT DEFAULT 0,
            assignment_completion_rate DECIMAL(5,2) DEFAULT 0,
            quiz_attempts INT DEFAULT 0,
            quiz_avg_score DECIMAL(5,2) DEFAULT 0,
            discussion_posts INT DEFAULT 0,
            morning_activity_pct DECIMAL(5,2) DEFAULT 0,
            afternoon_activity_pct DECIMAL(5,2) DEFAULT 0,
            evening_activity_pct DECIMAL(5,2) DEFAULT 0,
            night_activity_pct DECIMAL(5,2) DEFAULT 0,
            video_engagement_score DECIMAL(5,2) DEFAULT 0,
            assignment_engagement_score DECIMAL(5,2) DEFAULT 0,
            discussion_engagement_score DECIMAL(5,2) DEFAULT 0,
            overall_engagement_score DECIMAL(5,2) DEFAULT 0,
            study_consistency_score DECIMAL(5,2) DEFAULT 0,
            preferred_study_time ENUM('morning', 'afternoon', 'evening', 'night', 'varied') DEFAULT 'varied',
            days_active INT DEFAULT 0,
            days_attended INT DEFAULT 0,
            assignments_submitted INT DEFAULT 0,
            assignments_on_time INT DEFAULT 0,
            on_time_submission_rate DECIMAL(5,2) DEFAULT 0,
            avg_grade_this_week DECIMAL(5,2) DEFAULT NULL,
            grade_trend VARCHAR(20) DEFAULT 'stable',
            is_at_risk BOOLEAN DEFAULT 0,
            risk_level ENUM('safe', 'warning', 'at_risk', 'critical') DEFAULT 'safe',
            risk_score DECIMAL(5,2) DEFAULT 0,
            risk_factors JSON DEFAULT NULL,
            calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_week (user_id, week_start),
            INDEX idx_week (week_start),
            INDEX idx_risk (risk_level),
            INDEX idx_user_risk (user_id, risk_level),
            INDEX idx_engagement (overall_engagement_score)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ",
    'interventions' => "
        CREATE TABLE IF NOT EXISTS interventions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            created_by INT NOT NULL,
            intervention_type ENUM('email', 'message', 'meeting', 'call', 'warning', 'support_referral', 'grade_recovery', 'schedule_change', 'other') NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            notes TEXT,
            status ENUM('pending', 'in_progress', 'successful', 'unsuccessful', 'closed') DEFAULT 'pending',
            outcome_description TEXT,
            effectiveness_rating INT DEFAULT NULL,
            follow_up_date DATE DEFAULT NULL,
            follow_up_required BOOLEAN DEFAULT 0,
            triggered_by_risk_score DECIMAL(5,2) DEFAULT NULL,
            risk_factors_identified JSON DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            closed_at TIMESTAMP NULL,
            INDEX idx_student (student_id),
            INDEX idx_status (status),
            INDEX idx_type (intervention_type),
            INDEX idx_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    "
];

foreach ($tables as $tableName => $sql) {
    try {
        $pdo->exec($sql);
        echo "<div class='status success'>✅ Table <code>$tableName</code> created/verified</div>";
    } catch (PDOException $e) {
        echo "<div class='status error'>❌ Table <code>$tableName</code> error: " . htmlspecialchars($e->getMessage()) . "</div>";
    }
}

// ============================================================================
// STEP 2: CREATE VIEWS
// ============================================================================
echo '<h2><span class="step-number">2</span>Creating Views</h2>';

$views = [
    'vw_current_week_behavior' => "
        CREATE OR REPLACE VIEW vw_current_week_behavior AS
        SELECT 
            bp.*,
            u.full_name as student_name,
            u.email as student_email,
            u.is_active as enrollment_status
        FROM behavior_patterns bp
        JOIN users u ON bp.user_id = u.id
        WHERE bp.week_start = (SELECT MAX(week_start) FROM behavior_patterns)
        ORDER BY bp.risk_level DESC, bp.overall_engagement_score ASC
    ",
    'vw_at_risk_students' => "
        CREATE OR REPLACE VIEW vw_at_risk_students AS
        SELECT 
            u.id,
            u.full_name as name,
            u.email,
            u.student_id,
            bp.risk_level,
            bp.risk_score,
            bp.overall_engagement_score,
            bp.on_time_submission_rate,
            bp.grade_trend,
            bp.week_start,
            COUNT(DISTINCT CASE WHEN i.status IN ('pending', 'in_progress') THEN i.id END) as pending_interventions,
            MAX(i.created_at) as last_intervention_date
        FROM users u
        JOIN behavior_patterns bp ON u.id = bp.user_id
        LEFT JOIN interventions i ON u.id = i.student_id
        WHERE bp.risk_level IN ('warning', 'at_risk', 'critical')
            AND bp.week_start = (SELECT MAX(week_start) FROM behavior_patterns)
            AND u.role = 'student'
            AND u.is_active = 1
        GROUP BY u.id, bp.id
        ORDER BY bp.risk_score DESC
    "
];

foreach ($views as $viewName => $sql) {
    try {
        $pdo->exec($sql);
        echo "<div class='status success'>✅ View <code>$viewName</code> created</div>";
    } catch (PDOException $e) {
        echo "<div class='status warning'>⚠️ View <code>$viewName</code>: " . htmlspecialchars($e->getMessage()) . "</div>";
    }
}

// ============================================================================
// STEP 3: CHECK/CREATE DUMMY STUDENTS
// ============================================================================
echo '<h2><span class="step-number">3</span>Checking Students</h2>';

$stmt = $pdo->query("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND is_active = 1");
$studentCount = $stmt->fetch()['count'];

if ($studentCount >= 10) {
    echo "<div class='status info'>ℹ️ Found <strong>$studentCount</strong> existing students - using existing data</div>";
} else {
    echo "<div class='status warning'>⚠️ Only $studentCount students found - creating mock students</div>";

    // Check if email exists helper
    $checkEmail = $pdo->prepare("SELECT id FROM users WHERE email = ?");

    $mockStudents = [
        ['full_name' => 'Alice Johnson', 'email' => 'alice.johnson@test.edu', 'student_id' => 'STU001'],
        ['full_name' => 'Bob Smith', 'email' => 'bob.smith@test.edu', 'student_id' => 'STU002'],
        ['full_name' => 'Charlie Brown', 'email' => 'charlie.brown@test.edu', 'student_id' => 'STU003'],
        ['full_name' => 'Diana Ross', 'email' => 'diana.ross@test.edu', 'student_id' => 'STU004'],
        ['full_name' => 'Edward Wilson', 'email' => 'edward.wilson@test.edu', 'student_id' => 'STU005'],
        ['full_name' => 'Fiona Green', 'email' => 'fiona.green@test.edu', 'student_id' => 'STU006'],
        ['full_name' => 'George Miller', 'email' => 'george.miller@test.edu', 'student_id' => 'STU007'],
        ['full_name' => 'Hannah White', 'email' => 'hannah.white@test.edu', 'student_id' => 'STU008'],
        ['full_name' => 'Ivan Peters', 'email' => 'ivan.peters@test.edu', 'student_id' => 'STU009'],
        ['full_name' => 'Julia Roberts', 'email' => 'julia.roberts@test.edu', 'student_id' => 'STU010'],
        ['full_name' => 'Kevin Hart', 'email' => 'kevin.hart@test.edu', 'student_id' => 'STU011'],
        ['full_name' => 'Lisa Simpson', 'email' => 'lisa.simpson@test.edu', 'student_id' => 'STU012'],
    ];

    $insertStmt = $pdo->prepare("
        INSERT INTO users (full_name, email, student_id, password_hash, role, is_active, current_semester, created_at)
        VALUES (?, ?, ?, ?, 'student', 1, 3, NOW())
    ");

    $inserted = 0;
    foreach ($mockStudents as $student) {
        $checkEmail->execute([$student['email']]);
        if (!$checkEmail->fetch()) {
            $insertStmt->execute([
                $student['full_name'],
                $student['email'],
                $student['student_id'],
                password_hash('Test123!', PASSWORD_DEFAULT)
            ]);
            $inserted++;
        }
    }

    echo "<div class='status success'>✅ Created <strong>$inserted</strong> mock students</div>";
}

// ============================================================================
// STEP 4: SEED BEHAVIOR PATTERNS
// ============================================================================
echo '<h2><span class="step-number">4</span>Seeding Behavior Patterns</h2>';

// Get current week start (Monday)
$weekStart = date('Y-m-d', strtotime('monday this week'));

// Clear existing patterns for this week (for re-seeding)
$pdo->exec("DELETE FROM behavior_patterns WHERE week_start = '$weekStart'");

// Get all students
$stmt = $pdo->query("SELECT id, full_name FROM users WHERE role = 'student' AND is_active = 1 LIMIT 50");
$students = $stmt->fetchAll();

if (empty($students)) {
    echo "<div class='status error'>❌ No students found to seed data for!</div>";
} else {
    $insertPattern = $pdo->prepare("
        INSERT INTO behavior_patterns (
            user_id, week_start, total_logins, total_session_duration_minutes,
            avg_session_duration_minutes, days_active, video_sessions, video_completion_rate,
            assignment_sessions, quiz_attempts, discussion_posts, days_attended,
            assignments_submitted, assignments_on_time, on_time_submission_rate,
            morning_activity_pct, afternoon_activity_pct, evening_activity_pct, night_activity_pct,
            video_engagement_score, assignment_engagement_score, discussion_engagement_score,
            overall_engagement_score, study_consistency_score, preferred_study_time,
            avg_grade_this_week, grade_trend, is_at_risk, risk_level, risk_score, risk_factors
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    ");

    // Define behavior profiles
    $profiles = [
        'critical' => [
            'logins' => [1, 3],
            'duration' => [10, 30],
            'days' => [1, 2],
            'videos' => [0, 2],
            'video_rate' => [0, 30],
            'assignments' => [0, 1],
            'quizzes' => [0, 1],
            'discussions' => [0, 1],
            'attendance' => [0, 2],
            'submitted' => [0, 1],
            'on_time' => [0, 0],
            'grades' => [30, 55],
            'engagement' => [10, 35],
            'consistency' => [10, 30],
            'risk_score' => [70, 95],
            'grade_trend' => 'declining',
            'factors' => ['low_engagement', 'poor_attendance', 'missing_assignments', 'late_submissions']
        ],
        'at_risk' => [
            'logins' => [3, 6],
            'duration' => [30, 80],
            'days' => [2, 4],
            'videos' => [1, 4],
            'video_rate' => [30, 60],
            'assignments' => [1, 3],
            'quizzes' => [1, 2],
            'discussions' => [0, 2],
            'attendance' => [2, 4],
            'submitted' => [1, 3],
            'on_time' => [0, 2],
            'grades' => [50, 68],
            'engagement' => [35, 55],
            'consistency' => [30, 50],
            'risk_score' => [50, 69],
            'grade_trend' => 'stable',
            'factors' => ['low_engagement', 'late_submissions', 'inconsistent_behavior']
        ],
        'warning' => [
            'logins' => [5, 10],
            'duration' => [60, 150],
            'days' => [3, 5],
            'videos' => [3, 6],
            'video_rate' => [50, 75],
            'assignments' => [2, 4],
            'quizzes' => [2, 4],
            'discussions' => [1, 3],
            'attendance' => [3, 5],
            'submitted' => [2, 4],
            'on_time' => [1, 3],
            'grades' => [60, 75],
            'engagement' => [50, 70],
            'consistency' => [45, 65],
            'risk_score' => [30, 49],
            'grade_trend' => 'stable',
            'factors' => ['inconsistent_behavior']
        ],
        'safe' => [
            'logins' => [8, 20],
            'duration' => [120, 300],
            'days' => [5, 7],
            'videos' => [5, 12],
            'video_rate' => [75, 100],
            'assignments' => [4, 8],
            'quizzes' => [3, 6],
            'discussions' => [2, 8],
            'attendance' => [5, 7],
            'submitted' => [4, 6],
            'on_time' => [4, 6],
            'grades' => [75, 98],
            'engagement' => [70, 95],
            'consistency' => [70, 100],
            'risk_score' => [0, 29],
            'grade_trend' => 'improving',
            'factors' => []
        ]
    ];

    // Distribution: 3 critical, 4 at_risk, 5 warning, rest safe
    $distribution = [];
    for ($i = 0; $i < 3; $i++)
        $distribution[] = 'critical';
    for ($i = 0; $i < 4; $i++)
        $distribution[] = 'at_risk';
    for ($i = 0; $i < 5; $i++)
        $distribution[] = 'warning';
    while (count($distribution) < count($students))
        $distribution[] = 'safe';
    shuffle($distribution);

    $seededStats = ['critical' => 0, 'at_risk' => 0, 'warning' => 0, 'safe' => 0];

    foreach ($students as $index => $student) {
        $profile = $profiles[$distribution[$index]];

        // Generate random values within profile ranges
        $logins = rand($profile['logins'][0], $profile['logins'][1]);
        $duration = rand($profile['duration'][0], $profile['duration'][1]);
        $days = rand($profile['days'][0], $profile['days'][1]);
        $videos = rand($profile['videos'][0], $profile['videos'][1]);
        $videoRate = rand($profile['video_rate'][0], $profile['video_rate'][1]);
        $assignments = rand($profile['assignments'][0], $profile['assignments'][1]);
        $quizzes = rand($profile['quizzes'][0], $profile['quizzes'][1]);
        $discussions = rand($profile['discussions'][0], $profile['discussions'][1]);
        $attendance = rand($profile['attendance'][0], $profile['attendance'][1]);
        $submitted = rand($profile['submitted'][0], $profile['submitted'][1]);
        $onTime = min($submitted, rand($profile['on_time'][0], $profile['on_time'][1]));
        $onTimeRate = $submitted > 0 ? round(($onTime / $submitted) * 100, 2) : 0;
        $grades = rand($profile['grades'][0], $profile['grades'][1]) + (rand(0, 99) / 100);
        $engagement = rand($profile['engagement'][0], $profile['engagement'][1]) + (rand(0, 99) / 100);
        $consistency = rand($profile['consistency'][0], $profile['consistency'][1]) + (rand(0, 99) / 100);
        $riskScore = rand($profile['risk_score'][0], $profile['risk_score'][1]) + (rand(0, 99) / 100);

        // Time distribution (should sum to 100)
        $morning = rand(15, 35);
        $afternoon = rand(20, 40);
        $evening = rand(15, 35);
        $night = 100 - $morning - $afternoon - $evening;

        // Risk factors
        $riskFactors = [];
        foreach ($profile['factors'] as $factor) {
            if (rand(0, 100) > 30) { // 70% chance of each factor
                $riskFactors[$factor] = true;
            }
        }

        // Preferred study time
        $times = ['morning' => $morning, 'afternoon' => $afternoon, 'evening' => $evening, 'night' => $night];
        arsort($times);
        $preferredTime = key($times);

        $insertPattern->execute([
            $student['id'],
            $weekStart,
            $logins,
            $duration,
            round($duration / max($logins, 1), 2),
            $days,
            $videos,
            $videoRate,
            $assignments,
            $quizzes,
            $discussions,
            $attendance,
            $submitted,
            $onTime,
            $onTimeRate,
            $morning,
            $afternoon,
            $evening,
            $night,
            min(100, $videos * 15),
            min(100, $onTimeRate),
            min(100, $discussions * 20),
            $engagement,
            $consistency,
            $preferredTime,
            $grades,
            $profile['grade_trend'],
            $distribution[$index] !== 'safe' ? 1 : 0,
            $distribution[$index],
            $riskScore,
            json_encode($riskFactors)
        ]);

        $seededStats[$distribution[$index]]++;
    }

    echo "<div class='status success'>✅ Seeded <strong>" . count($students) . "</strong> behavior patterns for week of <code>$weekStart</code></div>";

    echo '<table>';
    echo '<tr><th>Risk Level</th><th>Count</th><th>Description</th></tr>';
    echo '<tr><td class="risk-critical">CRITICAL</td><td>' . $seededStats['critical'] . '</td><td>Immediate intervention needed</td></tr>';
    echo '<tr><td class="risk-at-risk">AT RISK</td><td>' . $seededStats['at_risk'] . '</td><td>High priority monitoring</td></tr>';
    echo '<tr><td class="risk-warning">WARNING</td><td>' . $seededStats['warning'] . '</td><td>Early warning signs</td></tr>';
    echo '<tr><td class="risk-safe">SAFE</td><td>' . $seededStats['safe'] . '</td><td>On track</td></tr>';
    echo '</table>';
}

// ============================================================================
// STEP 5: VERIFICATION
// ============================================================================
echo '<h2><span class="step-number">5</span>Verification</h2>';

// Verify tables
$tables = ['learning_sessions', 'behavior_patterns', 'interventions'];
foreach ($tables as $table) {
    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM $table");
    $count = $stmt->fetch()['cnt'];
    echo "<div class='status info'>📊 Table <code>$table</code>: <strong>$count</strong> records</div>";
}

// Verify at-risk students
try {
    $stmt = $pdo->query("
        SELECT risk_level, COUNT(*) as cnt 
        FROM behavior_patterns 
        WHERE week_start = '$weekStart' 
        GROUP BY risk_level
    ");
    $stats = $stmt->fetchAll();

    if (!empty($stats)) {
        echo '<div class="status success">✅ Risk distribution verified:</div>';
        echo '<ul>';
        foreach ($stats as $stat) {
            $class = 'risk-' . str_replace('_', '-', $stat['risk_level']);
            echo "<li><span class='$class'>" . strtoupper(str_replace('_', ' ', $stat['risk_level'])) . "</span>: {$stat['cnt']} students</li>";
        }
        echo '</ul>';
    }
} catch (Exception $e) {
    echo "<div class='status warning'>⚠️ Could not verify: " . $e->getMessage() . "</div>";
}

// ============================================================================
// COMPLETION
// ============================================================================
echo '<h2>🎉 Seeding Complete!</h2>';
echo '<div class="status success">';
echo '<p style="margin:0;"><strong>Your database is now ready with mock data!</strong></p>';
echo '</div>';

echo '<p style="margin-top: 20px;">You can now access the dashboard:</p>';
echo '<a href="http://localhost:5173/admin/dashboard?tab=behavior-analysis" class="btn" target="_blank">🚀 Open Dashboard</a>';

echo '<h3 style="margin-top: 40px;">API Endpoints Ready:</h3>';
echo '<ul>';
echo '<li><code>GET /api/behavior/at_risk_students.php</code> - List at-risk students</li>';
echo '<li><code>GET /api/behavior/patterns.php?user_id=X</code> - Get behavior patterns</li>';
echo '<li><code>POST /api/behavior/interventions.php</code> - Create interventions</li>';
echo '</ul>';

echo '</div></body></html>';
