<?php

/**
 * Student Grades API
 * Handles grade management for enrolled subjects
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/cache.php';
require_once __DIR__ . '/../includes/jwt.php';
require_once __DIR__ . '/../includes/api_helpers.php';
require_once __DIR__ . '/../includes/notifications.php';

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Set CORS headers
handleCORS();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

try {
    switch ($method) {
        case 'GET':
            handleGet($pdo);
            break;
        case 'PUT':
            handlePut($pdo);
            break;
        case 'POST':
            handlePost($pdo);
            break;
        case 'OPTIONS':
            exit(0);
        default:
            sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    error_log("Grades API Error: " . $e->getMessage());
    sendError('Internal Server Error', 500, $e->getMessage());
}

/**
 * Clamp percentage to 0-100 range
 */
function clampPercentage($value)
{
    if ($value === null)
        return null;
    $val = (float) $value;
    return max(0, min(100, $val));
}

/**
 * GET - Get grades for student/enrollment/subject
 */
function handleGet($pdo)
{
    // Authenticate
    $user = requireAuth();

    $userId = $_GET['user_id'] ?? null;
    $enrollmentId = $_GET['enrollment_id'] ?? null;
    $subjectId = $_GET['subject_id'] ?? null;
    $programId = $_GET['program_id'] ?? null;
    $semester = $_GET['semester'] ?? null;

    // Authorization Check
    if ($user['role'] !== 'admin' && $userId && $userId != $user['user_id']) {
        sendError('Access denied', 403);
    }

    // Default to current user if no userId provided and not admin looking for specific list
    if (!$userId && !$programId && !$subjectId && !$enrollmentId && $user['role'] !== 'admin') {
        $userId = $user['user_id'];
    }

    // Case 1a: Fetch all students across all subjects for a program/semester (Admin grading view)
    if ($programId && $user['role'] === 'admin') {
        // Get all subjects for this program (and optional semester)
        $sql = "SELECT id, name, code FROM subjects WHERE program_id = ?";
        $params = [$programId];
        if (!empty($semester)) {
            $sql .= " AND semester = ?";
            $params[] = $semester;
        }
        $sql .= " ORDER BY name ASC";
        $subjectsStmt = $pdo->prepare($sql);
        $subjectsStmt->execute($params);
        $subjects = $subjectsStmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($subjects)) {
            sendResponse([
                'criteria' => [],
                'enrollments' => [],
                'subjects' => []
            ]);
        }

        $subjectIds = array_column($subjects, 'id');
        $placeholders = str_repeat('?,', count($subjectIds) - 1) . '?';

        // Get all unique evaluation criteria across these subjects
        $criteriaStmt = $pdo->prepare("
            SELECT DISTINCT ec.id, ec.component_name, ec.weight_percentage, ec.max_marks, ec.subject_id,
                   s.name as subject_name, s.code as subject_code
            FROM evaluation_criteria ec
            JOIN subjects s ON ec.subject_id = s.id
            WHERE ec.subject_id IN ($placeholders)
            ORDER BY s.name ASC, ec.weight_percentage DESC
        ");
        $criteriaStmt->execute($subjectIds);
        $criteria = $criteriaStmt->fetchAll(PDO::FETCH_ASSOC);

        // Get all enrollments for these subjects with student info
        $enrollStmt = $pdo->prepare("
            SELECT 
                se.id, se.user_id, se.subject_id, se.status,
                se.final_percentage, se.final_grade,
                u.full_name as student_name, u.student_id, u.email,
                s.name as subject_name, s.code as subject_code
            FROM student_enrollments se
            JOIN users u ON se.user_id = u.id
            JOIN subjects s ON se.subject_id = s.id
            WHERE se.subject_id IN ($placeholders)
            ORDER BY u.full_name ASC, s.name ASC
        ");
        $enrollStmt->execute($subjectIds);
        $enrollments = $enrollStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($enrollments as &$enrollment) {
            if (isset($enrollment['final_percentage'])) {
                $enrollment['final_percentage'] = clampPercentage($enrollment['final_percentage']);
            }
        }

        // Bulk fetch grades for all enrollments (Optimized + Chunked)
        if (!empty($enrollments)) {
            $eIds = array_column($enrollments, 'id');
            $gradesGrouped = [];

            // Process in chunks of 500 to safe-guard against placeholder limits
            $chunks = array_chunk($eIds, 500);
            foreach ($chunks as $chunk) {
                if (empty($chunk))
                    continue;

                $p = str_repeat('?,', count($chunk) - 1) . '?';
                $chunkStmt = $pdo->prepare("
                    SELECT 
                        sg.id as grade_id, sg.criteria_id, sg.marks_obtained, sg.remarks, sg.enrollment_id,
                        ec.weight_percentage, ec.max_marks, ec.component_name,
                        (sg.marks_obtained / ec.max_marks) * ec.weight_percentage AS weighted_contribution
                    FROM student_grades sg
                    JOIN evaluation_criteria ec ON sg.criteria_id = ec.id
                    WHERE sg.enrollment_id IN ($p)
                ");
                $chunkStmt->execute($chunk);
                $chunkGrades = $chunkStmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($chunkGrades as $g) {
                    $eid = $g['enrollment_id'];
                    unset($g['enrollment_id']);
                    $gradesGrouped[$eid][] = $g;
                }
            }

            // Attach to enrollments
            foreach ($enrollments as &$e) {
                $e['grades'] = $gradesGrouped[$e['id']] ?? [];
            }
        }

        sendResponse([
            'criteria' => $criteria,
            'enrollments' => $enrollments,
            'subjects' => $subjects
        ]);
    }

    // Case 1b: Fetch all students enrolled in a subject (Admin grading view)
    if ($subjectId && $user['role'] === 'admin') {
        // Get evaluation criteria for the subject
        $criteriaStmt = $pdo->prepare("
            SELECT id, component_name, weight_percentage, max_marks 
            FROM evaluation_criteria 
            WHERE subject_id = ?
            ORDER BY weight_percentage DESC
        ");
        $criteriaStmt->execute([$subjectId]);
        $criteria = $criteriaStmt->fetchAll(PDO::FETCH_ASSOC);

        $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
        $offset = ($page - 1) * $limit;

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM student_enrollments se WHERE se.subject_id = ? AND se.status = 'active'");
        $countStmt->execute([$subjectId]);
        $total = $countStmt->fetchColumn();
        $totalPages = ceil($total / $limit) ?: 1;

        // Get all enrollments for this subject with student info
        $enrollStmt = $pdo->prepare("
            SELECT 
                se.id, se.user_id, se.status, se.final_percentage, se.final_grade,
                u.full_name as student_name, u.student_id, u.email
            FROM student_enrollments se
            JOIN users u ON se.user_id = u.id
            WHERE se.subject_id = :subj AND se.status = 'active'
            ORDER BY u.full_name ASC
            LIMIT :lim OFFSET :off
        ");
        $enrollStmt->bindValue(':subj', $subjectId, PDO::PARAM_INT);
        $enrollStmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $enrollStmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $enrollStmt->execute();
        $enrollments = $enrollStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($enrollments as &$enrollment) {
            if (isset($enrollment['final_percentage'])) {
                $enrollment['final_percentage'] = clampPercentage($enrollment['final_percentage']);
            }
        }

        // If no criteria exist for this subject, create default ones
        if (empty($criteria)) {
            $subjectInfoStmt = $pdo->prepare("SELECT name, subject_type FROM subjects WHERE id = ?");
            $subjectInfoStmt->execute([$subjectId]);
            $subjectInfo = $subjectInfoStmt->fetch(PDO::FETCH_ASSOC);

            if ($subjectInfo) {
                // Default criteria based on subject type
                if ($subjectInfo['subject_type'] === 'Core' || strpos($subjectInfo['name'], 'Programming') !== false || strpos($subjectInfo['name'], 'Lab') !== false) {
                    $defaultCriteria = [
                        ['Final Exam', 40.00, 40, 'End semester examination'],
                        ['Mid-Term Exam', 20.00, 20, 'Mid semester examination'],
                        ['Lab Practicals', 25.00, 25, 'Laboratory/Practical work'],
                        ['Assignments', 15.00, 15, 'Assignments and homework']
                    ];
                } else {
                    $defaultCriteria = [
                        ['Final Exam', 40.00, 40, 'End semester examination'],
                        ['Mid-Term Exam', 25.00, 25, 'Mid semester examination'],
                        ['Assignments', 20.00, 20, 'Assignments and homework'],
                        ['Class Participation', 15.00, 15, 'Class participation and quizzes']
                    ];
                }

                $insertCriteriaStmt = $pdo->prepare("
                    INSERT INTO evaluation_criteria (subject_id, component_name, weight_percentage, max_marks, description)
                    VALUES (?, ?, ?, ?, ?)
                ");
                foreach ($defaultCriteria as $c) {
                    $insertCriteriaStmt->execute([$subjectId, $c[0], $c[1], $c[2], $c[3]]);
                }

                // Re-fetch criteria
                $criteriaStmt->execute([$subjectId]);
                $criteria = $criteriaStmt->fetchAll(PDO::FETCH_ASSOC);
            }
        }

        // Get grades for each enrollment, create if missing
        foreach ($enrollments as &$enrollment) {
            // Ensure grade records exist for all criteria
            foreach ($criteria as $c) {
                $insertGradeStmt = $pdo->prepare("
                    INSERT IGNORE INTO student_grades (enrollment_id, criteria_id)
                    VALUES (?, ?)
                ");
                $insertGradeStmt->execute([$enrollment['id'], $c['id']]);
            }

            // Now fetch grades
            $gradeStmt = $pdo->prepare("
                SELECT 
                    sg.id as grade_id, sg.criteria_id, sg.marks_obtained, sg.remarks,
                    ec.weight_percentage, ec.max_marks, ec.component_name,
                    (sg.marks_obtained / ec.max_marks) * ec.weight_percentage AS weighted_contribution
                FROM student_grades sg
                JOIN evaluation_criteria ec ON sg.criteria_id = ec.id
                WHERE sg.enrollment_id = ?
            ");
            $gradeStmt->execute([$enrollment['id']]);
            $enrollment['grades'] = $gradeStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        sendResponse([
            'criteria' => $criteria,
            'enrollments' => $enrollments,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => (int) $total,
                'totalPages' => (int) $totalPages
            ]
        ]);
    }

    // Case 2: Get grades for specific enrollment
    if ($enrollmentId) {
        $stmt = $pdo->prepare("
            SELECT 
                sg.id, sg.marks_obtained, sg.remarks, sg.graded_at,
                ec.id as criteria_id, ec.component_name, ec.weight_percentage, ec.max_marks,
                (sg.marks_obtained / ec.max_marks) * ec.weight_percentage AS weighted_contribution,
                s.name as subject_name, s.code as subject_code
            FROM student_grades sg
            JOIN evaluation_criteria ec ON sg.criteria_id = ec.id
            JOIN student_enrollments se ON sg.enrollment_id = se.id
            JOIN subjects s ON se.subject_id = s.id
            WHERE sg.enrollment_id = ?
            ORDER BY ec.weight_percentage DESC
        ");
        $stmt->execute([$enrollmentId]);
        $grades = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate totals
        $totalObtained = 0;
        $totalMax = 0;
        foreach ($grades as $grade) {
            if ($grade['marks_obtained'] !== null) {
                $totalObtained += $grade['marks_obtained'];
                $totalMax += $grade['max_marks'];
            }
        }

        $percentage = $totalMax > 0 ? round(($totalObtained / $totalMax) * 100, 2) : null;
        $percentage = clampPercentage($percentage);

        sendResponse([
            'grades' => $grades,
            'summary' => [
                'total_obtained' => $totalObtained,
                'total_max' => $totalMax,
                'percentage' => $percentage
            ]
        ]);
    }

    // Case 3: Get all grades for a user, grouped by subject
    $targetUserId = $userId ?? $user['user_id'];

    // Get only the latest enrollment for each subject
    $sql = "
        SELECT 
            se.id as enrollment_id, s.id as subject_id, s.name as subject_name, s.code as subject_code,
            s.semester, s.credits, se.status, se.final_percentage, se.final_grade
        FROM student_enrollments se
        JOIN subjects s ON se.subject_id = s.id
        WHERE se.user_id = ?
        AND se.id IN (
            SELECT MAX(se2.id)
            FROM student_enrollments se2
            WHERE se2.user_id = se.user_id AND se2.subject_id = se.subject_id
            GROUP BY se2.subject_id
        )
    ";

    $params = [$targetUserId];
    if ($subjectId) {
        $sql .= " AND s.id = ?";
        $params[] = $subjectId;
    }

    $sql .= " ORDER BY s.semester ASC, s.name ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($results as &$result) {
        if (isset($result['final_percentage'])) {
            $result['final_percentage'] = clampPercentage($result['final_percentage']);
        }
    }

    // Fetch details
    if (!empty($results)) {
        $enrollmentIds = array_column($results, 'enrollment_id');
        if (!empty($enrollmentIds)) {
            $placeholders = str_repeat('?,', count($enrollmentIds) - 1) . '?';
            $gradesSql = "
                SELECT 
                    sg.enrollment_id, sg.id, sg.marks_obtained,
                    ec.component_name, ec.max_marks, ec.weight_percentage,
                    (sg.marks_obtained / ec.max_marks) * ec.weight_percentage AS weighted_contribution
                FROM student_grades sg
                JOIN evaluation_criteria ec ON sg.criteria_id = ec.id
                WHERE sg.enrollment_id IN ($placeholders)
            ";
            $gradesStmt = $pdo->prepare($gradesSql);
            $gradesStmt->execute($enrollmentIds);
            $allGrades = $gradesStmt->fetchAll(PDO::FETCH_ASSOC);

            // Group by enrollment_id
            $gradesGrouped = [];
            foreach ($allGrades as $grade) {
                $eid = $grade['enrollment_id'];
                $gradesGrouped[$eid][] = $grade;
            }

            // Attach grouped grades to results
            foreach ($results as &$result) {
                $eid = $result['enrollment_id'];
                $result['grades'] = $gradesGrouped[$eid] ?? [];
            }
        } else {
            foreach ($results as &$result) {
                $result['grades'] = [];
            }
        }
    }

    sendResponse($results);
}

/**
 * PUT - Update grades (Admin only)
 */
function handlePut($pdo)
{
    $user = requireRole('admin');
    $data = getJsonInput();

    // Support recalculate action
    if (isset($data['action']) && $data['action'] === 'recalculate_subject') {
        if (empty($data['subject_id']))
            sendError('subject_id is required', 400);

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT id, user_id FROM student_enrollments WHERE subject_id = ? AND status = 'active' FOR UPDATE");
            $stmt->execute([$data['subject_id']]);
            $enrollments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $affectedUsers = [];
            foreach ($enrollments as $e) {
                updateFinalPercentage($pdo, $e['id']);
                $affectedUsers[$e['user_id']] = true;
            }

            foreach (array_keys($affectedUsers) as $userId) {
                syncStudentAnalytics($pdo, $userId);
                Cache::forget("gpa_history_{$userId}");
                Cache::forget("degree_audit_{$userId}");
                Cache::forgetPattern("dashboard_summary_{$userId}");
            }
            $pdo->commit();
            sendResponse(['message' => 'Grades recalculated successfully']);
        } catch (Exception $e) {
            $pdo->rollBack();
            sendError('Failed to recalculate grades', 500);
        }
    }

    if (empty($data['grade_id']) && empty($data['grades'])) {
        sendError('grade_id or grades array is required', 400);
    }

    $subjectIdToValidate = null;
    if (!empty($data['grades']) && is_array($data['grades'])) {
        foreach ($data['grades'] as $g) {
            if (isset($g['criteria_id'])) {
                $stmtSubject = $pdo->prepare("SELECT subject_id FROM evaluation_criteria WHERE id = ?");
                $stmtSubject->execute([$g['criteria_id']]);
                $subjectIdToValidate = $stmtSubject->fetchColumn();
                break;
            }
        }
    } elseif (!empty($data['grade_id'])) {
        $stmtSubject = $pdo->prepare("
            SELECT ec.subject_id FROM student_grades sg 
            JOIN evaluation_criteria ec ON sg.criteria_id = ec.id 
            WHERE sg.id = ?
        ");
        $stmtSubject->execute([$data['grade_id']]);
        $subjectIdToValidate = $stmtSubject->fetchColumn();
    }

    if ($subjectIdToValidate) {
        $sumStmt = $pdo->prepare("SELECT SUM(weight_percentage) FROM evaluation_criteria WHERE subject_id = ?");
        $sumStmt->execute([$subjectIdToValidate]);
        $sum = $sumStmt->fetchColumn();
        if (abs((float) $sum - 100.0) > 0.01) {
            sendError('Grade criteria weights do not sum to 100% for this subject.', 400);
        }
    }

    // Validate marks
    if (!empty($data['grades']) && is_array($data['grades'])) {
        $criteriaIds = [];
        foreach ($data['grades'] as $grade) {
            if (isset($grade['criteria_id']))
                $criteriaIds[] = (int) $grade['criteria_id'];
        }

        $criteriaMax = [];
        if (!empty($criteriaIds)) {
            $criteriaIds = array_values(array_unique($criteriaIds));
            $placeholders = str_repeat('?,', count($criteriaIds) - 1) . '?';
            $stmt = $pdo->prepare("SELECT id, max_marks FROM evaluation_criteria WHERE id IN ($placeholders)");
            $stmt->execute($criteriaIds);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as $row) {
                $criteriaMax[(int) $row['id']] = (float) $row['max_marks'];
            }
        }

        foreach ($data['grades'] as $grade) {
            $marks = $grade['marks_obtained'] ?? null;
            $criteriaId = $grade['criteria_id'] ?? null;
            if ($marks === null || $marks === '')
                continue;

            if (!is_numeric($marks))
                sendError('Invalid marks value', 400);
            if ((float) $marks < 0)
                sendError('Marks cannot be negative', 400);

            if ($criteriaId && isset($criteriaMax[(int) $criteriaId]) && (float) $marks > $criteriaMax[(int) $criteriaId]) {
                sendError("Marks exceed max for criteria {$criteriaId}", 400);
            }
        }
    }

    $pdo->beginTransaction();
    $updatedEnrollments = [];

    try {
        // Bulk update
        if (!empty($data['grades']) && is_array($data['grades'])) {
            foreach ($data['grades'] as $grade) {
                $enrollmentId = $grade['enrollment_id'] ?? null;
                $criteriaId = $grade['criteria_id'] ?? null;
                $gradeId = $grade['grade_id'] ?? null;
                $marks = $grade['marks_obtained'];
                $remarks = $grade['remarks'] ?? null;

                if ($gradeId) {
                    $infoStmt = $pdo->prepare("
                        SELECT sg.marks_obtained, sg.enrollment_id, sg.criteria_id, se.is_finalized, ec.component_name
                        FROM student_grades sg
                        JOIN student_enrollments se ON sg.enrollment_id = se.id
                        JOIN evaluation_criteria ec ON sg.criteria_id = ec.id
                        WHERE sg.id = ?
                    ");
                    $infoStmt->execute([$gradeId]);
                    $info = $infoStmt->fetch(PDO::FETCH_ASSOC);

                    if ($info && $info['is_finalized']) {
                        if ($user['role'] !== 'admin') {
                            $pdo->rollBack();
                            sendError("This subject has been finalized. Contact an administrator to make changes.", 403);
                        } else {
                            $logStmt = $pdo->prepare("
                                INSERT INTO grade_edit_log (enrollment_id, criteria_id, edited_by, old_marks, new_marks, edit_reason, override_approved_by)
                                VALUES (?, ?, ?, ?, ?, 'Admin override', ?)
                            ");
                            $logStmt->execute([$info['enrollment_id'], $info['criteria_id'], $user['user_id'], $info['marks_obtained'], $marks, $user['user_id']]);

                            $uStmt = $pdo->prepare("SELECT user_id FROM student_enrollments WHERE id = ?");
                            $uStmt->execute([$info['enrollment_id']]);
                            $studId = $uStmt->fetchColumn();
                            if ($studId) {
                                createNotification($pdo, $studId, 'grade_update', 'Grade Corrected', "An administrator has corrected your {$info['component_name']} grade.");
                            }
                        }
                    }

                    $stmt = $pdo->prepare("
                        UPDATE student_grades 
                        SET marks_obtained = ?, remarks = ?, graded_by = ?, graded_at = NOW()
                        WHERE id = ?
                    ");
                    $stmt->execute([$marks, $remarks, $user['user_id'], $gradeId]);

                    $getEnroll = $pdo->prepare("SELECT enrollment_id FROM student_grades WHERE id = ?");
                    $getEnroll->execute([$gradeId]);
                    $result = $getEnroll->fetch(PDO::FETCH_ASSOC);
                    if ($result)
                        $updatedEnrollments[$result['enrollment_id']] = true;
                } elseif ($enrollmentId && $criteriaId) {
                    $chkStmt = $pdo->prepare("
                        SELECT se.is_finalized, ec.component_name, sg.marks_obtained, sg.id as existing_grade_id
                        FROM student_enrollments se
                        JOIN evaluation_criteria ec ON ec.id = ?
                        LEFT JOIN student_grades sg ON sg.enrollment_id = se.id AND sg.criteria_id = ec.id
                        WHERE se.id = ?
                    ");
                    $chkStmt->execute([$criteriaId, $enrollmentId]);
                    $chkInfo = $chkStmt->fetch(PDO::FETCH_ASSOC);

                    if ($chkInfo && $chkInfo['is_finalized']) {
                        if ($user['role'] !== 'admin') {
                            $pdo->rollBack();
                            sendError("This subject has been finalized. Contact an administrator to make changes.", 403);
                        } else {
                            if ($chkInfo['existing_grade_id']) {
                                $logStmt = $pdo->prepare("
                                    INSERT INTO grade_edit_log (enrollment_id, criteria_id, edited_by, old_marks, new_marks, edit_reason, override_approved_by)
                                    VALUES (?, ?, ?, ?, ?, 'Admin override', ?)
                                ");
                                $logStmt->execute([$enrollmentId, $criteriaId, $user['user_id'], $chkInfo['marks_obtained'], $marks, $user['user_id']]);
                            }

                            $uStmt = $pdo->prepare("SELECT user_id FROM student_enrollments WHERE id = ?");
                            $uStmt->execute([$enrollmentId]);
                            $studId = $uStmt->fetchColumn();
                            if ($studId) {
                                createNotification($pdo, $studId, 'grade_update', 'Grade Corrected', "An administrator has corrected your {$chkInfo['component_name']} grade.");
                            }
                        }
                    }

                    $stmt = $pdo->prepare("
                        INSERT INTO student_grades (enrollment_id, criteria_id, marks_obtained, remarks, graded_by, graded_at)
                        VALUES (?, ?, ?, ?, ?, NOW())
                        ON DUPLICATE KEY UPDATE marks_obtained = ?, remarks = ?, graded_by = ?, graded_at = NOW()
                    ");
                    $stmt->execute([
                        $enrollmentId,
                        $criteriaId,
                        $marks,
                        $remarks,
                        $user['user_id'],
                        $marks,
                        $remarks,
                        $user['user_id']
                    ]);
                    $updatedEnrollments[$enrollmentId] = true;
                }
            }
        } else {
            // Single grade update
            $marks = $data['marks_obtained'] ?? null;
            if ($marks !== null && $marks !== '') {
                if (!is_numeric($marks))
                    sendError('Invalid marks value', 400);
                if ((float) $marks < 0)
                    sendError('Marks cannot be negative', 400);

                $stmtMax = $pdo->prepare("
                    SELECT ec.max_marks FROM student_grades sg
                    JOIN evaluation_criteria ec ON sg.criteria_id = ec.id
                    WHERE sg.id = ?
                ");
                $stmtMax->execute([$data['grade_id']]);
                $maxMarks = $stmtMax->fetchColumn();
                if ($maxMarks !== false && (float) $marks > (float) $maxMarks) {
                    sendError("Marks exceed max for this criteria", 400);
                }
            }

            $infoStmt = $pdo->prepare("
                SELECT sg.marks_obtained, sg.enrollment_id, sg.criteria_id, se.is_finalized, ec.component_name
                FROM student_grades sg
                JOIN student_enrollments se ON sg.enrollment_id = se.id
                JOIN evaluation_criteria ec ON sg.criteria_id = ec.id
                WHERE sg.id = ?
            ");
            $infoStmt->execute([$data['grade_id']]);
            $info = $infoStmt->fetch(PDO::FETCH_ASSOC);

            if ($info && $info['is_finalized']) {
                if ($user['role'] !== 'admin') {
                    $pdo->rollBack();
                    sendError("This subject has been finalized. Contact an administrator to make changes.", 403);
                } else {
                    $logStmt = $pdo->prepare("
                        INSERT INTO grade_edit_log (enrollment_id, criteria_id, edited_by, old_marks, new_marks, edit_reason, override_approved_by)
                        VALUES (?, ?, ?, ?, ?, 'Admin override', ?)
                    ");
                    $logStmt->execute([$info['enrollment_id'], $info['criteria_id'], $user['user_id'], $info['marks_obtained'], $marks, $user['user_id']]);

                    $uStmt = $pdo->prepare("SELECT user_id FROM student_enrollments WHERE id = ?");
                    $uStmt->execute([$info['enrollment_id']]);
                    $studId = $uStmt->fetchColumn();
                    if ($studId) {
                        createNotification($pdo, $studId, 'grade_update', 'Grade Corrected', "An administrator has corrected your {$info['component_name']} grade.");
                    }
                }
            }

            $stmt = $pdo->prepare("
                UPDATE student_grades 
                SET marks_obtained = ?, remarks = ?, graded_by = ?, graded_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                $marks,
                $data['remarks'] ?? null,
                $user['user_id'],
                $data['grade_id']
            ]);

            $getEnrollment = $pdo->prepare("SELECT enrollment_id FROM student_grades WHERE id = ?");
            $getEnrollment->execute([$data['grade_id']]);
            $enrollment = $getEnrollment->fetch(PDO::FETCH_ASSOC);
            if ($enrollment) {
                $updatedEnrollments[$enrollment['enrollment_id']] = true;

                $uStmt = $pdo->prepare("SELECT user_id, u.full_name, s.name as subject_name FROM student_enrollments se JOIN users u ON se.user_id = u.id JOIN subjects s ON se.subject_id = s.id WHERE se.id = ?");
                $uStmt->execute([$enrollment['enrollment_id']]);
                $studentInfo = $uStmt->fetch(PDO::FETCH_ASSOC);
                if ($studentInfo) {
                    // Muted per-grade notification in favor of tier changes
                }
            }
        }

        // Update final percentage
        $affectedUsers = [];
        foreach (array_keys($updatedEnrollments) as $enrollmentId) {
            updateFinalPercentage($pdo, $enrollmentId);

            $uStmt = $pdo->prepare("SELECT user_id FROM student_enrollments WHERE id = ?");
            $uStmt->execute([$enrollmentId]);
            $uid = $uStmt->fetchColumn();
            if ($uid)
                $affectedUsers[$uid] = true;
        }

        foreach (array_keys($affectedUsers) as $userId) {
            syncStudentAnalytics($pdo, $userId);
            Cache::forget("gpa_history_{$userId}");
            Cache::forget("degree_audit_{$userId}");
            Cache::forgetPattern("dashboard_summary_{$userId}");
        }

        $pdo->commit();
        sendResponse(['message' => 'Grades updated successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/**
 * POST - Bulk grade entry via JSON (Admin only)
 */
function handlePost($pdo)
{
    $user = requireRole('admin');
    $data = getJsonInput();

    if (empty($data['subject_id']) || empty($data['component_name']) || empty($data['students'])) {
        sendError('subject_id, component_name, and students array are required', 400);
    }

    $sumStmt = $pdo->prepare("SELECT SUM(weight_percentage) FROM evaluation_criteria WHERE subject_id = ?");
    $sumStmt->execute([$data['subject_id']]);
    $sum = $sumStmt->fetchColumn();
    if (abs((float) $sum - 100.0) > 0.01) {
        sendError('Grade criteria weights do not sum to 100% for this subject.', 400);
    }

    $pdo->beginTransaction();
    try {
        $criteriaStmt = $pdo->prepare("
            SELECT id FROM evaluation_criteria WHERE subject_id = ? AND component_name = ?
        ");
        $criteriaStmt->execute([$data['subject_id'], $data['component_name']]);
        $criteria = $criteriaStmt->fetch(PDO::FETCH_ASSOC);

        if (!$criteria)
            throw new Exception("Evaluation criteria not found");

        $updateCount = 0;
        foreach ($data['students'] as $student) {
            $enrollStmt = $pdo->prepare("SELECT id FROM student_enrollments WHERE user_id = ? AND subject_id = ?");
            $enrollStmt->execute([$student['user_id'], $data['subject_id']]);
            $enrollment = $enrollStmt->fetch(PDO::FETCH_ASSOC);

            if ($enrollment) {
                $gradeStmt = $pdo->prepare("
                    INSERT INTO student_grades (enrollment_id, criteria_id, marks_obtained, graded_by, graded_at)
                    VALUES (?, ?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE marks_obtained = VALUES(marks_obtained), graded_by = VALUES(graded_by), graded_at = NOW()
                ");
                $gradeStmt->execute([
                    $enrollment['id'],
                    $criteria['id'],
                    $student['marks'],
                    $user['user_id']
                ]);

                updateFinalPercentage($pdo, $enrollment['id']);
                $updateCount++;

                // Muted per-grade notification in favor of tier changes
            }
        }

        $affectedUsers = array_column($data['students'], 'user_id');
        foreach (array_unique($affectedUsers) as $userId) {
            syncStudentAnalytics($pdo, $userId);
            Cache::forget("gpa_history_{$userId}");
            Cache::forget("degree_audit_{$userId}");
            Cache::forgetPattern("dashboard_summary_{$userId}");
        }

        $pdo->commit();
        sendResponse(['message' => "Grades updated for $updateCount students"]);
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/**
 * Helper: Update final percentage for an enrollment
 */
function updateFinalPercentage($pdo, $enrollmentId)
{
    $stmt = $pdo->prepare("
        SELECT 
            ec.weight_percentage,
            ec.max_marks,
            sg.marks_obtained,
            (sg.marks_obtained / ec.max_marks) * ec.weight_percentage AS weighted_score
        FROM student_grades sg
        JOIN evaluation_criteria ec ON sg.criteria_id = ec.id
        WHERE sg.enrollment_id = ?
          AND sg.marks_obtained IS NOT NULL
    ");
    $stmt->execute([$enrollmentId]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $percentage = null;
    $grade = null;

    if (!empty($results)) {
        $totalWeight = 0;
        foreach ($results as $row) {
            $totalWeight += $row['weighted_score'];
        }
        $percentage = round($totalWeight, 2);
        $percentage = clampPercentage($percentage);
        $grade = calculateGrade($percentage);
    }

    $updateStmt = $pdo->prepare("
        UPDATE student_enrollments 
        SET final_percentage = ?, final_grade = ?
        WHERE id = ?
    ");
    $updateStmt->execute([$percentage, $grade, $enrollmentId]);
}

/**
 * Helper: Calculate letter grade
 */
function calculateGrade($percentage)
{
    if ($percentage === null)
        return null;
    if ($percentage >= 90)
        return 'A+';
    if ($percentage >= 80)
        return 'A';
    if ($percentage >= 70)
        return 'B+';
    if ($percentage >= 60)
        return 'B';
    if ($percentage >= 50)
        return 'C';
    if ($percentage >= 40)
        return 'D';
    return 'F';
}

/**
 * Helper: Sync student analytics table
 */
function syncStudentAnalytics($pdo, $userId)
{
    $stmt = $pdo->prepare("
        SELECT se.final_percentage, s.credits, s.semester
        FROM student_enrollments se
        JOIN subjects s ON se.subject_id = s.id
        WHERE se.user_id = ? AND se.status = 'active'
    ");
    $stmt->execute([$userId]);
    $enrollments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $cumGpaPoints = 0;
    $cumCredits = 0;
    $semGpaPoints = [];
    $semCredits = [];

    foreach ($enrollments as $e) {
        $pct = $e['final_percentage'];
        $sem = $e['semester'];

        if (!isset($semGpaPoints[$sem])) {
            $semGpaPoints[$sem] = 0;
            $semCredits[$sem] = 0;
        }

        if ($pct !== null) {
            $pts = 0;
            if ($pct >= 90)
                $pts = 4.0;
            elseif ($pct >= 80)
                $pts = 4.0;
            elseif ($pct >= 70)
                $pts = 3.5;
            elseif ($pct >= 60)
                $pts = 3.0;
            elseif ($pct >= 50)
                $pts = 2.0;
            elseif ($pct >= 40)
                $pts = 1.0;
            else
                $pts = 0.0;

            $cr = $e['credits'] ? (int) $e['credits'] : 3;

            $cumGpaPoints += $pts * $cr;
            $cumCredits += $cr;

            $semGpaPoints[$sem] += $pts * $cr;
            $semCredits[$sem] += $cr;
        }
    }

    $cumGpa = $cumCredits > 0 ? round($cumGpaPoints / $cumCredits, 2) : 0;
    $tier = 'average';
    if ($cumGpa >= 3.5)
        $tier = 'excellent';
    elseif ($cumGpa >= 3.0)
        $tier = 'good';
    elseif ($cumGpa < 2.0 && $cumCredits > 0)
        $tier = 'at_risk';
    elseif ($cumGpa < 2.5 && $cumCredits > 0)
        $tier = 'below_average';

    $uStmt = $pdo->prepare("SELECT current_semester FROM users WHERE id = ?");
    $uStmt->execute([$userId]);
    $currSem = $uStmt->fetchColumn() ?: 1;

    $semGpa = ($semCredits[$currSem] ?? 0) > 0 ? round($semGpaPoints[$currSem] / $semCredits[$currSem], 2) : 0;

    // Fetch old tier
    $getOldTier = $pdo->prepare("SELECT performance_tier FROM student_analytics WHERE student_id = ? AND semester = ?");
    $getOldTier->execute([$userId, $currSem]);
    $oldTier = $getOldTier->fetchColumn();

    $upd = $pdo->prepare("
        INSERT INTO student_analytics 
        (student_id, semester, current_gpa, semester_gpa, cumulative_gpa, performance_tier, calculated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
        current_gpa = VALUES(current_gpa),
        semester_gpa = VALUES(semester_gpa),
        cumulative_gpa = VALUES(cumulative_gpa),
        performance_tier = VALUES(performance_tier),
        calculated_at = NOW()
    ");
    $upd->execute([$userId, $currSem, $cumGpa, $semGpa, $cumGpa, $tier]);

    // Notify if tier changed
    if ($oldTier && $oldTier !== $tier) {
        if ($tier === 'at_risk') {
            createNotification($pdo, $userId, 'risk_alert', 'Performance Warning', "Your performance has dropped and you are now classified as At-Risk. Please reach out to an advisor.", null);
        } elseif ($tier === 'excellent' && $oldTier !== 'excellent') {
            createNotification($pdo, $userId, 'achievement', 'Great Job!', "Your performance tier has improved to Excellent!", null);
        }
    }
}
