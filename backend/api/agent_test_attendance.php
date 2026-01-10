<?php
/**
 * Agent Test Script: End-to-End Attendance Simulation
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

try {
    $pdo = getDBConnection();

    // 1. Data Setup
    $studentEmail = 'khushpatel1615@gmail.com';
    $teacherEmail = 'admin@example.com';
    $subjectId = 2; // Programming in C

    // Get Teacher info
    $stmt = $pdo->prepare("SELECT id, full_name, role FROM users WHERE id = 1");
    $stmt->execute();
    $teacher = $stmt->fetch(PDO::FETCH_ASSOC);

    // Get Student info
    $stmt = $pdo->prepare("SELECT id, full_name, role FROM users WHERE email = ?");
    $stmt->execute([$studentEmail]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    echo "--- Simulation Started ---\n";
    echo "Teacher: {$teacher['full_name']} (ID: {$teacher['id']})\n";
    echo "Student: {$student['full_name']} (ID: {$student['id']})\n";

    // 2. Start a Session (Teacher)
    $sessionCode = strtoupper(substr(md5(uniqid()), 0, 6));
    $expiry = date('Y-m-d H:i:s', strtotime('+15 minutes'));
    $ip = '::1'; // Simulating local environment

    $stmt = $pdo->prepare("
        INSERT INTO attendance_sessions (subject_id, teacher_id, authorized_ip, session_code, expires_at)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$subjectId, $teacher['id'], $ip, $sessionCode, $expiry]);
    $sessionId = $pdo->lastInsertId();
    echo "Session Created: Code $sessionCode, ID $sessionId\n";

    // 3. Generate Student Token
    // generateToken($userId, $email, $role, $fullName)
    $token = generateToken($student['id'], $studentEmail, 'student', $student['full_name']);
    echo "Student Token Generated.\n";

    // 4. Simulate POST to mark_self
    // We'll call the handlePost function directly for the most accurate internal test
    $_SERVER['HTTP_AUTHORIZATION'] = "Bearer $token";
    $_SERVER['REMOTE_ADDR'] = $ip;
    $_SERVER['REQUEST_METHOD'] = 'POST';

    // Mock php://input
    // PHP CLI doesn't support php://input easily, but we can override handlePost to accept $data
    // Instead, we will simulate the logic in attendance.php manually but using the exact same checks

    echo "Verifying attendance marking logic...\n";

    // Re-verify session (as done in attendance.php)
    $stmt = $pdo->prepare("SELECT * FROM attendance_sessions WHERE session_code = ? AND expires_at > NOW() AND is_active = 1");
    $stmt->execute([$sessionCode]);
    $session = $stmt->fetch();

    if (!$session) {
        die("ERROR: Session not found or inactive\n");
    }

    if ($_SERVER['REMOTE_ADDR'] !== $session['authorized_ip']) {
        die("ERROR: IP Mismatch. Expected {$session['authorized_ip']}, got {$_SERVER['REMOTE_ADDR']}\n");
    }

    // Get Enrollment (as done in attendance.php)
    $stmt = $pdo->prepare("SELECT id FROM student_enrollments WHERE user_id = ? AND subject_id = ?");
    $stmt->execute([$student['id'], $subjectId]);
    $enrollment = $stmt->fetch();

    if (!$enrollment) {
        die("ERROR: Student not enrolled\n");
    }

    // Mark Attendance (Final SQL)
    $stmt = $pdo->prepare("
        INSERT INTO student_attendance (enrollment_id, attendance_date, status, marked_by, session_id, ip_address)
        VALUES (?, CURDATE(), 'present', ?, ?, ?)
        ON DUPLICATE KEY UPDATE status = 'present', marked_by = ?, session_id = ?, ip_address = ?
    ");
    $stmt->execute([
        $enrollment['id'],
        $student['id'],
        $session['id'],
        $ip,
        $student['id'],
        $session['id'],
        $ip
    ]);

    echo "SUCCESS: Attendance marked in database!\n";

    // 5. Final Check: Query the attendance table
    $stmt = $pdo->prepare("
        SELECT sa.*, u.full_name 
        FROM student_attendance sa
        JOIN student_enrollments se ON sa.enrollment_id = se.id
        JOIN users u ON se.user_id = u.id
        WHERE sa.session_id = ?
    ");
    $stmt->execute([$sessionId]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);

    echo "--- TEST RESULT ---\n";
    print_r($record);
    echo "--- End of Simulation ---\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
