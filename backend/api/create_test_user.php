<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();

    $email = 'teststudent@example.com';
    $password = 'Password123!';
    $hash = password_hash($password, PASSWORD_DEFAULT);

    // Check if user exists by email
    $stmt = $pdo->prepare("SELECT id, student_id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        // User exists, update password and get ID
        $stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
        $stmt->execute([$hash, $user['id']]);
        echo "User exists. Password updated.\n";
        $userId = $user['id'];
    } else {
        // User doesn't exist. Need a unique student_id.
        // Try 'STU_TEST' first, if taken append random
        $studentId = 'STU_TEST';
        $stmt = $pdo->prepare("SELECT id FROM users WHERE student_id = ?");
        $stmt->execute([$studentId]);
        if ($stmt->fetch()) {
            $studentId = 'STU_TEST_' . time();
        }

        $stmt = $pdo->prepare("INSERT INTO users (email, password_hash, full_name, role, current_semester, student_id) VALUES (?, ?, 'Test Student', 'student', 1, ?)");
        $stmt->execute([$email, $hash, $studentId]);
        echo "User created with Student ID: $studentId\n";
        $userId = $pdo->lastInsertId();
    }

    // Ensure program enrollment (BSCS)
    $programId = 1;
    // Check if program 1 exists
    $stmt = $pdo->query("SELECT id FROM programs WHERE id = 1");
    if (!$stmt->fetch()) {
        // Create dummy program if not exists
        $pdo->exec("INSERT INTO programs (id, name, code, duration_years) VALUES (1, 'Computer Science', 'BSCS', 4)");
    }

    $stmt = $pdo->prepare("UPDATE users SET program_id = ? WHERE id = ?");
    $stmt->execute([$programId, $userId]);

    // Enroll in a subject (Subject ID 1)
    $stmt = $pdo->query("SELECT id FROM subjects LIMIT 1");
    $subjectId = $stmt->fetchColumn();

    if (!$subjectId) {
        // Create dummy subject if none
        $pdo->exec("INSERT INTO subjects (program_id, semester, name, code, credits, subject_type, is_active) VALUES (1, 1, 'Intro to CS', 'CS101', 3, 'Core', 1)");
        $subjectId = $pdo->lastInsertId();
    }

    if ($subjectId) {
        $stmt = $pdo->prepare("INSERT IGNORE INTO student_enrollments (user_id, subject_id, status) VALUES (?, ?, 'active')");
        $stmt->execute([$userId, $subjectId]);

        // Add some grades with remarks
        $stmt = $pdo->prepare("SELECT id FROM student_enrollments WHERE user_id = ? AND subject_id = ?");
        $stmt->execute([$userId, $subjectId]);
        $enrollmentId = $stmt->fetchColumn();

        // Check for evaluation criteria
        $stmt = $pdo->prepare("SELECT id FROM evaluation_criteria WHERE subject_id = ? LIMIT 1");
        $stmt->execute([$subjectId]); // Execute the statement before fetching
        $criteriaId = $stmt->fetchColumn();

        if (!$criteriaId) {
            $stmt = $pdo->prepare("INSERT INTO evaluation_criteria (subject_id, component_name, weight_percentage, max_marks) VALUES (?, 'Midterm', 30, 100)");
            $stmt->execute([$subjectId]);
            $criteriaId = $pdo->lastInsertId();
        }

        if ($criteriaId && $enrollmentId) {
            $stmt = $pdo->prepare("INSERT INTO student_grades (enrollment_id, criteria_id, marks_obtained, remarks, graded_at) VALUES (?, ?, 85, 'Excellent work on the midterm!', NOW()) ON DUPLICATE KEY UPDATE remarks = 'Excellent work on the midterm!', marks_obtained = 85");
            $stmt->execute([$enrollmentId, $criteriaId]);
            echo "Grades and remarks added.\n";
        }
    }

    echo "Test user setup complete: $email / $password\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>