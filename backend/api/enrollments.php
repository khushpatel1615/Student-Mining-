<?php
/**
 * Student Enrollment API
 * Handles auto-enrollment and enrollment management
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

try {
    switch ($method) {
        case 'GET':
            handleGet($pdo);
            break;
        case 'POST':
            handlePost($pdo);
            break;
        case 'PUT':
            handlePut($pdo);
            break;
        case 'DELETE':
            handleDelete($pdo);
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

/**
 * GET - Get student enrollments
 * For admin: if no user_id, get all enrollments for program/semester
 * For student: get own enrollments
 */
function handleGet($pdo)
{
    $userId = $_GET['user_id'] ?? null;
    $semester = $_GET['semester'] ?? null;
    $programId = $_GET['program_id'] ?? null;

    // Verify token
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    // Admin can view all enrollments; students can only view their own
    $isAdmin = $user['role'] === 'admin';

    if (!$isAdmin && $userId && $userId != $user['user_id']) {
        http_response_code(403);
        echo json_encode(['error' => 'Access denied']);
        return;
    }

    // If admin and no user_id specified, get all enrollments for the program/semester
    if ($isAdmin && !$userId && ($programId || $semester)) {
        $sql = "
            SELECT 
                se.id as enrollment_id,
                se.status,
                se.enrolled_at,
                se.final_grade,
                se.final_percentage,
                se.academic_year,
                u.id as user_id,
                u.full_name as student_name,
                u.student_id,
                u.email,
                s.id as subject_id,
                s.name as subject_name,
                s.code as subject_code,
                s.semester,
                s.subject_type,
                s.credits,
                p.id as program_id,
                p.name as program_name,
                p.code as program_code,
                (
                    SELECT ROUND(
                        (COUNT(CASE WHEN sa.status = 'present' THEN 1 END) * 100.0) / 
                        NULLIF(COUNT(*), 0), 2
                    )
                    FROM student_attendance sa 
                    WHERE sa.enrollment_id = se.id
                ) as attendance_percentage
            FROM student_enrollments se
            JOIN users u ON se.user_id = u.id
            JOIN subjects s ON se.subject_id = s.id
            JOIN programs p ON s.program_id = p.id
            WHERE u.role = 'student' AND se.status = 'active'
        ";
        $params = [];

        if ($programId) {
            $sql .= " AND s.program_id = ?";
            $params[] = $programId;
        }

        if ($semester) {
            $sql .= " AND s.semester = ?";
            $params[] = $semester;
        }

        $sql .= " ORDER BY u.full_name ASC, s.name ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $enrollments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $enrollments]);
        return;
    }

    // Single user enrollments (student's own or admin viewing specific student)
    $targetUserId = $userId ?? $user['user_id'];

    $sql = "
        SELECT 
            se.id as enrollment_id,
            se.status,
            se.enrolled_at,
            se.final_grade,
            se.final_percentage,
            s.id as subject_id,
            s.name as subject_name,
            s.code as subject_code,
            s.semester,
            s.subject_type,
            s.credits,
            p.name as program_name,
            p.code as program_code,
            (
                SELECT ROUND(
                    (COUNT(CASE WHEN sa.status = 'present' THEN 1 END) * 100.0) / 
                    NULLIF(COUNT(*), 0), 2
                )
                FROM student_attendance sa 
                WHERE sa.enrollment_id = se.id
            ) as attendance_percentage,
            (
                SELECT ROUND(SUM(sg.marks_obtained), 2)
                FROM student_grades sg
                WHERE sg.enrollment_id = se.id
            ) as total_marks_obtained
        FROM student_enrollments se
        JOIN subjects s ON se.subject_id = s.id
        JOIN programs p ON s.program_id = p.id
        WHERE se.user_id = ?
    ";
    $params = [$targetUserId];

    if ($semester) {
        $sql .= " AND s.semester = ?";
        $params[] = $semester;
    }

    $sql .= " ORDER BY s.semester ASC, s.subject_type DESC, s.name ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $enrollments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get grades for each enrollment
    foreach ($enrollments as &$enrollment) {
        $gradeStmt = $pdo->prepare("
            SELECT 
                sg.id as grade_id,
                sg.marks_obtained,
                sg.remarks,
                ec.component_name,
                ec.weight_percentage,
                ec.max_marks
            FROM student_grades sg
            JOIN evaluation_criteria ec ON sg.criteria_id = ec.id
            WHERE sg.enrollment_id = ?
            ORDER BY ec.weight_percentage DESC
        ");
        $gradeStmt->execute([$enrollment['enrollment_id']]);
        $enrollment['grades'] = $gradeStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Group by semester if requested
    if (isset($_GET['grouped']) && $_GET['grouped'] === 'true') {
        $grouped = [];
        foreach ($enrollments as $enrollment) {
            $sem = $enrollment['semester'];
            if (!isset($grouped[$sem])) {
                $grouped[$sem] = [
                    'semester' => $sem,
                    'subjects' => [],
                    'total_credits' => 0,
                    'avg_attendance' => 0,
                    'subjects_count' => 0
                ];
            }
            $grouped[$sem]['subjects'][] = $enrollment;
            $grouped[$sem]['total_credits'] += $enrollment['credits'];
            $grouped[$sem]['subjects_count']++;
            if ($enrollment['attendance_percentage']) {
                $grouped[$sem]['avg_attendance'] += $enrollment['attendance_percentage'];
            }
        }

        // Calculate average attendance per semester
        foreach ($grouped as &$sem) {
            if ($sem['subjects_count'] > 0) {
                $sem['avg_attendance'] = round($sem['avg_attendance'] / $sem['subjects_count'], 2);
            }
        }

        echo json_encode(['success' => true, 'data' => array_values($grouped)]);
    } else {
        echo json_encode(['success' => true, 'data' => $enrollments]);
    }
}

/**
 * POST - Auto-enroll student(s) in a semester (Admin only)
 * Supports both single user_id and array of user_ids for bulk enrollment
 */
function handlePost($pdo)
{
    $user = verifyAdminToken();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized. Admin access required.']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    if (empty($data['program_id']) || empty($data['semester'])) {
        http_response_code(400);
        echo json_encode(['error' => 'program_id and semester are required']);
        return;
    }

    // Support both single user_id and array of user_ids
    $userIds = [];
    if (!empty($data['user_ids']) && is_array($data['user_ids'])) {
        $userIds = $data['user_ids'];
    } elseif (!empty($data['user_id'])) {
        $userIds = [$data['user_id']];
    }

    if (empty($userIds)) {
        http_response_code(400);
        echo json_encode(['error' => 'user_id or user_ids is required']);
        return;
    }

    $programId = $data['program_id'];
    $semester = $data['semester'];
    $academicYear = $data['academic_year'] ?? date('Y') . '-' . (date('Y') + 1);

    $pdo->beginTransaction();

    try {
        // Get all subjects for this program/semester
        $stmt = $pdo->prepare("
            SELECT id FROM subjects 
            WHERE program_id = ? AND semester = ? AND is_active = TRUE
        ");
        $stmt->execute([$programId, $semester]);
        $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($subjects)) {
            throw new Exception("No subjects found for program $programId, semester $semester");
        }

        $totalEnrolledCount = 0;
        $studentsProcessed = 0;

        foreach ($userIds as $userId) {
            $enrolledCount = 0;

            foreach ($subjects as $subject) {
                // Create enrollment record (ignore if already exists)
                $enrollStmt = $pdo->prepare("
                    INSERT IGNORE INTO student_enrollments (user_id, subject_id, academic_year, status)
                    VALUES (?, ?, ?, 'active')
                ");
                $enrollStmt->execute([$userId, $subject['id'], $academicYear]);

                $enrollmentId = $pdo->lastInsertId();

                if ($enrollmentId > 0) {
                    $enrolledCount++;

                    // Check if evaluation criteria exist for this subject
                    $criteriaCheckStmt = $pdo->prepare("
                        SELECT COUNT(*) as count FROM evaluation_criteria WHERE subject_id = ?
                    ");
                    $criteriaCheckStmt->execute([$subject['id']]);
                    $criteriaCount = $criteriaCheckStmt->fetch(PDO::FETCH_ASSOC)['count'];

                    // If no criteria exist, create default criteria
                    if ($criteriaCount == 0) {
                        // Get subject info to determine criteria type
                        $subjectInfoStmt = $pdo->prepare("SELECT name, subject_type FROM subjects WHERE id = ?");
                        $subjectInfoStmt->execute([$subject['id']]);
                        $subjectInfo = $subjectInfoStmt->fetch(PDO::FETCH_ASSOC);

                        // Default criteria based on subject type
                        if (
                            $subjectInfo['subject_type'] === 'Core' ||
                            strpos($subjectInfo['name'], 'Programming') !== false ||
                            strpos($subjectInfo['name'], 'Lab') !== false
                        ) {
                            // Core/Programming subjects with practical component
                            $defaultCriteria = [
                                ['Final Exam', 40.00, 40, 'End semester examination'],
                                ['Mid-Term Exam', 20.00, 20, 'Mid semester examination'],
                                ['Lab Practicals', 25.00, 25, 'Laboratory/Practical work'],
                                ['Assignments', 15.00, 15, 'Assignments and homework']
                            ];
                        } else {
                            // Theory subjects
                            $defaultCriteria = [
                                ['Final Exam', 40.00, 40, 'End semester examination'],
                                ['Mid-Term Exam', 25.00, 25, 'Mid semester examination'],
                                ['Assignments', 20.00, 20, 'Assignments and homework'],
                                ['Class Participation', 15.00, 15, 'Class participation and quizzes']
                            ];
                        }

                        // Insert default criteria
                        $insertCriteriaStmt = $pdo->prepare("
                            INSERT INTO evaluation_criteria (subject_id, component_name, weight_percentage, max_marks, description)
                            VALUES (?, ?, ?, ?, ?)
                        ");
                        foreach ($defaultCriteria as $c) {
                            $insertCriteriaStmt->execute([$subject['id'], $c[0], $c[1], $c[2], $c[3]]);
                        }
                    }

                    // Get evaluation criteria for this subject (now should exist)
                    $criteriaStmt = $pdo->prepare("
                        SELECT id FROM evaluation_criteria WHERE subject_id = ?
                    ");
                    $criteriaStmt->execute([$subject['id']]);
                    $criteria = $criteriaStmt->fetchAll(PDO::FETCH_ASSOC);

                    // Create blank grade records
                    $gradeStmt = $pdo->prepare("
                        INSERT IGNORE INTO student_grades (enrollment_id, criteria_id)
                        VALUES (?, ?)
                    ");

                    foreach ($criteria as $c) {
                        $gradeStmt->execute([$enrollmentId, $c['id']]);
                    }
                }
            }

            // Update user's program and semester
            $updateStmt = $pdo->prepare("
                UPDATE users SET program_id = ?, current_semester = ? WHERE id = ?
            ");
            $updateStmt->execute([$programId, $semester, $userId]);

            $totalEnrolledCount += $enrolledCount;
            $studentsProcessed++;
        }

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => "$studentsProcessed student(s) enrolled in semester $semester",
            'data' => [
                'students_processed' => $studentsProcessed,
                'total_enrollments' => $totalEnrolledCount,
                'semester' => $semester,
                'academic_year' => $academicYear
            ]
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/**
 * PUT - Update enrollment status (Admin only)
 */
function handlePut($pdo)
{
    $user = verifyAdminToken();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized. Admin access required.']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['enrollment_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'enrollment_id is required']);
        return;
    }

    $fields = [];
    $params = [];

    if (isset($data['status'])) {
        $fields[] = 'status = ?';
        $params[] = $data['status'];
    }
    if (isset($data['final_grade'])) {
        $fields[] = 'final_grade = ?';
        $params[] = $data['final_grade'];
    }
    if (isset($data['final_percentage'])) {
        $fields[] = 'final_percentage = ?';
        $params[] = $data['final_percentage'];
    }

    if (empty($fields)) {
        http_response_code(400);
        echo json_encode(['error' => 'No fields to update']);
        return;
    }

    $params[] = $data['enrollment_id'];

    $stmt = $pdo->prepare("UPDATE student_enrollments SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($params);

    echo json_encode(['success' => true, 'message' => 'Enrollment updated successfully']);
}

/**
 * DELETE - Drop enrollment (Admin only)
 */
function handleDelete($pdo)
{
    $user = verifyAdminToken();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized. Admin access required.']);
        return;
    }

    $enrollmentId = $_GET['id'] ?? null;

    if (!$enrollmentId) {
        http_response_code(400);
        echo json_encode(['error' => 'Enrollment ID is required']);
        return;
    }

    // Set status to dropped instead of hard delete
    $stmt = $pdo->prepare("UPDATE student_enrollments SET status = 'dropped' WHERE id = ?");
    $stmt->execute([$enrollmentId]);

    echo json_encode(['success' => true, 'message' => 'Enrollment dropped successfully']);
}

/**
 * Helper: Get authenticated user payload
 */
function getAuthUser()
{
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return null;
    }

    $result = verifyToken($matches[1]);

    if (!$result['valid']) {
        return null;
    }

    return $result['payload'];
}

/**
 * Helper: Verify admin token
 */
function verifyAdminToken()
{
    $user = getAuthUser();

    if (!$user || $user['role'] !== 'admin') {
        return null;
    }

    return $user;
}
