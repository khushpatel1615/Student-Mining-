<?php
/**
 * Backend API for Full Student Data Import
 * Processes data from import_interface.html
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

setCORSHeaders();

header('Content-Type: application/json');

// Admin only
requireRole('admin');

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    $data = $input['data'] ?? [];

    if (empty($action) || empty($data)) {
        throw new Exception('Invalid request');
    }

    $pdo = getDBConnection();

    switch ($action) {
        case 'import_students':
            $result = importStudents($pdo, $data);
            break;

        case 'import_enrollments':
            $result = importEnrollments($pdo, $data);
            break;

        case 'import_grades':
            $result = importGrades($pdo, $data);
            break;

        case 'import_attendance':
            $result = importAttendance($pdo, $data);
            break;

        default:
            throw new Exception('Unknown action');
    }

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Import students
 */
function importStudents($pdo, $students)
{
    $imported = 0;
    $errors = [];

    // Get BCA program ID
    $stmt = $pdo->query("SELECT id FROM programs WHERE code = 'BCA' LIMIT 1");
    $program = $stmt->fetch(PDO::FETCH_ASSOC);
    $programId = $program ? $program['id'] : null;

    $pdo->beginTransaction();

    try {
        foreach ($students as $student) {
            // Extract enrollment year from enrollment number
            // Format: 22291341020 or 23291341001
            $enrollmentStr = $student['enrollment'];
            $enrollmentYear = 2000 + intval(substr($enrollmentStr, 0, 2));

            // Generate unique email using enrollment number
            $email = $enrollmentStr . '@student.edu';

            // Check if student exists
            $checkStmt = $pdo->prepare("SELECT id FROM users WHERE student_id = ?");
            $checkStmt->execute([$enrollmentStr]);
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                // Update existing student
                $stmt = $pdo->prepare("
                    UPDATE users SET
                        batch = ?,
                        class = ?,
                        full_name = ?,
                        coordinator = ?,
                        mobile_primary = ?,
                        mobile_secondary = ?,
                        enrollment_year = ?,
                        current_semester = 5,
                        program_id = ?
                    WHERE student_id = ?
                ");
                $stmt->execute([
                    $student['batch'],
                    $student['class'],
                    $student['name'],
                    $student['coordinator'],
                    $student['mobile1'],
                    $student['mobile2'],
                    $enrollmentYear,
                    $programId,
                    $enrollmentStr
                ]);
            } else {
                // Insert new student
                $stmt = $pdo->prepare("
                    INSERT INTO users (
                        student_id, email, full_name, role,
                        batch, class, coordinator,
                        mobile_primary, mobile_secondary,
                        enrollment_year, current_semester, program_id,
                        password_hash, is_active
                    ) VALUES (?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, 5, ?, ?, TRUE)
                ");

                // Default password: enrollment number
                $passwordHash = password_hash($enrollmentStr, PASSWORD_BCRYPT);

                $stmt->execute([
                    $enrollmentStr,
                    $email,
                    $student['name'],
                    $student['batch'],
                    $student['class'],
                    $student['coordinator'],
                    $student['mobile1'],
                    $student['mobile2'],
                    $enrollmentYear,
                    $programId,
                    $passwordHash
                ]);
            }

            $imported++;
        }

        $pdo->commit();

        return [
            'success' => true,
            'imported' => $imported,
            'total' => count($students),
            'errors' => $errors
        ];

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/**
 * Import enrollments
 */
function importEnrollments($pdo, $enrollments)
{
    $imported = 0;
    $errors = [];

    $pdo->beginTransaction();

    try {
        foreach ($enrollments as $enrollment) {
            // Get student ID
            $stmt = $pdo->prepare("SELECT id FROM users WHERE student_id = ?");
            $stmt->execute([$enrollment['enrollment']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                $errors[] = "Student not found: " . $enrollment['enrollment'];
                continue;
            }

            // Get subject ID
            $stmt = $pdo->prepare("SELECT id FROM subjects WHERE code = ?");
            $stmt->execute([$enrollment['subjectCode']]);
            $subject = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$subject) {
                $errors[] = "Subject not found: " . $enrollment['subjectCode'];
                continue;
            }

            // Check if enrollment exists
            $checkStmt = $pdo->prepare("
                SELECT id FROM student_enrollments 
                WHERE user_id = ? AND subject_id = ?
            ");
            $checkStmt->execute([$user['id'], $subject['id']]);

            if (!$checkStmt->fetch()) {
                // Create enrollment
                $stmt = $pdo->prepare("
                    INSERT INTO student_enrollments (
                        user_id, subject_id, status
                    ) VALUES (?, ?, 'active')
                ");
                $stmt->execute([$user['id'], $subject['id']]);
                $imported++;
            }
        }

        $pdo->commit();

        return [
            'success' => true,
            'imported' => $imported,
            'total' => count($enrollments),
            'errors' => $errors
        ];

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/**
 * Import grades
 */
function importGrades($pdo, $grades)
{
    $imported = 0;

    $pdo->beginTransaction();

    try {
        foreach ($grades as $grade) {
            // Implementation for grade import
            // Would process T1, T2, MID1, Practicals, Assignments
        }

        $pdo->commit();

        return [
            'success' => true,
            'imported' => $imported,
            'total' => count($grades)
        ];

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/**
 * Import attendance
 */
function importAttendance($pdo, $attendance)
{
    $imported = 0;

    $pdo->beginTransaction();

    try {
        foreach ($attendance as $record) {
            // Implementation for attendance import
            // Would process daily attendance records
        }

        $pdo->commit();

        return [
            'success' => true,
            'imported' => $imported,
            'total' => count($attendance)
        ];

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}
?>
