<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();

    $email = 'admin@eduportal.com';
    $password = 'Admin123!';
    $hash = password_hash($password, PASSWORD_DEFAULT);

    // Check if user exists by email
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        // User exists, update password
        $stmt = $pdo->prepare("UPDATE users SET password_hash = ?, role = 'admin' WHERE id = ?");
        $stmt->execute([$hash, $user['id']]);
        echo "Admin user exists. Password updated.\n";
    } else {
        // User doesn't exist.
        $studentId = 'ADMIN_01'; // Not really a student ID but the schema might require it or it's nullable
        // We'll assume structure from create_test_user

        $stmt = $pdo->prepare("INSERT INTO users (email, password_hash, full_name, role, student_id) VALUES (?, ?, 'System Administrator', 'admin', ?)");
        // Note: student_id might be required/unique.
        try {
            $stmt->execute([$email, $hash, $studentId]);
        } catch (Exception $e) {
            // If student_id fails (maybe unique constraint), try another
            $stmt->execute([$email, $hash, 'ADMIN_' . time()]);
        }
        echo "Admin user created.\n";
    }

    echo "Admin setup complete: $email / $password\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>