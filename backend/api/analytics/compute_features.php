<?php
/**
 * Compute Features Script (Phase A)
 * Can be run via Cron (CLI) or Triggered via API (Admin Only)
 */

if (php_sapi_name() !== 'cli') {
    // If accessed via HTTP, ensure Admin
    require_once __DIR__ . '/../../includes/jwt.php';
    require_once __DIR__ . '/../../config/database.php';
    setCORSHeaders();

    // Check Admin Token
    $headers = getallheaders();
    $token = null;
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
    }

    $payload = verifyToken($token);
    if (!$payload || $payload['payload']['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit;
    }
} else {
    require_once __DIR__ . '/../../config/database.php';
}

$pdo = getDBConnection();

echo "Starting Feature Computation...\n";

// 1. Fetch all students
$stmt = $pdo->query("SELECT id, student_id, email, full_name FROM users WHERE role = 'student' AND is_active = 1");
$students = $stmt->fetchAll(PDO::FETCH_ASSOC);

$count = 0;
foreach ($students as $student) {
    echo "Processing {$student['full_name']}...\n";
    $features = computeStudentFeatures($pdo, $student);
    saveRiskScore($pdo, $student['id'], $features);
    $count++;
}

echo "Computed features for $count students.\n";
if (php_sapi_name() !== 'cli') {
    echo json_encode(['success' => true, 'count' => $count]);
}


// --------------------------------------------------------------------------
// Feature Computation Logic
// --------------------------------------------------------------------------

function computeStudentFeatures($pdo, $student)
{
    $userId = $student['id'];
    $studentIdFormatted = $student['student_id'] ?: $student['email'];

    // --- A. Attendance Features ---
    $att = computeAttendanceFeatures($pdo, $userId, $studentIdFormatted);

    // --- B. Performance Features ---
    $perf = computePerformanceFeatures($pdo, $userId);

    // --- C. Engagement Features ---
    $eng = computeEngagementFeatures($pdo, $userId);

    // --- D. Completion Features ---
    $comp = computeCompletionFeatures($pdo, $userId);

    // --- Risk Score Calculation (Phase C Logic) ---
    // Weights: Attendance 40%, Grades 40%, Submission 10%, Engagement 10%

    // Normalize Grades (0-100)
    // If avg_grade is null, assume 0 for safety but ideally should be excluded if no grades.
    // We'll treat no data as 'Safe' or 'Neutral' usually, but here 'neutral' might be dangerous.
    // Let's assume start at 100 and deduct? No, build up.

    $scoreAtt = $att['percentage'] ?? 0;
    $scoreGrade = $perf['avg_grade_current'] ?? 0; // 0-100 scale usually
    $scoreSub = $comp['submission_rate'] ?? 0;
    $scoreEng = ($eng['logins_last_7d'] > 0) ? 100 : 0; // Simple binary for now, or scale
    // Or scale engagement: 1 login = 20, 5+ = 100
    $scoreEng = min(($eng['logins_last_7d'] * 20), 100);

    // Weighted Sum
    $riskScoreVal = ($scoreAtt * 0.40) + ($scoreGrade * 0.40) + ($scoreSub * 0.10) + ($scoreEng * 0.10);

    // Risk is usually INVERSE of success. 
    // The prompt says: "Risk Score / Success Probability ... Star Performers score >= 75".
    // So this is a SUCCESS SCORE. Low score = High Risk.
    // "At-Risk: < 45".

    $finalScore = round($riskScoreVal, 2);

    // Determine Risk Level
    $riskLevel = 'Safe';
    if ($finalScore >= 75)
        $riskLevel = 'Star';
    elseif ($finalScore < 45)
        $riskLevel = 'At Risk';

    // Identify Risk Factors (Why?)
    $reasons = [];
    if ($scoreAtt < 75)
        $reasons[] = "Low Attendance ({$scoreAtt}%)";
    if ($scoreGrade < 50)
        $reasons[] = "Available Grades Low ({$scoreGrade}%)";
    if ($perf['grade_trend'] == 'declining')
        $reasons[] = "Grades Declining";
    if ($att['consecutive_absences'] >= 3)
        $reasons[] = "Consecutive Absences ({$att['consecutive_absences']})";
    if ($scoreSub < 70)
        $reasons[] = "Missing Assignments";
    if ($eng['days_since_login'] > 14)
        $reasons[] = "Inactive for {$eng['days_since_login']} days";

    // Detect Anomaly
    $volatility = isset($perf['volatility']) ? $perf['volatility'] : 'stable';
    if ($volatility == 'inconsistent')
        $reasons[] = "Inconsistent Performance";

    return [
        'risk_score' => $finalScore,
        'risk_level' => $riskLevel,
        'attendance_score' => $scoreAtt,
        'grade_avg' => $scoreGrade,
        'engagement_score' => $scoreEng,
        'features' => [
            'attendance' => $att,
            'performance' => $perf,
            'engagement' => $eng,
            'completion' => $comp
        ],
        'risk_factors' => $reasons
    ];
}

