<?php
/**
 * API Health Check Script - v2
 * Tests all API data queries against the live database
 */

$_SERVER['REQUEST_METHOD'] = $_SERVER['REQUEST_METHOD'] ?? 'GET';
header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

$pdo = getDBConnection();
$results = [];
$errors = [];

function testEndpoint($name, $callback)
{
    global $results, $errors;
    try {
        $result = $callback();
        $results[$name] = ['status' => 'OK', 'details' => $result];
    } catch (Exception $e) {
        $results[$name] = ['status' => 'ERROR', 'error' => $e->getMessage()];
        $errors[] = $name . ': ' . $e->getMessage();
    }
}

// ─── Get test users ──────────────────────────────────────────────────────
$studentUser = $pdo->query("SELECT id, role, student_id, email, full_name FROM users WHERE role = 'student' AND is_active = 1 LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$adminUser = $pdo->query("SELECT id, role, student_id, email, full_name FROM users WHERE role = 'admin' AND is_active = 1 LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$teacherUser = $pdo->query("SELECT id, role, student_id, email, full_name FROM users WHERE role = 'teacher' AND is_active = 1 LIMIT 1")->fetch(PDO::FETCH_ASSOC);

$results['_test_users'] = [
    'student' => $studentUser ? ['id' => $studentUser['id'], 'name' => $studentUser['full_name']] : 'NONE',
    'admin' => $adminUser ? ['id' => $adminUser['id'], 'name' => $adminUser['full_name']] : 'NONE',
    'teacher' => $teacherUser ? ['id' => $teacherUser['id'], 'name' => $teacherUser['full_name']] : 'NONE'
];

// ─── TABLE EXISTENCE ─────────────────────────────────────────────────────
testEndpoint('tables', function () use ($pdo) {
    $required = [
        'users',
        'programs',
        'subjects',
        'student_enrollments',
        'evaluation_criteria',
        'student_grades',
        'student_attendance',
        'assignments',
        'exams',
        'submissions',
        'notifications',
        'academic_calendar',
        'student_analytics',
        'announcements',
        'teacher_subjects'
    ];
    $missing = [];
    foreach ($required as $t) {
        if (!$pdo->query("SHOW TABLES LIKE '$t'")->fetch())
            $missing[] = $t;
    }
    return ['missing' => $missing, 'all_present' => empty($missing)];
});

// ─── STUDENT DASHBOARD ──────────────────────────────────────────────────
testEndpoint('student_dashboard', function () use ($pdo, $studentUser) {
    if (!$studentUser)
        throw new Exception('No student');
    $stmt = $pdo->prepare("
        SELECT se.id, se.status, s.id as subject_id, s.name, s.code, s.credits, s.semester
        FROM student_enrollments se
        JOIN subjects s ON se.subject_id = s.id
        WHERE se.user_id = ?
    ");
    $stmt->execute([$studentUser['id']]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $byStatus = array_count_values(array_column($rows, 'status'));
    return ['enrollments' => count($rows), 'by_status' => $byStatus];
});

// ─── STUDENT GRADES ─────────────────────────────────────────────────────
testEndpoint('student_grades', function () use ($pdo, $studentUser) {
    if (!$studentUser)
        throw new Exception('No student');
    $stmt = $pdo->prepare("
        SELECT sg.id, sg.marks_obtained, 
               ec.component_name, ec.max_marks, ec.weight_percentage,
               s.name AS subject_name, s.credits
        FROM student_grades sg
        JOIN evaluation_criteria ec ON sg.criteria_id = ec.id
        JOIN student_enrollments se ON sg.enrollment_id = se.id
        JOIN subjects s ON se.subject_id = s.id
        WHERE se.user_id = ?
        ORDER BY s.semester
    ");
    $stmt->execute([$studentUser['id']]);
    $grades = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return ['count' => count($grades), 'sample' => $grades[0] ?? 'none'];
});

// ─── NOTIFICATIONS ──────────────────────────────────────────────────────
testEndpoint('notifications', function () use ($pdo, $studentUser) {
    if (!$studentUser)
        throw new Exception('No student');
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ?");
    $stmt->execute([$studentUser['id']]);
    return ['count' => (int) $stmt->fetchColumn()];
});

// ─── CALENDAR ───────────────────────────────────────────────────────────
testEndpoint('calendar', function () use ($pdo) {
    $count = $pdo->query("SELECT COUNT(*) FROM academic_calendar")->fetchColumn();
    return ['events' => (int) $count];
});

// ─── ATTENDANCE ─────────────────────────────────────────────────────────
testEndpoint('attendance', function () use ($pdo, $studentUser) {
    if (!$studentUser)
        throw new Exception('No student');
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM student_attendance sa 
        JOIN student_enrollments se ON sa.enrollment_id = se.id 
        WHERE se.user_id = ?
    ");
    $stmt->execute([$studentUser['id']]);
    return ['records' => (int) $stmt->fetchColumn()];
});

// ─── ASSIGNMENTS ────────────────────────────────────────────────────────
testEndpoint('assignments', function () use ($pdo, $studentUser) {
    if (!$studentUser)
        throw new Exception('No student');
    $stmt = $pdo->prepare("
        SELECT a.id, a.title, a.due_date, a.total_points, s.name
        FROM assignments a
        JOIN subjects s ON a.subject_id = s.id
        JOIN student_enrollments se ON se.subject_id = s.id AND se.user_id = ?
        LIMIT 10
    ");
    $stmt->execute([$studentUser['id']]);
    return ['count' => count($stmt->fetchAll(PDO::FETCH_ASSOC))];
});

// ─── EXAMS ──────────────────────────────────────────────────────────────
testEndpoint('exams', function () use ($pdo, $studentUser) {
    if (!$studentUser)
        throw new Exception('No student');
    $stmt = $pdo->prepare("
        SELECT e.id, e.title FROM exams e
        JOIN subjects s ON e.subject_id = s.id
        JOIN student_enrollments se ON se.subject_id = s.id AND se.user_id = ?
        LIMIT 10
    ");
    $stmt->execute([$studentUser['id']]);
    return ['count' => count($stmt->fetchAll(PDO::FETCH_ASSOC))];
});

// ─── STUDENT ANALYTICS ──────────────────────────────────────────────────
testEndpoint('student_analytics', function () use ($pdo, $studentUser) {
    if (!$studentUser)
        throw new Exception('No student');
    $stmt = $pdo->prepare("SELECT * FROM student_analytics WHERE student_id = ?");
    $stmt->execute([$studentUser['id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row)
        return ['has_data' => false, 'warning' => 'No analytics row'];
    return ['has_data' => true, 'gpa' => $row['current_gpa'] ?? 'null', 'semester_gpa' => $row['semester_gpa'] ?? 'null'];
});

// ─── ENROLLMENTS ────────────────────────────────────────────────────────
testEndpoint('enrollments', function () use ($pdo, $studentUser) {
    if (!$studentUser)
        throw new Exception('No student');
    $stmt = $pdo->prepare("
        SELECT se.id, se.status, s.name, s.code, s.credits, s.semester
        FROM student_enrollments se
        JOIN subjects s ON se.subject_id = s.id
        WHERE se.user_id = ?
    ");
    $stmt->execute([$studentUser['id']]);
    return ['total' => count($stmt->fetchAll(PDO::FETCH_ASSOC))];
});

// ─── PROFILE ────────────────────────────────────────────────────────────
testEndpoint('profile', function () use ($pdo, $studentUser) {
    if (!$studentUser)
        throw new Exception('No student');
    $stmt = $pdo->prepare("
        SELECT u.id, u.full_name, u.email, u.student_id, u.mobile_primary, u.avatar_url,
               u.current_semester, u.is_active, u.program_id, p.name as program_name
        FROM users u LEFT JOIN programs p ON u.program_id = p.id WHERE u.id = ?
    ");
    $stmt->execute([$studentUser['id']]);
    $p = $stmt->fetch(PDO::FETCH_ASSOC);
    return ['found' => true, 'has_program' => !empty($p['program_id'])];
});

// ─── DEGREE AUDIT ───────────────────────────────────────────────────────
testEndpoint('degree_audit', function () use ($pdo, $studentUser) {
    if (!$studentUser)
        throw new Exception('No student');
    $stmt = $pdo->prepare("SELECT u.program_id, p.name, p.total_credits_required FROM users u LEFT JOIN programs p ON u.program_id = p.id WHERE u.id = ?");
    $stmt->execute([$studentUser['id']]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    return ['has_program' => !empty($u['program_id']), 'total_credits_required' => $u['total_credits_required'] ?? 'N/A'];
});

// ─── REPORTS ────────────────────────────────────────────────────────────
testEndpoint('reports', function () use ($pdo, $studentUser) {
    if (!$studentUser)
        throw new Exception('No student');
    $stmt = $pdo->prepare("SELECT u.full_name, u.student_id, p.name as program_name FROM users u LEFT JOIN programs p ON u.program_id = p.id WHERE u.id = ?");
    $stmt->execute([$studentUser['id']]);
    return ['found' => !empty($stmt->fetch(PDO::FETCH_ASSOC))];
});

// ─── ADMIN: ANALYTICS ───────────────────────────────────────────────────
testEndpoint('admin_analytics', function () use ($pdo) {
    $students = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = 1")->fetchColumn();
    $teachers = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'teacher' AND is_active = 1")->fetchColumn();
    $subjects = $pdo->query("SELECT COUNT(*) FROM subjects WHERE is_active = 1")->fetchColumn();
    $programs = $pdo->query("SELECT COUNT(*) FROM programs WHERE is_active = 1")->fetchColumn();
    $avgGpa = $pdo->query("SELECT AVG(current_gpa) FROM student_analytics")->fetchColumn();
    return [
        'students' => (int) $students,
        'teachers' => (int) $teachers,
        'subjects' => (int) $subjects,
        'programs' => (int) $programs,
        'avg_gpa' => $avgGpa ? round((float) $avgGpa, 2) : 'N/A'
    ];
});

// ─── ADMIN: PROGRAMS ────────────────────────────────────────────────────
testEndpoint('programs', function () use ($pdo) {
    $stmt = $pdo->query("SELECT id, name, code, total_semesters, total_credits_required, is_active FROM programs ORDER BY name");
    return ['count' => count($stmt->fetchAll(PDO::FETCH_ASSOC))];
});

// ─── ADMIN: SUBJECTS ────────────────────────────────────────────────────
testEndpoint('subjects', function () use ($pdo) {
    $stmt = $pdo->query("SELECT id, name, code, credits, semester FROM subjects WHERE is_active = 1 LIMIT 10");
    return ['count' => count($stmt->fetchAll(PDO::FETCH_ASSOC))];
});

// ─── ADMIN: STUDENTS LIST ───────────────────────────────────────────────
testEndpoint('admin_students', function () use ($pdo) {
    $stmt = $pdo->query("SELECT u.id, u.full_name, u.student_id, u.email, u.is_active, p.name as program_name FROM users u LEFT JOIN programs p ON u.program_id = p.id WHERE u.role = 'student' LIMIT 10");
    return ['count' => count($stmt->fetchAll(PDO::FETCH_ASSOC))];
});

// ─── ADMIN: GRADE COMPONENTS (evaluation_criteria) ──────────────────────
testEndpoint('grade_components', function () use ($pdo) {
    $stmt = $pdo->query("
        SELECT ec.id, ec.component_name, ec.max_marks, ec.weight_percentage, s.name as subject
        FROM evaluation_criteria ec JOIN subjects s ON ec.subject_id = s.id LIMIT 10
    ");
    return ['count' => count($stmt->fetchAll(PDO::FETCH_ASSOC))];
});

// ─── TEACHER: SUBJECTS ─────────────────────────────────────────────────
testEndpoint('teacher_subjects', function () use ($pdo, $teacherUser) {
    if (!$teacherUser)
        return ['warning' => 'No test teacher'];
    $stmt = $pdo->prepare("SELECT s.id, s.name FROM subjects s JOIN teacher_subjects ts ON s.id = ts.subject_id WHERE ts.teacher_id = ?");
    $stmt->execute([$teacherUser['id']]);
    $subs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return ['count' => count($subs)];
});

// ─── TEACHER: SUBJECT STUDENTS ──────────────────────────────────────────
testEndpoint('teacher_subject_students', function () use ($pdo, $teacherUser) {
    if (!$teacherUser)
        return ['warning' => 'No test teacher'];
    $stmt = $pdo->prepare("SELECT s.id FROM subjects s JOIN teacher_subjects ts ON s.id = ts.subject_id WHERE ts.teacher_id = ? LIMIT 1");
    $stmt->execute([$teacherUser['id']]);
    $sub = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$sub)
        return ['warning' => 'Teacher has no subjects'];

    $stmt2 = $pdo->prepare("
        SELECT u.id, u.student_id, u.full_name, se.id as enrollment_id, se.enrolled_at, se.status
        FROM student_enrollments se JOIN users u ON se.user_id = u.id
        WHERE se.subject_id = ? AND se.status = 'active'
    ");
    $stmt2->execute([$sub['id']]);
    $students = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    return ['subject_id' => $sub['id'], 'students' => count($students)];
});

// ─── DATA CONSISTENCY ───────────────────────────────────────────────────
testEndpoint('data_consistency', function () use ($pdo) {
    $orphanEnrollments = $pdo->query("SELECT COUNT(*) FROM student_enrollments se LEFT JOIN users u ON se.user_id = u.id WHERE u.id IS NULL")->fetchColumn();
    $orphanGrades = $pdo->query("SELECT COUNT(*) FROM student_grades g LEFT JOIN student_enrollments se ON g.enrollment_id = se.id WHERE se.id IS NULL")->fetchColumn();
    $orphanCriteria = $pdo->query("SELECT COUNT(*) FROM student_grades g LEFT JOIN evaluation_criteria ec ON g.criteria_id = ec.id WHERE ec.id IS NULL")->fetchColumn();
    $noProgramStudents = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = 1 AND program_id IS NULL")->fetchColumn();

    $issues = [];
    if ($orphanEnrollments > 0)
        $issues[] = "$orphanEnrollments orphan enrollments";
    if ($orphanGrades > 0)
        $issues[] = "$orphanGrades orphan grades";
    if ($orphanCriteria > 0)
        $issues[] = "$orphanCriteria grades with missing criteria";
    if ($noProgramStudents > 0)
        $issues[] = "$noProgramStudents students without program";

    return ['issues' => $issues, 'all_clean' => empty($issues)];
});

// ─── API FILES CHECK ────────────────────────────────────────────────────
testEndpoint('api_files', function () {
    $apiDir = __DIR__;
    $endpoints = [
        'login.php',
        'students.php',
        'student_dashboard.php',
        'grades.php',
        'grade_components.php',
        'notifications.php',
        'calendar.php',
        'attendance.php',
        'assignments.php',
        'exams.php',
        'submissions.php',
        'enrollments.php',
        'performance.php',
        'reports.php',
        'profile.php',
        'programs.php',
        'subjects.php',
        'subject_details.php',
        'teachers.php',
        'degree_audit.php',
        'study_planner.php',
        'announcements.php',
        'health.php',
        'analytics.php',
        'analytics/admin.php',
        'forgot_password.php',
        'verify_otp.php',
        'reset_password.php'
    ];
    $missing = [];
    foreach ($endpoints as $ep) {
        if (!file_exists($apiDir . '/' . $ep))
            $missing[] = $ep;
    }
    return ['checked' => count($endpoints), 'missing' => $missing, 'all_present' => empty($missing)];
});

// ─── VIEW CHECK ─────────────────────────────────────────────────────────
testEndpoint('views', function () use ($pdo) {
    $exists = $pdo->query("SHOW TABLES LIKE 'vw_student_performance'")->fetch();
    return ['vw_student_performance' => $exists ? 'EXISTS' : 'MISSING'];
});

// ─── OUTPUT ──────────────────────────────────────────────────────────────
$passed = 0;
$failed = 0;
foreach ($results as $k => $v) {
    if ($k === '_test_users')
        continue;
    if ($v['status'] === 'OK')
        $passed++;
    else
        $failed++;
}

echo json_encode([
    'summary' => ['total' => $passed + $failed, 'passed' => $passed, 'failed' => $failed, 'errors' => $errors],
    'results' => $results
], JSON_PRETTY_PRINT);
