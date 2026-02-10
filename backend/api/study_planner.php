<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

header('Content-Type: application/json');

$headers = getallheaders();
$token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
if (!$token) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No token provided']);
    exit();
}

$result = verifyToken($token);
if (!$result['valid']) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => $result['error']]);
    exit();
}

$pdo = getDBConnection();
$decoded = (object) $result['payload'];
$userId = $decoded->user_id;

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        exit();
    }

    $recommendationData = generateLearningRecommendation($pdo, $userId);

    echo json_encode([
        'success' => true,
        'recommendation' => $recommendationData['primary'],
        'recommendations' => $recommendationData['all']
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function generateLearningRecommendation($pdo, $studentId)
{
    $assignments = fetchStudentAssignments($pdo, $studentId);
    $exams = fetchStudentExams($pdo, $studentId);

    $items = [];
    foreach ($assignments as $assignment) {
        if (!empty($assignment['submission_id'])) {
            continue;
        }
        if (empty($assignment['due_date'])) {
            continue;
        }
        $items[] = [
            'type' => 'assignment',
            'type_label' => detectAssignmentType($assignment['title'] ?? ''),
            'subject_name' => $assignment['subject_name'] ?? 'this subject',
            'subject_id' => $assignment['subject_id'] ?? null,
            'title' => $assignment['title'] ?? 'assignment',
            'date' => $assignment['due_date']
        ];
    }

    foreach ($exams as $exam) {
        if (empty($exam['start_datetime'])) {
            continue;
        }
        $items[] = [
            'type' => 'exam',
            'type_label' => 'exam',
            'subject_name' => $exam['subject_name'] ?? 'this subject',
            'subject_id' => $exam['subject_id'] ?? null,
            'title' => $exam['title'] ?? 'exam',
            'date' => $exam['start_datetime']
        ];
    }

    if (empty($items)) {
        return [
            'primary' => "You're up to date. Review recent notes and keep practicing to stay ahead.",
            'all' => [
                "You're up to date. Review recent notes and keep practicing to stay ahead."
            ]
        ];
    }

    $today = new DateTimeImmutable('today');
    foreach ($items as &$item) {
        $due = new DateTimeImmutable($item['date']);
        $item['days_until'] = getDaysUntil($today, $due);
        $item['urgency'] = getUrgencyBucket($item['days_until']);
    }
    unset($item);

    usort($items, function ($a, $b) {
        $priority = ['overdue' => 0, 'due_soon' => 1, 'upcoming' => 2];
        $pa = $priority[$a['urgency']] ?? 3;
        $pb = $priority[$b['urgency']] ?? 3;
        if ($pa !== $pb) {
            return $pa - $pb;
        }
        return $a['days_until'] <=> $b['days_until'];
    });

    $selected = pickTopRecommendations($items, 2);
    $recommendations = [];
    foreach ($selected as $target) {
        $topics = getTopicsForSubject($pdo, $target['subject_id'] ?? null, $target['subject_name']);
        $topicText = formatTopicList($topics);
        $recommendations[] = buildRecommendationText(
            $target['subject_name'],
            $target['type_label'],
            $target['urgency'],
            $target['days_until'],
            $topicText
        );
    }

    return [
        'primary' => $recommendations[0] ?? '',
        'all' => $recommendations
    ];
}

function fetchStudentAssignments($pdo, $studentId)
{
    $stmt = $pdo->prepare("
        SELECT 
            a.id,
            a.title,
            a.due_date,
            a.subject_id,
            s.name as subject_name,
            s.code as subject_code,
            sub.id as submission_id
        FROM assignments a
        JOIN subjects s ON a.subject_id = s.id
        JOIN student_enrollments se ON a.subject_id = se.subject_id AND se.user_id = ?
        LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
        WHERE a.due_date IS NOT NULL
        ORDER BY a.due_date ASC
    ");
    $stmt->execute([$studentId, $studentId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function fetchStudentExams($pdo, $studentId)
{
    $stmt = $pdo->prepare("
        SELECT 
            e.id,
            e.title,
            e.start_datetime,
            e.subject_id,
            s.name as subject_name,
            s.code as subject_code
        FROM exams e
        JOIN subjects s ON e.subject_id = s.id
        JOIN student_enrollments se ON e.subject_id = se.subject_id AND se.user_id = ?
        WHERE e.start_datetime IS NOT NULL
        ORDER BY e.start_datetime ASC
    ");
    $stmt->execute([$studentId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function getUrgencyBucket($daysUntil)
{
    if ($daysUntil < 0) {
        return 'overdue';
    }
    if ($daysUntil <= 3) {
        return 'due_soon';
    }
    return 'upcoming';
}

function getDaysUntil(DateTimeImmutable $today, DateTimeImmutable $due)
{
    $t = $today->setTime(0, 0, 0);
    $d = $due->setTime(0, 0, 0);
    $diff = $t->diff($d);
    return (int) $diff->format('%r%a');
}

function detectAssignmentType($title)
{
    $text = strtolower($title);
    if (strpos($text, 'lab') !== false) {
        return 'lab';
    }
    if (strpos($text, 'project') !== false) {
        return 'project';
    }
    if (strpos($text, 'quiz') !== false) {
        return 'quiz';
    }
    return 'assignment';
}

function getTopicsForSubject($pdo, $subjectId, $subjectName)
{
    $topicsText = null;

    if ($subjectId) {
        $stmt = $pdo->prepare("SELECT topics FROM subject_topics WHERE subject_id = ? LIMIT 1");
        $stmt->execute([$subjectId]);
        $topicsText = $stmt->fetchColumn();
    }

    if (!$topicsText && $subjectName) {
        $stmt = $pdo->prepare("SELECT topics FROM subject_topics WHERE subject_name = ? LIMIT 1");
        $stmt->execute([$subjectName]);
        $topicsText = $stmt->fetchColumn();
    }

    if ($topicsText) {
        return array_map('trim', array_filter(explode(',', $topicsText)));
    }

    $name = strtolower($subjectName ?? '');
    $map = [
        'programming' => ['loops', 'arrays', 'functions', 'pointers'],
        'c ' => ['loops', 'arrays', 'functions', 'pointers'],
        'c programming' => ['loops', 'arrays', 'functions', 'pointers'],
        'database' => ['select queries', 'joins', 'normalization', 'indexes'],
        'sql' => ['select queries', 'joins', 'grouping', 'constraints'],
        'web' => ['html forms', 'css layout', 'javascript events', 'dom manipulation'],
        'network' => ['osi model', 'ip addressing', 'routing basics'],
        'operating system' => ['process scheduling', 'memory management', 'file systems'],
        'data structure' => ['arrays', 'linked lists', 'stacks', 'queues'],
        'algorithm' => ['time complexity', 'sorting', 'searching'],
        'math' => ['core formulas', 'problem sets', 'practice questions'],
        'physics' => ['key formulas', 'worked examples', 'conceptual review'],
        'chemistry' => ['reactions', 'moles', 'stoichiometry'],
        'electronics' => ['circuits', 'components', 'signals'],
    ];

    foreach ($map as $key => $topics) {
        if ($name && strpos($name, $key) !== false) {
            return $topics;
        }
    }

    return ['core concepts', 'key examples', 'practice questions'];
}

function formatTopicList($topics)
{
    $topics = array_values(array_filter($topics));
    $count = count($topics);
    if ($count === 0) {
        return 'core concepts';
    }
    if ($count === 1) {
        return $topics[0];
    }
    if ($count === 2) {
        return $topics[0] . ' and ' . $topics[1];
    }
    $last = array_pop($topics);
    return implode(', ', $topics) . ', and ' . $last;
}

function buildRecommendationText($subjectName, $typeLabel, $urgency, $daysUntil, $topics)
{
    $subject = $subjectName ?: 'this subject';
    $type = $typeLabel ?: 'assignment';

    if ($urgency === 'overdue') {
        return "Your {$subject} {$type} is overdue. Prioritize {$topics} to get back on track.";
    }

    if ($urgency === 'due_soon') {
        $dayText = $daysUntil <= 0 ? 'today' : "in {$daysUntil} day" . ($daysUntil === 1 ? '' : 's');
        return "Your {$subject} {$type} is due {$dayText}. Focus on {$topics} to strengthen your work.";
    }

    return "Prepare for your upcoming {$subject} {$type} by reviewing {$topics} and planning a short study block.";
}

function pickTopRecommendations($items, $limit)
{
    $picked = [];
    $typesPicked = [];
    foreach ($items as $item) {
        if (count($picked) >= $limit) {
            break;
        }
        if (!isset($typesPicked[$item['type']])) {
            $picked[] = $item;
            $typesPicked[$item['type']] = true;
        }
    }

    if (count($picked) >= $limit) {
        return $picked;
    }

    foreach ($items as $item) {
        if (count($picked) >= $limit) {
            break;
        }
        $picked[] = $item;
    }

    return $picked;
}
