<?php
// Script to add a new user to the database
require_once __DIR__ . '/../config/database.php';

$pdo = getDBConnection();

// User details
$email = 'khushpatel1615@gmail.com';
$studentId = 'STU002';
$fullName = 'Khush Patel';
$role = 'student'; // Change to 'admin' if you want admin access

try {
    // Check if user already exists
    $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = :email");
    $checkStmt->execute(['email' => $email]);

    if ($checkStmt->fetch()) {
        echo "<h2>User already exists!</h2>";
        echo "<p>Email: $email</p>";
    } else {
        // Insert new user
        $stmt = $pdo->prepare("
            INSERT INTO users (email, student_id, full_name, role) 
            VALUES (:email, :student_id, :full_name, :role)
        ");

        $stmt->execute([
            'email' => $email,
            'student_id' => $studentId,
            'full_name' => $fullName,
            'role' => $role
        ]);

        echo "<h2>✅ User added successfully!</h2>";
        echo "<p><strong>Email:</strong> $email</p>";
        echo "<p><strong>Student ID:</strong> $studentId</p>";
        echo "<p><strong>Full Name:</strong> $fullName</p>";
        echo "<p><strong>Role:</strong> $role</p>";
        echo "<hr>";
        echo "<p>You can now log in with Google OAuth using this email.</p>";
    }
} catch (PDOException $e) {
    echo "<h2>❌ Error adding user:</h2>";
    echo "<p>" . $e->getMessage() . "</p>";
}
?>