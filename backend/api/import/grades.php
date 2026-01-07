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

            // Check if grade exists
            $stmt = $pdo->prepare("SELECT id, grade FROM grades 
                                   WHERE student_id = ? AND subject_id = ? AND assessment_type = ?");
            $stmt->execute([$studentDbId, $subjectId, $assessmentType]);
            $existingGrade = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($existingGrade) {
                // Update existing grade
                $stmt = $pdo->prepare("UPDATE grades 
                                       SET grade = ?, updated_at = NOW() 
                                       WHERE id = ?");
                $stmt->execute([$grade, $existingGrade['id']]);

                // Log to grade history
                $stmt = $pdo->prepare("INSERT INTO grade_history 
                                       (grade_id, student_id, subject_id, old_grade, new_grade, changed_by, change_reason)
                                       VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $existingGrade['id'],
                    $studentDbId,
                    $subjectId,
                    $existingGrade['grade'],
                    $grade,
                    $user['id'],
                    'Bulk import update'
                ]);
            } else {
                // Insert new grade
                $stmt = $pdo->prepare("INSERT INTO grades 
                                       (student_id, subject_id, grade, assessment_type, created_at)
                                       VALUES (?, ?, ?, ?, NOW())");
                $stmt->execute([$studentDbId, $subjectId, $grade, $assessmentType]);
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
        $user['id']
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
?>