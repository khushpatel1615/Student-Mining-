<?php
/**
 * Setup Default Evaluation Criteria
 * Run this script to add default grading criteria to ALL subjects
 * that don't have any criteria defined yet.
 */

require_once __DIR__ . '/../config/database.php';

header('Content-Type: text/html; charset=utf-8');

echo "<h2>🎓 Setting Up Default Evaluation Criteria</h2>";

try {
    $pdo = getDBConnection();

    // Get all subjects without evaluation criteria
    $stmt = $pdo->query("
        SELECT s.id, s.name, s.code, s.semester, s.subject_type
        FROM subjects s
        LEFT JOIN evaluation_criteria ec ON s.id = ec.subject_id
        WHERE s.is_active = TRUE
        GROUP BY s.id
        HAVING COUNT(ec.id) = 0
        ORDER BY s.semester, s.name
    ");
    $subjectsWithoutCriteria = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($subjectsWithoutCriteria)) {
        echo "<p style='color: green;'>✅ All subjects already have evaluation criteria!</p>";
    } else {
        echo "<p>Found <strong>" . count($subjectsWithoutCriteria) . "</strong> subjects without criteria. Adding default criteria...</p>";
        echo "<ul>";

        $pdo->beginTransaction();

        foreach ($subjectsWithoutCriteria as $subject) {
            // Determine criteria based on subject type
            $criteria = [];

            // Default criteria for all subjects (total = 100 marks)
            if ($subject['subject_type'] === 'Core' || strpos($subject['name'], 'Programming') !== false || strpos($subject['name'], 'Lab') !== false) {
                // Core/Programming subjects with practical component
                $criteria = [
                    ['Final Exam', 40.00, 40, 'End semester examination'],
                    ['Mid-Term Exam', 20.00, 20, 'Mid semester examination'],
                    ['Lab Practicals', 25.00, 25, 'Laboratory/Practical work'],
                    ['Assignments', 15.00, 15, 'Assignments and homework']
                ];
            } else {
                // Theory subjects
                $criteria = [
                    ['Final Exam', 40.00, 40, 'End semester examination'],
                    ['Mid-Term Exam', 25.00, 25, 'Mid semester examination'],
                    ['Assignments', 20.00, 20, 'Assignments and homework'],
                    ['Class Participation', 15.00, 15, 'Class participation and quizzes']
                ];
            }

            // Insert criteria for this subject
            $insertStmt = $pdo->prepare("
                INSERT INTO evaluation_criteria (subject_id, component_name, weight_percentage, max_marks, description)
                VALUES (?, ?, ?, ?, ?)
            ");

            foreach ($criteria as $c) {
                $insertStmt->execute([$subject['id'], $c[0], $c[1], $c[2], $c[3]]);
            }

            echo "<li>✅ <strong>Semester {$subject['semester']}</strong>: {$subject['name']} ({$subject['code']}) - Added " . count($criteria) . " criteria</li>";
        }

        $pdo->commit();
        echo "</ul>";
        echo "<p style='color: green;'><strong>✅ Successfully added criteria to " . count($subjectsWithoutCriteria) . " subjects!</strong></p>";
    }

    // Now create grade records for enrolled students without grades
    echo "<hr>";
    echo "<h3>📝 Creating Grade Records for Enrolled Students</h3>";

    $stmt = $pdo->query("
        SELECT 
            se.id as enrollment_id, 
            se.subject_id,
            u.full_name,
            s.name as subject_name
        FROM student_enrollments se
        JOIN users u ON se.user_id = u.id
        JOIN subjects s ON se.subject_id = s.id
        WHERE se.status = 'active'
    ");
    $enrollments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $gradesCreated = 0;
    $pdo->beginTransaction();

    foreach ($enrollments as $enrollment) {
        // Get criteria for this subject
        $criteriaStmt = $pdo->prepare("SELECT id FROM evaluation_criteria WHERE subject_id = ?");
        $criteriaStmt->execute([$enrollment['subject_id']]);
        $criteria = $criteriaStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($criteria as $c) {
            // Insert grade record if doesn't exist
            $insertGrade = $pdo->prepare("
                INSERT IGNORE INTO student_grades (enrollment_id, criteria_id)
                VALUES (?, ?)
            ");
            $result = $insertGrade->execute([$enrollment['enrollment_id'], $c['id']]);
            if ($pdo->lastInsertId() > 0) {
                $gradesCreated++;
            }
        }
    }

    $pdo->commit();

    if ($gradesCreated > 0) {
        echo "<p style='color: green;'>✅ Created <strong>$gradesCreated</strong> new grade records for enrolled students.</p>";
    } else {
        echo "<p>ℹ️ All enrolled students already have grade records.</p>";
    }

    // Show summary
    echo "<hr>";
    echo "<h3>📊 Summary of All Subjects with Criteria</h3>";
    echo "<table border='1' cellpadding='8' cellspacing='0' style='border-collapse: collapse; width: 100%;'>";
    echo "<tr style='background: #f0f0f0;'><th>Semester</th><th>Subject</th><th>Code</th><th>Evaluation Criteria</th></tr>";

    $summary = $pdo->query("
        SELECT 
            s.semester,
            s.name,
            s.code,
            GROUP_CONCAT(
                CONCAT(ec.component_name, ' (', ec.max_marks, ')') 
                ORDER BY ec.weight_percentage DESC 
                SEPARATOR ', '
            ) AS criteria
        FROM subjects s
        LEFT JOIN evaluation_criteria ec ON s.id = ec.subject_id
        WHERE s.is_active = TRUE
        GROUP BY s.id
        ORDER BY s.semester, s.name
    ");

    while ($row = $summary->fetch(PDO::FETCH_ASSOC)) {
        echo "<tr>";
        echo "<td style='text-align: center;'>Sem {$row['semester']}</td>";
        echo "<td>{$row['name']}</td>";
        echo "<td><code>{$row['code']}</code></td>";
        echo "<td>" . ($row['criteria'] ?? '<em>No criteria</em>') . "</td>";
        echo "</tr>";
    }
    echo "</table>";

    echo "<hr>";
    echo "<p><strong>🎉 Done!</strong> You can now grade students in all subjects from the Grade Management page.</p>";

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "<h3 style='color: red;'>❌ Error:</h3>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
}
?>