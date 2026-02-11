<?php
/**
 * Enroll all students in their semester subjects and populate grades
 */

require_once __DIR__ . '/../backend/config/database.php';

try {
    $pdo = getDBConnection();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "=== Student Enrollment & Grade Population ===\n\n";

    // Get all students
    $stmt = $pdo->query("
        SELECT id, full_name, student_id, current_semester, program_id
        FROM users
        WHERE role = 'student'
    ");
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Found " . count($students) . " students\n\n";

    if (count($students) == 0) {
        echo "No students found! Please create students first.\n";
        exit(1);
    }

    $enrollmentCount = 0;
    $currentYear = date('Y');

    // Enroll each student in their semester subjects
    foreach ($students as $student) {
        $userId = $student['id'];
        $studentName = $student['full_name'];
        $semester = $student['current_semester'] ?? 1;
        $programId = $student['program_id'] ?? 1;

        echo "Enrolling {$studentName} (Semester {$semester})...\n";

        // Get subjects for this semester
        $stmt = $pdo->prepare("
            SELECT id, name, code
            FROM subjects
            WHERE program_id = ? AND semester = ? AND is_active = TRUE
        ");
        $stmt->execute([$programId, $semester]);
        $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($subjects as $subject) {
            $subjectId = $subject['id'];

            // Create enrollment
            $stmt = $pdo->prepare("
                INSERT IGNORE INTO student_enrollments (user_id, subject_id, academic_year, status)
                VALUES (?, ?, ?, 'active')
            ");
            $stmt->execute([$userId, $subjectId, $currentYear,]);

            if ($stmt->rowCount() > 0) {
                $enrollmentId = $pdo->lastInsertId();

                // Create grade records for each evaluation criteria
                $stmt = $pdo->prepare("
                    INSERT IGNORE INTO student_grades (enrollment_id, criteria_id)
                    SELECT ?, id
                    FROM evaluation_criteria
                    WHERE subject_id = ?
                ");
                $stmt->execute([$enrollmentId, $subjectId]);

                $enrollmentCount++;
                echo "  ✓ Enrolled in {$subject['name']}\n";
            }
        }
    }

    echo "\n=================================\n";
    echo "Enrollment completed!\n";
    echo "Total enrollments created: {$enrollmentCount}\n";
    echo "=================================\n\n";

    // Now populate grades
    echo "Populating grades...\n\n";

    $stmt = $pdo->query("
        SELECT se.id as enrollment_id, u.full_name, s.name as subject_name
        FROM student_enrollments se
        JOIN users u ON se.user_id = u.id
        JOIN subjects s ON se.subject_id = s.id
        WHERE se.status = 'active'
    ");
    $enrollments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $graded = 0;

    foreach ($enrollments as $enrollment) {
        $enrollmentId = $enrollment['enrollment_id'];
        $studentName = $enrollment['full_name'];
        $subjectName = $enrollment['subject_name'];

        // Generate a random performance factor (0.50 to 0.95)
        $performanceFactor = 0.50 + (mt_rand(0, 45) / 100);

        // Get evaluation criteria
        $stmt = $pdo->prepare("
            SELECT ec.id, ec.component_name, ec.max_marks
            FROM evaluation_criteria ec
            JOIN student_enrollments se ON se.subject_id = ec.subject_id
            WHERE se.id = ?
        ");
        $stmt->execute([$enrollmentId]);
        $criteria = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (count($criteria) == 0) {
            continue; // Skip if no criteria defined
        }

        $totalMarks = 0;

        foreach ($criteria as $criterion) {
            $criteriaId = $criterion['id'];
            $maxMarks = $criterion['max_marks'];

            // Generate random marks
            $randomMarks = round(
                $maxMarks * $performanceFactor * (0.85 + (mt_rand(0, 30) / 100)),
                2
            );

            // Ensure marks don't exceed max
            if ($randomMarks > $maxMarks) {
                $randomMarks = $maxMarks;
            }

            // Ensure minimum 30%
            if ($randomMarks < ($maxMarks * 0.30)) {
                $randomMarks = round($maxMarks * 0.30, 2);
            }

            // Update grade
            $stmt = $pdo->prepare("
                UPDATE student_grades
                SET marks_obtained = ?,
                    graded_at = NOW(),
                    graded_by = 1
                WHERE enrollment_id = ? AND criteria_id = ?
            ");
            $stmt->execute([$randomMarks, $enrollmentId, $criteriaId]);

            $totalMarks += $randomMarks;
        }

        // Calculate letter grade
        $letterGrade = 'F';
        if ($totalMarks >= 90)
            $letterGrade = 'A+';
        elseif ($totalMarks >= 80)
            $letterGrade = 'A';
        elseif ($totalMarks >= 70)
            $letterGrade = 'B+';
        elseif ($totalMarks >= 60)
            $letterGrade = 'B';
        elseif ($totalMarks >= 50)
            $letterGrade = 'C';
        elseif ($totalMarks >= 40)
            $letterGrade = 'D';

        $status = $totalMarks >= 40 ? 'completed' : 'failed';

        // Update enrollment
        $stmt = $pdo->prepare("
            UPDATE student_enrollments
            SET final_percentage = ?,
                final_grade = ?,
                status = ?
            WHERE id = ?
        ");
        $stmt->execute([$totalMarks, $letterGrade, $status, $enrollmentId]);

        echo "✓ {$studentName} - {$subjectName}: {$totalMarks}/100 ({$letterGrade})\n";
        $graded++;
    }

    echo "\n=================================\n";
    echo "Grade population completed!\n";
    echo "Total grades assigned: {$graded}\n";
    echo "=================================\n\n";

    // Show summary
    $stmt = $pdo->query("
        SELECT 
            COUNT(DISTINCT u.id) as total_students,
            COUNT(*) as total_enrollments,
            ROUND(AVG(se.final_percentage), 2) as average_score,
            COUNT(CASE WHEN se.final_grade IN ('A+', 'A') THEN 1 END) as a_grades,
            COUNT(CASE WHEN se.final_grade IN ('B+', 'B') THEN 1 END) as b_grades,
            COUNT(CASE WHEN se.final_grade = 'C' THEN 1 END) as c_grades,
            COUNT(CASE WHEN se.final_grade IN ('D', 'F') THEN 1 END) as failing_grades
        FROM student_enrollments se
        JOIN users u ON se.user_id = u.id
        WHERE u.role = 'student' AND se.final_percentage IS NOT NULL
    ");
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);

    echo "Summary Statistics:\n";
    echo "- Total Students: {$stats['total_students']}\n";
    echo "- Total Enrollments: {$stats['total_enrollments']}\n";
    echo "- Average Score: {$stats['average_score']}%\n";
    echo "- A Grades (90-100): {$stats['a_grades']}\n";
    echo "- B Grades (60-89): {$stats['b_grades']}\n";
    echo "- C Grades (50-59): {$stats['c_grades']}\n";
    echo "- D/F Grades (<50): {$stats['failing_grades']}\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
    exit(1);
}