function computeAttendanceFeatures($pdo, $userId, $studentIdKey)
{
    // 1. Get Enrolled Subjects
    $stmt = $pdo->prepare("SELECT subject_id FROM student_enrollments WHERE user_id = ? AND status = 'active'");
    $stmt->execute([$userId]);
    $subjects = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $totalSessions = 0;
    $totalPresent = 0;
    $consecutiveAbsences = 0; // Global max or current streak? "streak detection". Usually current streak.
    $history = []; // Date => Status (P, A, L, etc) aggregated? No, complicated.
    // Let's just track counts and recent dates.

    $recent2Weeks = 0;
    $recent2WeeksPresent = 0;
    $prev2Weeks = 0;
    $prev2WeeksPresent = 0;

    $now = time();
    $twoWeeksAgo = strtotime('-2 weeks');
    $fourWeeksAgo = strtotime('-4 weeks');

    // Attendance Data Directory
    $dataDir = __DIR__ . '/../../data/attendance';

    foreach ($subjects as $sid) {
        $file = "$dataDir/attendance_subject_{$sid}.csv";
        if (!file_exists($file))
            continue;

        if (($handle = fopen($file, "r")) !== FALSE) {
            $header = fgetcsv($handle);
            $dates = array_slice($header, 2);

            // Find student row
            while (($row = fgetcsv($handle)) !== FALSE) {
                if ($row[0] == $studentIdKey) {
                    // Found student
                    $statuses = array_slice($row, 2);

                    // We need to process dates chronologically for streak
                    // Combine dates and statuses
                    $attendanceMap = [];
                    foreach ($dates as $i => $d) {
                        $attendanceMap[$d] = $statuses[$i] ?? '-';
                    }

                    // Sort dates just in case CSV headers aren't sorted (User script sorts them though)
                    uksort($attendanceMap, function ($a, $b) {
                        return strtotime($a) - strtotime($b);
                    });

                    // Calc stats
                    $streak = 0;
                    foreach ($attendanceMap as $d => $s) {
                        $ts = strtotime($d);
                        $isPresent = (strtoupper($s) == 'P' || strtoupper($s) == 'L'); // Present or Late
                        $isAbsent = (strtoupper($s) == 'A');

                        if ($s != '-') { // Ignore empty
                            $totalSessions++;
                            if ($isPresent)
                                $totalPresent++;

                            // Trend buckets
                            if ($ts >= $twoWeeksAgo) {
                                $recent2Weeks++;
                                if ($isPresent)
                                    $recent2WeeksPresent++;
                            } elseif ($ts >= $fourWeeksAgo) {
                                $prev2Weeks++;
                                if ($isPresent)
                                    $prev2WeeksPresent++;
                            }

                            // Streak (Current Streak of Absences at the VERY END)
                            // We need robustness. Iterate through map.
                            // If Absent -> streak++, if Present -> streak=0.
                            // Since we want CURRENT streak, the loop naturally leaves `streak` at the value of the last run of absences.
                            if ($isAbsent) {
                                $streak++;
                            } elseif ($isPresent) {
                                $streak = 0;
                            }
                        }
                    }
                    // Accumulate streak? 
                    // No, streak is specific to "Current status". 
                    // If a student is absent in Subject A but present in Subject B today...
                    // "Consecutive absences" usually implies totally missing school.
                    // For now, let's take the MAX streak across subjects or sum?
                    // Let's average the streak? No, max risk.
                    $consecutiveAbsences = max($consecutiveAbsences, $streak);
                }
            }
            fclose($handle);
        }
    }

    $pct = ($totalSessions > 0) ? round(($totalPresent / $totalSessions) * 100, 1) : 100; // Default 100 if no sessions

    // Trend Calculation
    $recentPct = ($recent2Weeks > 0) ? ($recent2WeeksPresent / $recent2Weeks) * 100 : $pct;
    $prevPct = ($prev2Weeks > 0) ? ($prev2WeeksPresent / $prev2Weeks) * 100 : $pct;

    $trend = 'stable';
    if ($recentPct > $prevPct + 5)
        $trend = 'improving';
    if ($recentPct < $prevPct - 5)
        $trend = 'declining';

    return [
        'percentage' => $pct,
        'sessions_total' => $totalSessions,
        'sessions_present' => $totalPresent,
        'trend' => $trend, // 'improving', 'declining', 'stable'
        'consecutive_absences' => $consecutiveAbsences,
        'recent_pct' => $recentPct
    ];
}

