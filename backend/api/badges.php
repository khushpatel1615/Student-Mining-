<?php
/**
 * Achievement Badges API
 * Manages student achievement badges and gamification
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

try {
    if ($method === 'GET') {
        handleGet($pdo);
    } elseif ($method === 'POST') {
        handlePost($pdo);
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
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $action = $_GET['action'] ?? 'my_badges';

    createBadgeTables($pdo);

    if ($action === 'my_badges') {
        getStudentBadges($pdo, $user['user_id']);
    } elseif ($action === 'check_eligibility') {
        checkBadgeEligibility($pdo, $user['user_id']);
    } elseif ($action === 'all_badges') {
        getAllBadgeDefinitions($pdo);
    }
}

function handlePost($pdo)
{
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    createBadgeTables($pdo);

    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? null;

    if ($action === 'award_badge') {
        awardBadge($pdo, $user['user_id'], $data['badge_code']);
    }
}

function createBadgeTables($pdo)
{
    try {
        // Badge definitions table
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS badge_definitions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                category VARCHAR(50),
                icon VARCHAR(10),
                criteria TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // Student badges table
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS student_badges (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_id INT NOT NULL,
                badge_code VARCHAR(50) NOT NULL,
                earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_student_badge (student_id, badge_code),
                INDEX idx_student (student_id)
            )
        ");

        // Insert badge definitions if not exist
        insertBadgeDefinitions($pdo);
    } catch (PDOException $e) {
        // Tables might already exist
    }
}

function insertBadgeDefinitions($pdo)
{
    $badges = [
        // Academic Excellence
        ['TOP_PERFORMER', 'Top Performer', 'Maintain GPA above 3.5', 'academic', '🌟', 'GPA > 3.5'],
        ['STRAIGHT_AS', 'Straight A\'s', 'All A grades in a semester', 'academic', '📚', 'All grades >= 90%'],
        ['PERFECT_SCORE', 'Perfect Score', 'Score 100% on any assessment', 'academic', '🎯', 'Any grade = 100%'],
        ['IMPROVING_STAR', 'Improving Star', 'Improve grade by 10% or more', 'academic', '📈', 'Grade improvement >= 10%'],

        // Attendance
        ['PERFECT_ATTENDANCE', 'Perfect Attendance', '100% attendance for a month', 'attendance', '✅', 'Monthly attendance = 100%'],
        ['STREAK_MASTER', 'Streak Master', '30-day attendance streak', 'attendance', '🔥', 'Consecutive days >= 30'],
        ['PUNCTUAL_PRO', 'Punctual Pro', 'No late arrivals for 2 weeks', 'attendance', '📅', 'No late status for 14 days'],

        // Assignments
        ['EARLY_BIRD', 'Early Bird', 'Submit 10 assignments early', 'assignments', '⚡', 'Early submissions >= 10'],
        ['CONSISTENT_CONTRIBUTOR', 'Consistent Contributor', 'Submit all assignments on time', 'assignments', '📝', 'On-time rate = 100%'],
        ['QUALITY_WORK', 'Quality Work', '5 assignments with 90%+ grades', 'assignments', '🎨', 'High-grade assignments >= 5'],

        // Engagement
        ['QUICK_STARTER', 'Quick Starter', 'Complete first week assignments', 'engagement', '🚀', 'Week 1 completion = 100%'],
        ['COMEBACK_KID', 'Comeback Kid', 'Improve from failing to passing', 'engagement', '💪', 'Grade: < 50% to >= 50%'],
        ['COURSE_COMPLETER', 'Course Completer', 'Finish all course requirements', 'engagement', '🎓', 'All requirements met']
    ];

    foreach ($badges as $badge) {
        try {
            $stmt = $pdo->prepare("
                INSERT IGNORE INTO badge_definitions (code, name, description, category, icon, criteria)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute($badge);
        } catch (PDOException $e) {
            // Badge might already exist
        }
    }
}

function getStudentBadges($pdo, $studentId)
{
    $stmt = $pdo->prepare("
        SELECT 
            bd.*,
            sb.earned_at
        FROM student_badges sb
        JOIN badge_definitions bd ON sb.badge_code = bd.code
        WHERE sb.student_id = ?
        ORDER BY sb.earned_at DESC
    ");
    $stmt->execute([$studentId]);
    $earnedBadges = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get all badge definitions
    $stmt = $pdo->query("SELECT * FROM badge_definitions ORDER BY category, name");
    $allBadges = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Calculate progress toward unearned badges
    $earnedCodes = array_column($earnedBadges, 'code');
    $unearnedBadges = array_filter($allBadges, function ($badge) use ($earnedCodes) {
        return !in_array($badge['code'], $earnedCodes);
    });

    echo json_encode([
        'success' => true,
        'data' => [
            'earned_badges' => $earnedBadges,
            'unearned_badges' => array_values($unearnedBadges),
            'total_earned' => count($earnedBadges),
            'total_badges' => count($allBadges),
            'completion_percentage' => count($allBadges) > 0 ? round((count($earnedBadges) / count($allBadges)) * 100, 1) : 0
        ]
    ]);
}

function checkBadgeEligibility($pdo, $studentId)
{
    $newBadges = [];

    // Check TOP_PERFORMER (GPA > 3.5)
    if (checkTopPerformer($pdo, $studentId)) {
        $newBadges[] = 'TOP_PERFORMER';
    }

    // Check PERFECT_SCORE
    if (checkPerfectScore($pdo, $studentId)) {
        $newBadges[] = 'PERFECT_SCORE';
    }

    // Check PERFECT_ATTENDANCE
    if (checkPerfectAttendance($pdo, $studentId)) {
        $newBadges[] = 'PERFECT_ATTENDANCE';
    }

    // Check EARLY_BIRD
    if (checkEarlyBird($pdo, $studentId)) {
        $newBadges[] = 'EARLY_BIRD';
    }

    // Award new badges
    foreach ($newBadges as $badgeCode) {
        awardBadge($pdo, $studentId, $badgeCode);
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'new_badges' => $newBadges,
            'count' => count($newBadges)
        ]
    ]);
}

function awardBadge($pdo, $studentId, $badgeCode)
{
    try {
        $stmt = $pdo->prepare("
            INSERT IGNORE INTO student_badges (student_id, badge_code)
            VALUES (?, ?)
        ");
        $stmt->execute([$studentId, $badgeCode]);

        if ($stmt->rowCount() > 0) {
            // Create notification
            try {
                require_once __DIR__ . '/notifications.php';
                createNotification(
                    $pdo,
                    $studentId,
                    'success',
                    'New Badge Earned!',
                    "You've earned the $badgeCode badge!",
                    '/student?tab=profile'
                );
            } catch (Exception $e) {
                // Notification failed, but badge was awarded
            }
        }

        echo json_encode([
            'success' => true,
            'message' => 'Badge awarded',
            'badge_code' => $badgeCode
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'error' => 'Badge already earned or error occurred'
        ]);
    }
}

function getAllBadgeDefinitions($pdo)
{
    $stmt = $pdo->query("SELECT * FROM badge_definitions ORDER BY category, name");
    $badges = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $badges
    ]);
}

// Badge eligibility check functions
function checkTopPerformer($pdo, $studentId)
{
    try {
        $stmt = $pdo->prepare("
            SELECT AVG(g.grade) as avg_grade
            FROM grades g
            JOIN student_enrollments se ON g.enrollment_id = se.id
            WHERE se.user_id = ?
        ");
        $stmt->execute([$studentId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        $gpa = ($result['avg_grade'] ?? 0) / 25; // Convert to 4.0 scale
        return $gpa > 3.5;
    } catch (PDOException $e) {
        return false;
    }
}

function checkPerfectScore($pdo, $studentId)
{
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count
            FROM grades g
            JOIN student_enrollments se ON g.enrollment_id = se.id
            WHERE se.user_id = ? AND g.grade = 100
        ");
        $stmt->execute([$studentId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return ($result['count'] ?? 0) > 0;
    } catch (PDOException $e) {
        return false;
    }
}

function checkPerfectAttendance($pdo, $studentId)
{
    try {
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
            FROM student_attendance sa
            JOIN student_enrollments se ON sa.enrollment_id = se.id
            WHERE se.user_id = ?
            AND sa.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ");
        $stmt->execute([$studentId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return ($result['total'] ?? 0) > 0 && $result['total'] == $result['present'];
    } catch (PDOException $e) {
        return false;
    }
}

function checkEarlyBird($pdo, $studentId)
{
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count
            FROM assignment_submissions asub
            JOIN assignments a ON asub.assignment_id = a.id
            WHERE asub.student_id = ?
            AND asub.submitted_at < a.due_date
        ");
        $stmt->execute([$studentId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return ($result['count'] ?? 0) >= 10;
    } catch (PDOException $e) {
        return false;
    }
}
?>