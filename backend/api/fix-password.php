<?php
// Generate proper password hash and update users
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $dsn = "mysql:host=localhost;dbname=student_data_mining;charset=utf8mb4";
    $pdo = new PDO($dsn, 'root', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // Generate proper password hash for 'password123'
    $password = 'password123';
    $hash = password_hash($password, PASSWORD_DEFAULT);

    // Update all users with the new hash
    $stmt = $pdo->prepare("UPDATE users SET password_hash = :hash");
    $stmt->execute(['hash' => $hash]);
    $updated = $stmt->rowCount();

    echo json_encode([
        'success' => true,
        'message' => "Updated $updated users with new password hash",
        'password' => $password,
        'hash' => $hash
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>