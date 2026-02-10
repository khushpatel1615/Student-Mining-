<?php

/**
 * Student Grades API
 * Handles grade management for enrolled subjects
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';
require_once __DIR__ . '/../includes/notifications.php';
setCORSHeaders();
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
        default:
                                                                                                                                                                                                                                                                                                                                                  http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

/**
 * Clamp percentage to 0-100 range
 */
function clampPercentage($value)
{
    if ($value === null) {
        return null;
    }
    $val = (float) $value;
    if ($val < 0) {
        return 0;
    }
    if ($val > 100) {
        return 100;
    }
    return $val;
}

/**
 * GET - Get grades for student/enrollment/subject
 */
function handleGet($pdo)
{
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $userId = $_GET['user_id'] ?? null;
    $enrollmentId = $_GET['enrollment_id'] ?? null;
    $subjectId = $_GET['subject_id'] ?? null;
    $programId = $_GET['program_id'] ?? null;
    $semester = $_GET['semester'] ?? null;
// If not admin, can only view own grades
    if ($user['role'] !== 'admin' && $userId && $userId != $user['user_id']) {
        http_response_code(403);
        echo json_encode(['error' => 'Access denied']);
        return;
    }

    // Case 1a: Fetch all students across all subjects for a program/semester (Admin grading view - All Subjects)
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
            echo json_encode([
                'success' => true,
                'data' => [
                    'criteria' => [],
                    'enrollments' => []
                ]
            ]);
            return;
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
                se.id,
                se.user_id,
                se.subject_id,
                se.status,
                se.final_percentage,
                se.final_grade,
                u.full_name as student_name,
                u.student_id,
                u.email,
                s.name as subject_name,
                s.code as subject_code
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
                if (empty($chunk)) {
                    continue;
                }

                $p = str_repeat('?,', count($chunk) - 1) . '?';
                $chunkStmt = $pdo->prepare("
                    SELECT 
                        sg.id as grade_id,
                        sg.criteria_id,
                        sg.marks_obtained,
                        sg.remarks,
                        sg.enrollment_id
                    FROM student_grades sg
                    WHERE sg.enrollment_id IN ($p)
                ");
                $chunkStmt->execute($chunk);
                $chunkGrades = $chunkStmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($chunkGrades as $g) {
                    $eid = $g['enrollment_id'];
                    unset($g['enrollment_id']);
                    // Cleanup
                                    $gradesGrouped[$eid][] = $g;
                }
            }

            // Attach to enrollments
            foreach ($enrollments as &$e) {
                $e['grades'] = $gradesGrouped[$e['id']] ?? [];
            }
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'criteria' => $criteria,
                'enrollments' => $enrollments,
                'subjects' => $subjects
            ]
        ]);
        return;
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
// Get all enrollments for this subject with student info
        $enrollStmt = $pdo->prepare("
            SELECT 
                se.id,
                se.user_id,
                se.status,
                se.final_percentage,
                se.final_grade,
                u.full_name as student_name,
                u.student_id,
                u.email
            FROM student_enrollments se
            JOIN users u ON se.user_id = u.id
            WHERE se.subject_id = ? AND se.status = 'active'
            ORDER BY u.full_name ASC
        ");
        $enrollStmt->execute([$subjectId]);
        $enrollments = $enrollStmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($enrollments as &$enrollment) {
            if (isset($enrollment['final_percentage'])) {
                $enrollment['final_percentage'] = clampPercentage($enrollment['final_percentage']);
            }
        }
// If no criteria exist for this subject, create default ones
        if (empty($criteria)) {
// Get subject info to determine criteria type
            $subjectInfoStmt = $pdo->prepare("SELECT name, subject_type FROM subjects WHERE id = ?");
            $subjectInfoStmt->execute([$subjectId]);
            $subjectInfo = $subjectInfoStmt->fetch(PDO::FETCH_ASSOC);
            if ($subjectInfo) {
            // Default criteria based on subject type
                if (
                    $subjectInfo['subject_type'] === 'Core' ||
                    strpos($subjectInfo['name'], 'Programming') !== false ||
                    strpos($subjectInfo['name'], 'Lab') !== false
                ) {
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

                // Insert default criteria
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
                    sg.id as grade_id,
                    sg.criteria_id,
                    sg.marks_obtained,
                    sg.remarks
                FROM student_grades sg
                WHERE sg.enrollment_id = ?
            ");
            $gradeStmt->execute([$enrollment['id']]);
            $enrollment['grades'] = $gradeStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'criteria' => $criteria,
                'enrollments' => $enrollments
            ]
        ]);
        return;
    }

    // Case 2: Get grades for specific enrollment
    if ($enrollmentId) {
        $stmt = $pdo->prepare("
            SELECT 
                sg.id,
                sg.marks_obtained,
                sg.remarks,
                sg.graded_at,
                ec.id as criteria_id,
                ec.component_name,
                ec.weight_percentage,
                ec.max_marks,
                s.name as subject_name,
                s.code as subject_code
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
        echo json_encode([
            'success' => true,
            'data' => [
                'grades' => $grades,
                'summary' => [
                    'total_obtained' => $totalObtained,
                    'total_max' => $totalMax,
                    'percentage' => $percentage
                ]
            ]
        ]);
        return;
    }

    // Case 3: Get all grades for a user, grouped by subject
    $targetUserId = $userId ?? $user['user_id'];
// Get only the latest enrollment for each subject (handles retakes/multiple enrollments)
    $sql = "
        SELECT 
            se.id as enrollment_id,
            s.id as subject_id,
            s.name as subject_name,
            s.code as subject_code,
            s.semester,
            s.credits,
            se.status,
            se.final_percentage,
            se.final_grade
        FROM student_enrollments se
        JOIN subjects s ON se.subject_id = s.id
        WHERE se.user_id = ?
        AND se.id IN (
            SELECT MAX(se2.id)
            FROM student_enrollments se2
            WHERE se2.user_id = se.user_id
            AND se2.subject_id = se.subject_id
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
// Manual grade fetching for MariaDB compatibility (replacing JSON_ARRAYAGG)
    if (!empty($results)) {
        $enrollmentIds = array_column($results, 'enrollment_id');
        if (!empty($enrollmentIds)) {
            $placeholders = str_repeat('?,', count($enrollmentIds) - 1) . '?';
            $gradesSql = "
                SELECT 
                    sg.enrollment_id,
                    sg.id,
                    sg.marks_obtained,
                    ec.component_name,
                    ec.max_marks,
                    ec.weight_percentage
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

    echo json_encode(['success' => true, 'data' => $results]);
}

/**
 * PUT - Update grades (Admin only)
 * Supports both grade_id and enrollment_id+criteria_id formats
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
    if (empty($data['grade_id']) && empty($data['grades'])) {
        http_response_code(400);
        echo json_encode(['error' => 'grade_id or grades array is required']);
        return;
    }

    // Validate marks against criteria max_marks
    if (!empty($data['grades']) && is_array($data['grades'])) {
        $criteriaIds = [];
        foreach ($data['grades'] as $grade) {
            if (isset($grade['criteria_id'])) {
                $criteriaIds[] = (int) $grade['criteria_id'];
            }
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
            if ($marks === null || $marks === '') {
                continue;
            }
            if (!is_numeric($marks)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid marks value']);
                return;
            }
            if ((float) $marks < 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Marks cannot be negative']);
                return;
            }
            if ($criteriaId && isset($criteriaMax[(int) $criteriaId]) && (float) $marks > $criteriaMax[(int) $criteriaId]) {
                http_response_code(400);
                echo json_encode(['error' => "Marks exceed max for criteria {$criteriaId}"]);
                return;
            }
        }
    }

    $pdo->beginTransaction();
    $updatedEnrollments = [];
    try {
    // Bulk update multiple grades
        if (!empty($data['grades']) && is_array($data['grades'])) {
            foreach ($data['grades'] as $grade) {
                $enrollmentId = $grade['enrollment_id'] ?? null;
                $criteriaId = $grade['criteria_id'] ?? null;
                $gradeId = $grade['grade_id'] ?? null;
                $marks = $grade['marks_obtained'];
                $remarks = $grade['remarks'] ?? null;
                if ($gradeId) {
        // Update by grade_id
                    $stmt = $pdo->prepare("
                        UPDATE student_grades 
                        SET marks_obtained = ?, remarks = ?, graded_by = ?, graded_at = NOW()
                        WHERE id = ?
                    ");
                    $stmt->execute([$marks, $remarks, $user['user_id'], $gradeId]);
        // Get enrollment_id for final percentage update
                        $getEnroll = $pdo->prepare("SELECT enrollment_id FROM student_grades WHERE id = ?");
                    $getEnroll->execute([$gradeId]);
                    $result = $getEnroll->fetch(PDO::FETCH_ASSOC);
                    if ($result) {
                                    $updatedEnrollments[$result['enrollment_id']] = true;
                    }
                } elseif ($enrollmentId && $criteriaId) {
    // Insert or update by enrollment_id + criteria_id
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
            // Validate marks against criteria max_marks
            if (isset($data['marks_obtained']) && $data['marks_obtained'] !== null && $data['marks_obtained'] !== '') {
                if (!is_numeric($data['marks_obtained'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Invalid marks value']);
                    return;
                }
                if ((float) $data['marks_obtained'] < 0) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Marks cannot be negative']);
                    return;
                }
                $stmtMax = $pdo->prepare("
                    SELECT ec.max_marks
                    FROM student_grades sg
                    JOIN evaluation_criteria ec ON sg.criteria_id = ec.id
                    WHERE sg.id = ?
                ");
                $stmtMax->execute([$data['grade_id']]);
                $maxMarks = $stmtMax->fetchColumn();
                if ($maxMarks !== false && (float) $data['marks_obtained'] > (float) $maxMarks) {
                    http_response_code(400);
                    echo json_encode(['error' => "Marks exceed max for this criteria"]);
                    return;
                }
            }

            $stmt = $pdo->prepare("
                UPDATE student_grades 
                SET marks_obtained = ?, remarks = ?, graded_by = ?, graded_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                $data['marks_obtained'],
                $data['remarks'] ?? null,
                $user['user_id'],
                $data['grade_id']
            ]);
        // Get enrollment_id and update final percentage
            $getEnrollment = $pdo->prepare("SELECT enrollment_id FROM student_grades WHERE id = ?");
            $getEnrollment->execute([$data['grade_id']]);
            $enrollment = $getEnrollment->fetch(PDO::FETCH_ASSOC);
            if ($enrollment) {
                $updatedEnrollments[$enrollment['enrollment_id']] = true;
                // Get user_id for notification
                $uStmt = $pdo->prepare("SELECT user_id, u.full_name, s.name as subject_name FROM student_enrollments se JOIN users u ON se.user_id = u.id JOIN subjects s ON se.subject_id = s.id WHERE se.id = ?");
                $uStmt->execute([$enrollment['enrollment_id']]);
                $studentInfo = $uStmt->fetch(PDO::FETCH_ASSOC);
                if ($studentInfo) {
                    createNotification($pdo, $studentInfo['user_id'], 'grade_update', 'Grade Updated', "Your grade for {$studentInfo['subject_name']} has been updated.", $enrollment['enrollment_id']);
                }
            }
        }

        // Update final percentage for all affected enrollments
        foreach (array_keys($updatedEnrollments) as $enrollmentId) {
            updateFinalPercentage($pdo, $enrollmentId);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Grades updated successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/**
 * POST - Bulk grade entry for a subject (Admin only)
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
// Expected format: { subject_id: X, component_name: 'Mid-Term Exam', students: [{user_id, marks}] }
    if (empty($data['subject_id']) || empty($data['component_name']) || empty($data['students'])) {
        http_response_code(400);
        echo json_encode(['error' => 'subject_id, component_name, and students array are required']);
        return;
    }

    $pdo->beginTransaction();
    try {
    // Get criteria ID
        $criteriaStmt = $pdo->prepare("
            SELECT id FROM evaluation_criteria 
            WHERE subject_id = ? AND component_name = ?
        ");
        $criteriaStmt->execute([$data['subject_id'], $data['component_name']]);
        $criteria = $criteriaStmt->fetch(PDO::FETCH_ASSOC);
        if (!$criteria) {
            throw new Exception("Evaluation criteria not found");
        }

        $updateCount = 0;
        foreach ($data['students'] as $student) {
        // Get enrollment ID for this student/subject
            $enrollStmt = $pdo->prepare("
                SELECT id FROM student_enrollments 
                WHERE user_id = ? AND subject_id = ?
            ");
            $enrollStmt->execute([$student['user_id'], $data['subject_id']]);
            $enrollment = $enrollStmt->fetch(PDO::FETCH_ASSOC);
            if ($enrollment) {
                    // Update or insert grade
                            $gradeStmt = $pdo->prepare("
                    INSERT INTO student_grades (enrollment_id, criteria_id, marks_obtained, graded_by, graded_at)
                    VALUES (?, ?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE marks_obtained = ?, graded_by = ?, graded_at = NOW()
                ");
                    $gradeStmt->execute([
                                $enrollment['id'],
                                $criteria['id'],
                                $student['marks'],
                                $user['sub'],
                                $student['marks'],
                                $user['sub']
                            ]);
                    updateFinalPercentage($pdo, $enrollment['id']);
                    $updateCount++;
                    // Notify student
                            createNotification($pdo, $student['user_id'], 'grade_update', 'Grade Updated', "Your grade for {$data['component_name']} in subject ID {$data['subject_id']} has been updated.", $enrollment['id']);
            }
        }

        $pdo->commit();
        echo json_encode([
            'success' => true,
            'message' => "Grades updated for $updateCount students"
        ]);
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
            SUM(sg.marks_obtained) as total_obtained,
            SUM(ec.max_marks) as total_max
        FROM student_grades sg
        JOIN evaluation_criteria ec ON sg.criteria_id = ec.id
        WHERE sg.enrollment_id = ? AND sg.marks_obtained IS NOT NULL
    ");
    $stmt->execute([$enrollmentId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $percentage = null;
    $grade = null;
    if ($result['total_max'] > 0) {
        $percentage = round(($result['total_obtained'] / $result['total_max']) * 100, 2);
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
 * Helper: Calculate letter grade from percentage
 */
function calculateGrade($percentage)
{
    if ($percentage >= 90) {
        return 'A+';
    }
    if ($percentage >= 80) {
        return 'A';
    }
    if ($percentage >= 70) {
        return 'B+';
    }
    if ($percentage >= 60) {
        return 'B';
    }
    if ($percentage >= 50) {
        return 'C';
    }
    if ($percentage >= 40) {
        return 'D';
    }
    return 'F';
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
