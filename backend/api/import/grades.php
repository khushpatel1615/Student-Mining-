<?php
/**
 * Bulk Grade Import API
 * Handles CSV/Excel upload for bulk grade entry
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/jwt.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    // Verify authentication - admin only
    $token = getTokenFromHeader();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'No token provided']);
        exit;
    }

    $result = verifyToken($token);
    if (!$result['valid']) {
        http_response_code(401);
        echo json_encode(['error' => $result['error']]);
        exit;
    }

    $user = $result['payload'];
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Admin access required']);
        exit;
    }

    // Check if file was uploaded
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'No file uploaded or upload error']);
        exit;
    }

    $file = $_FILES['file'];
    $filename = $file['name'];
    $tmpPath = $file['tmp_name'];

    // Validate file extension
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    if ($ext !== 'csv') {
        http_response_code(400);
        echo json_encode(['error' => 'Only CSV files are supported']);
        exit;
    }

    $pdo = getDBConnection();

    // Parse CSV
    $handle = fopen($tmpPath, 'r');
    if (!$handle) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to read file']);
        exit;
    }

    // Read header row
    $headers = fgetcsv($handle);

    // Expected columns: student_id, subject_id OR subject_code, grade, assessment_type
    $requiredColumns = ['student_id', 'grade'];
    foreach ($requiredColumns as $col) {
        if (!in_array($col, $headers)) {
            fclose($handle);
            http_response_code(400);
            echo json_encode(['error' => "Missing required column: $col"]);
            exit;
        }
    }

    // Map column names to indexes
    $columnMap = array_flip($headers);

    $successCount = 0;
    $failCount = 0;
    $errors = [];
    $rowNumber = 1;
    $criteriaCache = [];

    // Process each row
    while (($row = fgetcsv($handle)) !== false) {
        $rowNumber++;

        try {
            // Extract data
            $studentId = $row[$columnMap['student_id']] ?? null;
            $subjectCode = $row[$columnMap['subject_code'] ?? ''] ?? null;
            $subjectId = $row[$columnMap['subject_id'] ?? ''] ?? null;
            $grade = $row[$columnMap['grade']] ?? null;
            $assessmentType = $row[$columnMap['assessment_type'] ?? ''] ?? 'final';

            // Validate required fields
            if (empty($studentId) || empty($grade)) {
                $errors[] = "Row $rowNumber: Missing student_id or grade";
                $failCount++;
                continue;
            }

            // Validate student exists
            $stmt = $pdo->prepare("SELECT id FROM users WHERE student_id = ? AND role = 'student'");
            $stmt->execute([$studentId]);
            $student = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$student) {
                $errors[] = "Row $rowNumber: Student ID '$studentId' not found";
                $failCount++;
                continue;
            }

            $studentDbId = $student['id'];

            // Get subject ID
            if (!$subjectId && $subjectCode) {
                $stmt = $pdo->prepare("SELECT id FROM subjects WHERE code = ?");
                $stmt->execute([$subjectCode]);
                $subject = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$subject) {
                    $errors[] = "Row $rowNumber: Subject code '$subjectCode' not found";
                    $failCount++;
                    continue;
                }

                $subjectId = $subject['id'];
            }

            if (!$subjectId) {
                $errors[] = "Row $rowNumber: No valid subject_id or subject_code provided";
                $failCount++;
                continue;
            }

            // Validate grade
            $grade = floatval($grade);
            if ($grade < 0 || $grade > 100) {
                $errors[] = "Row $rowNumber: Grade must be between 0 and 100";
                $failCount++;
                continue;
            }

            // Resolve enrollment
            $stmt = $pdo->prepare("
                SELECT id FROM student_enrollments 
                WHERE user_id = ? AND subject_id = ?
                ORDER BY id DESC LIMIT 1
            ");
            $stmt->execute([$studentDbId, $subjectId]);
            $enrollmentId = $stmt->fetchColumn();

            if (!$enrollmentId) {
                $errors[] = "Row $rowNumber: Enrollment not found for student/subject";
                $failCount++;
                continue;
            }

            // Cache criteria per subject
            if (!isset($criteriaCache[$subjectId])) {
                $criteriaStmt = $pdo->prepare("
                    SELECT id, component_name, max_marks 
                    FROM evaluation_criteria 
                    WHERE subject_id = ?
                ");
                $criteriaStmt->execute([$subjectId]);
                $criteriaCache[$subjectId] = $criteriaStmt->fetchAll(PDO::FETCH_ASSOC);
            }

            $criteriaList = $criteriaCache[$subjectId];
            $matchedCriteria = null;
            foreach ($criteriaList as $criteria) {
                if (strcasecmp($criteria['component_name'], $assessmentType) === 0) {
                    $matchedCriteria = $criteria;
                    break;
                }
            }

            if ($matchedCriteria) {
                // Update component-level grade
                $stmt = $pdo->prepare("
                    INSERT INTO student_grades (enrollment_id, criteria_id, marks_obtained, graded_at)
                    VALUES (?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE marks_obtained = VALUES(marks_obtained), graded_at = NOW()
                ");
                $stmt->execute([$enrollmentId, $matchedCriteria['id'], $grade]);

                // Recompute final percentage
                updateFinalPercentage($pdo, $enrollmentId);
            } else {
                // Treat as final percentage update
                $finalGrade = calculateGradeLetter($grade);
                $stmt = $pdo->prepare("
                    UPDATE student_enrollments 
                    SET final_percentage = ?, final_grade = ?
                    WHERE id = ?
                ");
                $stmt->execute([$grade, $finalGrade, $enrollmentId]);
            }

            $successCount++;

        } catch (Exception $e) {
            $errors[] = "Row $rowNumber: " . $e->getMessage();
            $failCount++;
        }
    }

    fclose($handle);

    // Log the import
    $stmt = $pdo->prepare("INSERT INTO import_logs 
                           (import_type, filename, total_rows, successful_rows, failed_rows, error_log, imported_by)
                           VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        'grades',
        $filename,
        $successCount + $failCount,
        $successCount,
        $failCount,
        json_encode($errors),
        $user['user_id']
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Import completed',
        'stats' => [
            'total_rows' => $successCount + $failCount,
            'successful' => $successCount,
            'failed' => $failCount
        ],
        'errors' => $errors
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

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

    if ($result && $result['total_max'] > 0) {
        $percentage = round(($result['total_obtained'] / $result['total_max']) * 100, 2);
        $grade = calculateGradeLetter($percentage);
    }

    $updateStmt = $pdo->prepare("
        UPDATE student_enrollments 
        SET final_percentage = ?, final_grade = ?
        WHERE id = ?
    ");
    $updateStmt->execute([$percentage, $grade, $enrollmentId]);
}

function calculateGradeLetter($percentage)
{
    if ($percentage >= 90) return 'A+';
    if ($percentage >= 80) return 'A';
    if ($percentage >= 70) return 'B+';
    if ($percentage >= 60) return 'B';
    if ($percentage >= 50) return 'C';
    if ($percentage >= 40) return 'D';
    return 'F';
}
