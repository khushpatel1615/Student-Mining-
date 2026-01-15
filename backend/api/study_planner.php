<?php
/**
 * Smart Study Planner API
 * Generates AI-powered study schedules based on deadlines and performance
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
    $today = date('Y-m-d');
    $twoWeeksLater = date('Y-m-d', strtotime('+14 days'));

    // Get upcoming assignments
    $assignments = [];
    try {
        $stmt = $pdo->prepare("
            SELECT 
                a.id,
                a.title,
                a.due_date,
                a.total_marks,
                s.name as subject_name,
                s.code as subject_code,
                s.id as subject_id,
                CASE 
                    WHEN asub.submitted_at IS NOT NULL THEN 'submitted'
                    ELSE 'pending'
                END as status
            FROM assignments a
            JOIN subjects s ON a.subject_id = s.id
            JOIN student_enrollments se ON se.subject_id = s.id
            LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id AND asub.student_id = ?
            WHERE se.user_id = ?
            AND a.due_date BETWEEN ? AND ?
            AND asub.id IS NULL
            ORDER BY a.due_date ASC
        ");
        $stmt->execute([$studentId, $studentId, $today, $twoWeeksLater]);
        $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        // Assignments table might not exist or have different structure
        $assignments = [];
    }

    // Get upcoming exams
    $exams = [];
    try {
        $stmt = $pdo->prepare("
            SELECT 
                e.id,
                e.title,
                e.start_datetime as exam_date,
                e.exam_type,
                e.total_marks,
                s.name as subject_name,
                s.code as subject_code,
                s.id as subject_id
            FROM exams e
            JOIN subjects s ON e.subject_id = s.id
            JOIN student_enrollments se ON se.subject_id = s.id
            WHERE se.user_id = ?
            AND DATE(e.start_datetime) BETWEEN ? AND ?
            ORDER BY e.start_datetime ASC
        ");
        $stmt->execute([$studentId, $today, $twoWeeksLater]);
        $exams = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        $exams = [];
    }

    // Get weak subjects (low grades or attendance)
    $weakSubjects = [];
    try {
        // Try to get subjects with low performance
        $stmt = $pdo->prepare("
            SELECT DISTINCT
                s.id as subject_id,
                s.name as subject_name,
                s.code as subject_code,
                'low_performance' as reason
            FROM student_enrollments se
            JOIN subjects s ON se.subject_id = s.id
            LEFT JOIN grades g ON g.enrollment_id = se.id
            WHERE se.user_id = ?
            AND se.status = 'active'
            GROUP BY s.id
            HAVING AVG(COALESCE(g.grade, 0)) < 60
        ");
        $stmt->execute([$studentId]);
        $weakSubjects = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        // Try attendance-based weak subjects
        try {
            $stmt = $pdo->prepare("
                SELECT DISTINCT
                    s.id as subject_id,
                    s.name as subject_name,
                    s.code as subject_code,
                    'low_attendance' as reason
                FROM student_enrollments se
                JOIN subjects s ON se.subject_id = s.id
                LEFT JOIN student_attendance sa ON sa.enrollment_id = se.id
                WHERE se.user_id = ?
                AND se.status = 'active'
                GROUP BY s.id
                HAVING (COUNT(CASE WHEN sa.status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(sa.id), 0)) < 75
            ");
            $stmt->execute([$studentId]);
            $weakSubjects = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e2) {
            $weakSubjects = [];
        }
    }

    // Generate study blocks
    $studyPlan = generateStudyPlan($assignments, $exams, $weakSubjects);

    echo json_encode([
        'success' => true,
        'data' => [
            'study_plan' => $studyPlan,
            'upcoming_assignments' => $assignments,
            'upcoming_exams' => $exams,
            'weak_subjects' => $weakSubjects,
            'summary' => [
                'total_deadlines' => count($assignments) + count($exams),
                'assignments_pending' => count($assignments),
                'exams_upcoming' => count($exams),
                'subjects_need_attention' => count($weakSubjects)
            ]
        ]
    ]);
}

function generateStudyPlan($assignments, $exams, $weakSubjects)
{
    $plan = [];
    $today = new DateTime();

    // Combine all deadlines
    $deadlines = [];

    foreach ($assignments as $assignment) {
        $deadlines[] = [
            'type' => 'assignment',
            'title' => $assignment['title'],
            'subject' => $assignment['subject_name'],
            'subject_code' => $assignment['subject_code'],
            'date' => $assignment['due_date'],
            'marks' => $assignment['total_marks'],
            'priority' => calculatePriority($assignment['due_date'], $assignment['total_marks'])
        ];
    }

    foreach ($exams as $exam) {
        $deadlines[] = [
            'type' => 'exam',
            'title' => $exam['title'],
            'subject' => $exam['subject_name'],
            'subject_code' => $exam['subject_code'],
            'date' => date('Y-m-d', strtotime($exam['exam_date'])),
            'marks' => $exam['total_marks'],
            'exam_type' => $exam['exam_type'],
            'priority' => calculatePriority(date('Y-m-d', strtotime($exam['exam_date'])), $exam['total_marks'], true)
        ];
    }

    // Sort by priority (highest first)
    usort($deadlines, function ($a, $b) {
        return $b['priority'] - $a['priority'];
    });

    // Generate daily study blocks for next 7 days
    for ($i = 0; $i < 7; $i++) {
        $date = clone $today;
        $date->modify("+$i days");
        $dateStr = $date->format('Y-m-d');
        $dayName = $date->format('l');

        $dayPlan = [
            'date' => $dateStr,
            'day' => $dayName,
            'blocks' => []
        ];

        // Allocate study blocks based on priority
        $blocksAllocated = 0;
        $maxBlocksPerDay = ($dayName === 'Saturday' || $dayName === 'Sunday') ? 4 : 2;

        foreach ($deadlines as $deadline) {
            if ($blocksAllocated >= $maxBlocksPerDay)
                break;

            $daysUntilDeadline = (strtotime($deadline['date']) - strtotime($dateStr)) / 86400;

            // Only suggest study blocks if deadline is within next 7 days
            if ($daysUntilDeadline >= 0 && $daysUntilDeadline <= 7) {
                $urgency = 'medium';
                if ($daysUntilDeadline <= 2)
                    $urgency = 'high';
                elseif ($daysUntilDeadline >= 5)
                    $urgency = 'low';

                $duration = $deadline['type'] === 'exam' ? 120 : 90; // minutes
                $timeSlot = $blocksAllocated === 0 ? '18:00-' . date('H:i', strtotime('18:00') + $duration * 60) :
                    '20:00-' . date('H:i', strtotime('20:00') + $duration * 60);

                $dayPlan['blocks'][] = [
                    'subject' => $deadline['subject'],
                    'subject_code' => $deadline['subject_code'],
                    'task' => $deadline['type'] === 'exam' ? "Prepare for {$deadline['title']}" : "Work on {$deadline['title']}",
                    'type' => $deadline['type'],
                    'duration' => $duration,
                    'time_slot' => $timeSlot,
                    'urgency' => $urgency,
                    'deadline' => $deadline['date'],
                    'days_until' => (int) $daysUntilDeadline
                ];

                $blocksAllocated++;
            }
        }

        // Add weak subject review if slots available
        if ($blocksAllocated < $maxBlocksPerDay && !empty($weakSubjects)) {
            $weakSubject = $weakSubjects[array_rand($weakSubjects)];
            $dayPlan['blocks'][] = [
                'subject' => $weakSubject['subject_name'],
                'subject_code' => $weakSubject['subject_code'],
                'task' => "Review and practice",
                'type' => 'review',
                'duration' => 60,
                'time_slot' => '19:00-20:00',
                'urgency' => 'medium',
                'reason' => $weakSubject['reason']
            ];
        }

        $plan[] = $dayPlan;
    }

    return $plan;
}

function calculatePriority($dueDate, $marks, $isExam = false)
{
    $daysUntil = (strtotime($dueDate) - time()) / 86400;

    // Base priority on urgency
    $urgencyScore = 100 - ($daysUntil * 5); // Closer = higher priority
    if ($urgencyScore < 0)
        $urgencyScore = 0;

    // Weight by marks (higher marks = higher priority)
    $marksWeight = ($marks / 100) * 50;

    // Exams get bonus priority
    $examBonus = $isExam ? 30 : 0;

    return $urgencyScore + $marksWeight + $examBonus;
}
?>