function computePerformanceFeatures($pdo, $userId)
{
    // 1. Get recent grades
    // We need joined data to see max_marks to calc percentage
    $stmt = $pdo->prepare("
        SELECT sg.marks_obtained, ec.max_marks, sg.graded_at
        FROM student_grades sg
        JOIN evaluation_criteria ec ON sg.criteria_id = ec.id
        WHERE sg.enrollment_id IN (SELECT id FROM student_enrollments WHERE user_id = ?)
        AND sg.marks_obtained IS NOT NULL
        ORDER BY sg.graded_at DESC, sg.created_at DESC
        LIMIT 10
    ");
    // Limit 10 to analyze trend, but we only avg last 3
    $stmt->execute([$userId]);
    $grades = $stmt->fetchAll(PDO::FETCH_ASSOC); // ordered newest first

    if (empty($grades)) {
        return [
            'avg_grade_current' => 0,
            'last_3_avg' => 0,
            'grade_trend' => 'stable',
            'volatility' => 'stable'
        ];
    }

    // Convert to Percentages
    $gradePcts = [];
    foreach ($grades as $g) {
        if ($g['max_marks'] > 0) {
            $gradePcts[] = ($g['marks_obtained'] / $g['max_marks']) * 100;
        }
    }

    // Last 3 Avg
    $last3 = array_slice($gradePcts, 0, 3);
    $last3Avg = !empty($last3) ? array_sum($last3) / count($last3) : 0;

    // Trend: Compare first 3 (Newest) vs next 3 (Older)
    $next3 = array_slice($gradePcts, 3, 3);
    $next3Avg = !empty($next3) ? array_sum($next3) / count($next3) : $last3Avg;

    $trend = 'stable';
    if ($last3Avg > $next3Avg + 5)
        $trend = 'improving';
    if ($last3Avg < $next3Avg - 5)
        $trend = 'declining';

    // Volatility (Standard Deviation of last 10)
    $avgFull = array_sum($gradePcts) / count($gradePcts);
    $variance = 0;
    foreach ($gradePcts as $v) {
        $variance += pow($v - $avgFull, 2);
    }
    $stdDev = sqrt($variance / count($gradePcts));
    $volatility = ($stdDev > 15) ? 'inconsistent' : 'stable';

    return [
        'avg_grade_current' => round($avgFull, 1),
        'last_3_avg' => round($last3Avg, 1),
        'grade_trend' => $trend,
        'volatility' => $volatility,
        'std_dev' => round($stdDev, 1)
    ];
}

function computeEngagementFeatures($pdo, $userId)
{
    // Check if table exists (it should, we made it)
    try {
        // Last Login Time
        $stmt = $pdo->prepare("SELECT MAX(created_at) FROM activity_logs WHERE user_id = ? AND action = 'login'");
        $stmt->execute([$userId]);
        $lastLoginDate = $stmt->fetchColumn();

        // Count logins last 7 days
        $stmt2 = $pdo->prepare("SELECT COUNT(*) FROM activity_logs WHERE user_id = ? AND action = 'login' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
        $stmt2->execute([$userId]);
        $logins7d = $stmt2->fetchColumn();

        // Count logins last 14 days
        $stmt3 = $pdo->prepare("SELECT COUNT(*) FROM activity_logs WHERE user_id = ? AND action = 'login' AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)");
        $stmt3->execute([$userId]);
        $logins14d = $stmt3->fetchColumn();

        $daysSinceLogin = 999;
        if ($lastLoginDate) {
            $diff = time() - strtotime($lastLoginDate);
            $daysSinceLogin = floor($diff / (60 * 60 * 24));
        } elseif (empty($lastLoginDate)) {
            // Fallback to user table last_login
            $uStmt = $pdo->prepare("SELECT last_login FROM users WHERE id = ?");
            $uStmt->execute([$userId]);
            $ll = $uStmt->fetchColumn();
            if ($ll) {
                $diff = time() - strtotime($ll);
                $daysSinceLogin = floor($diff / (60 * 60 * 24));
                // rough estimate for counts
                if ($daysSinceLogin <= 7)
                    $logins7d = ($logins7d == 0) ? 1 : $logins7d;
            }
        }

        return [
            'last_login' => $lastLoginDate,
            'days_since_login' => $daysSinceLogin,
            'logins_last_7d' => $logins7d,
            'logins_last_14d' => $logins14d
        ];

    } catch (Exception $e) {
        return [
            'days_since_login' => 99,
            'logins_last_7d' => 0,
            'logins_last_14d' => 0
        ];
    }
}

function computeCompletionFeatures($pdo, $userId)
{
    // Ratio of Grades Recorded vs Criteria Expected for ACTIVE enrollments

    // 1. Get all expected criteria count
    $stmtCtx = $pdo->prepare("
        SELECT COUNT(ec.id) 
        FROM evaluation_criteria ec
        JOIN student_enrollments se ON ec.subject_id = se.subject_id
        WHERE se.user_id = ? AND se.status = 'active'
    ");
    $stmtCtx->execute([$userId]);
    $expectedCount = $stmtCtx->fetchColumn();

    // 2. Get actual grades count
    $stmtGrades = $pdo->prepare("
        SELECT COUNT(sg.id)
        FROM student_grades sg
        JOIN student_enrollments se ON sg.enrollment_id = se.id
        WHERE se.user_id = ? AND se.status = 'active' 
        AND sg.marks_obtained IS NOT NULL
    ");
    $stmtGrades->execute([$userId]);
    $submittedCount = $stmtGrades->fetchColumn();

    $submissionRate = ($expectedCount > 0) ? ($submittedCount / $expectedCount) * 100 : 100;

    // 3. Assignment Submission Behavior (On Time vs Late)
    $lateCount = 0;
    try {
        $stmtAss = $pdo->prepare("
            SELECT COUNT(*) as total_subs,
                SUM(CASE WHEN sub.submitted_at > a.due_date THEN 1 ELSE 0 END) as late_subs
            FROM assignment_submissions sub
            JOIN assignments a ON sub.assignment_id = a.id
            WHERE sub.student_id = ?
        ");
        $stmtAss->execute([$userId]);
        $assStats = $stmtAss->fetch(PDO::FETCH_ASSOC);
        $lateCount = $assStats['late_subs'] ?? 0;
    } catch (Exception $e) {
        // Table might not exist or other error, ignore
    }

    return [
        'submission_rate' => round($submissionRate, 1),
        'missing_assessments' => max(0, $expectedCount - $submittedCount),
        'late_submissions' => (int) $lateCount
    ];
}


function saveRiskScore($pdo, $userId, $data)
{
    $sql = "
        INSERT INTO student_risk_scores 
        (user_id, risk_score, risk_level, attendance_score, grade_avg, engagement_score, features_json, risk_factors, updated_at)
        VALUES 
        (:uid, :score, :level, :att, :grade, :eng, :json, :reasons, NOW())
        ON DUPLICATE KEY UPDATE
        risk_score = VALUES(risk_score),
        risk_level = VALUES(risk_level),
        attendance_score = VALUES(attendance_score),
        grade_avg = VALUES(grade_avg),
        engagement_score = VALUES(engagement_score),
        features_json = VALUES(features_json),
        risk_factors = VALUES(risk_factors),
        updated_at = NOW()
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'uid' => $userId,
        'score' => $data['risk_score'],
        'level' => $data['risk_level'],
        'att' => $data['attendance_score'],
        'grade' => $data['grade_avg'],
        'eng' => $data['engagement_score'],
        'json' => json_encode($data['features']),
        'reasons' => json_encode($data['risk_factors'])
    ]);
}
?>