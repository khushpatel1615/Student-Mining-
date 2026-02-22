<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';
require_once __DIR__ . '/../includes/api_helpers.php';
require_once __DIR__ . '/../includes/notifications.php';

// We need grades.php functions to update percentages
require_once __DIR__ . '/grades.php';

error_reporting(E_ALL);
ini_set('display_errors', 0);
handleCORS();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

try {
    if ($method === 'OPTIONS')
        exit(0);
    if ($method !== 'POST')
        sendError('Method not allowed', 405);

    $user = requireAuth();
    if ($user['role'] !== 'admin' && $user['role'] !== 'teacher') {
        sendError('Unauthorized', 403);
    }

    $data = getJsonInput();
    $action = $data['action'] ?? null;

    if ($action === 'validate_csv') {
        $subjectId = $data['subject_id'] ?? null;
        $csvBase64 = $data['csv_data'] ?? null;

        if (!$subjectId || !$csvBase64) {
            sendError('subject_id and csv_data are required', 400);
        }

        $csvString = base64_decode($csvBase64);
        if ($csvString === false) {
            sendError('Invalid base64 encoding', 400);
        }

        $lines = explode("\n", str_replace("\r", "", trim($csvString)));
        if (count($lines) < 2) {
            sendError('CSV must contain a header row and at least one data row', 400);
        }

        $header = str_getcsv(array_shift($lines));
        $header = array_map('trim', $header);

        if (strtolower($header[0]) !== 'student_id') {
            sendError('First column must be student_id', 400);
        }

        // Fetch criteria for this subject
        $critStmt = $pdo->prepare("SELECT id, component_name, max_marks FROM evaluation_criteria WHERE subject_id = ?");
        $critStmt->execute([$subjectId]);
        $criteriaRows = $critStmt->fetchAll(PDO::FETCH_ASSOC);

        $criteriaMap = []; // component_name (lowercase) => [id, max_marks]
        foreach ($criteriaRows as $c) {
            $criteriaMap[strtolower($c['component_name'])] = $c;
        }

        // Map CSV headers to criteria
        $colCritMap = []; // colIndex => criteria details
        for ($i = 1; $i < count($header); $i++) {
            $colName = strtolower($header[$i]);
            if (isset($criteriaMap[$colName])) {
                $colCritMap[$i] = $criteriaMap[$colName];
            }
        }

        if (empty($colCritMap)) {
            sendError('No matching criteria columns found in CSV. Headers must match component names.', 400);
        }

        $report = [
            'subject_id' => $subjectId,
            'total_rows' => count($lines),
            'valid_rows' => 0,
            'error_rows' => 0,
            'rows' => []
        ];

        // Cache queries
        $userStmt = $pdo->prepare("SELECT id, full_name FROM users WHERE student_id = ? AND role = 'student'");
        $enrollStmt = $pdo->prepare("SELECT id, is_finalized FROM student_enrollments WHERE user_id = ? AND subject_id = ? AND status = 'active'");

        $rowIdx = 1;

        foreach ($lines as $lineStr) {
            $rowIdx++;
            if (empty(trim($lineStr)))
                continue;

            $row = str_getcsv($lineStr);
            $row = array_map('trim', $row);

            $studentIdCode = $row[0] ?? '';

            $rowData = [
                'row' => $rowIdx,
                'student_id' => $studentIdCode,
                'student_name' => 'Unknown',
                'status' => 'valid',
                'grades' => [],
                'errors' => []
            ];

            $userId = null;
            $enrollmentId = null;

            // 1. check user
            $userStmt->execute([$studentIdCode]);
            $u = $userStmt->fetch(PDO::FETCH_ASSOC);

            if (!$u) {
                $rowData['errors'][] = "Student ID not found in system";
                $rowData['status'] = 'error';
            } else {
                $userId = $u['id'];
                $rowData['student_name'] = $u['full_name'];

                // 2. check enrollment
                $enrollStmt->execute([$userId, $subjectId]);
                $enroll = $enrollStmt->fetch(PDO::FETCH_ASSOC);

                if (!$enroll) {
                    $rowData['errors'][] = "Student is not actively enrolled in this subject";
                    $rowData['status'] = 'error';
                } else if ($enroll['is_finalized']) {
                    $rowData['errors'][] = "Subject is already finalized for this student";
                    $rowData['status'] = 'error';
                } else {
                    $enrollmentId = $enroll['id'];
                    $rowData['db_enrollment_id'] = $enrollmentId;
                }
            }

            // 3. check grades
            foreach ($colCritMap as $colIdx => $cDetails) {
                $compName = $header[$colIdx];
                $val = $row[$colIdx] ?? '';

                if ($val === '') {
                    $rowData['grades'][$compName] = null;
                    continue; // Skip empty
                }

                if (!is_numeric($val)) {
                    $rowData['errors'][] = "{$compName}: '{$val}' is not numeric";
                    $rowData['status'] = 'error';
                    $rowData['grades'][$compName] = $val;
                    continue;
                }

                $nVal = (float) $val;
                $rowData['grades'][$compName] = $nVal;

                if ($nVal < 0) {
                    $rowData['errors'][] = "{$compName}: cannot be negative";
                    $rowData['status'] = 'error';
                } else if ($nVal > $cDetails['max_marks']) {
                    $rowData['errors'][] = "{$compName}: {$nVal} exceeds max marks of {$cDetails['max_marks']}";
                    $rowData['status'] = 'error';
                }
            }

            if (empty($rowData['grades'])) {
                $rowData['errors'][] = "No grade values provided";
                $rowData['status'] = 'error';
            }

            if ($rowData['status'] === 'valid') {
                $report['valid_rows']++;
            } else {
                $report['error_rows']++;
            }

            $report['rows'][] = $rowData;
        }

        // Save job
        $pdo->beginTransaction();
        try {
            $jobStmt = $pdo->prepare("
                INSERT INTO grade_import_jobs (subject_id, imported_by, status, total_rows, valid_rows, error_rows, validation_report)
                VALUES (?, ?, 'validated', ?, ?, ?, ?)
            ");
            $jobStmt->execute([
                $subjectId,
                $user['user_id'],
                $report['total_rows'],
                $report['valid_rows'],
                $report['error_rows'],
                json_encode($report)
            ]);
            $jobId = $pdo->lastInsertId();
            $pdo->commit();

            $report['import_job_id'] = (int) $jobId;
            sendResponse($report);
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }

    } elseif ($action === 'apply_import') {
        $jobId = $data['import_job_id'] ?? null;
        if (!$jobId) {
            sendError('import_job_id is required', 400);
        }

        $jobStmt = $pdo->prepare("SELECT * FROM grade_import_jobs WHERE id = ?");
        $jobStmt->execute([$jobId]);
        $job = $jobStmt->fetch(PDO::FETCH_ASSOC);

        if (!$job)
            sendError("Job not found", 404);
        if ($job['status'] !== 'validated')
            sendError("Job is not in validated state", 400);

        $report = json_decode($job['validation_report'], true);
        $subjectId = $job['subject_id'];

        $critStmt = $pdo->prepare("SELECT id, component_name FROM evaluation_criteria WHERE subject_id = ?");
        $critStmt->execute([$subjectId]);
        $criteriaRows = $critStmt->fetchAll(PDO::FETCH_ASSOC);

        $criteriaMap = [];
        foreach ($criteriaRows as $c) {
            $criteriaMap[strtolower($c['component_name'])] = $c['id'];
        }

        $pdo->beginTransaction();
        try {
            $insertGradeStmt = $pdo->prepare("
                INSERT INTO student_grades (enrollment_id, criteria_id, marks_obtained, graded_by, graded_at)
                VALUES (?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE marks_obtained = VALUES(marks_obtained), graded_by = VALUES(graded_by), graded_at = NOW()
            ");

            $appliedCount = 0;
            $updatedEnrollments = [];

            foreach ($report['rows'] as $row) {
                if ($row['status'] === 'valid' && isset($row['db_enrollment_id'])) {
                    $enrollId = $row['db_enrollment_id'];

                    foreach ($row['grades'] as $compName => $val) {
                        if ($val === null)
                            continue; // Skip empty

                        $cId = $criteriaMap[strtolower($compName)] ?? null;
                        if ($cId) {
                            $insertGradeStmt->execute([$enrollId, $cId, $val, $user['user_id']]);
                        }
                    }

                    $updatedEnrollments[] = $enrollId;
                    $appliedCount++;
                }
            }

            // Update percentage and analytics
            foreach (array_unique($updatedEnrollments) as $eid) {
                // Must call updateFinalPercentage logic
                updateFinalPercentage($pdo, $eid);

                $uStmt = $pdo->prepare("SELECT user_id FROM student_enrollments WHERE id = ?");
                $uStmt->execute([$eid]);
                $uid = $uStmt->fetchColumn();
                if ($uid) {
                    syncStudentAnalytics($pdo, $uid);
                }
            }

            // Update job status
            $updJob = $pdo->prepare("UPDATE grade_import_jobs SET status = 'applied', applied_at = NOW() WHERE id = ?");
            $updJob->execute([$jobId]);

            // Queue notification for teacher
            $subStmt = $pdo->prepare("SELECT name FROM subjects WHERE id = ?");
            $subStmt->execute([$subjectId]);
            $subjectName = $subStmt->fetchColumn();

            queueEmail($pdo, $user['user_id'], 'import_complete', [
                'subject_name' => $subjectName,
                'applied' => $appliedCount,
                'skipped' => $report['error_rows']
            ]);

            $pdo->commit();

            sendResponse([
                'applied' => $appliedCount,
                'skipped' => $report['error_rows'],
                'subject_name' => $subjectName,
                'message' => "Successfully applied {$appliedCount} row(s)."
            ]);

        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }

    } else {
        sendError('Invalid action', 400);
    }

} catch (Exception $e) {
    error_log("Import API Error: " . $e->getMessage());
    sendError('Internal Server Error', 500, $e->getMessage());
}
