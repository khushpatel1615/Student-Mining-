<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

requireMethod('POST');
$input = getJsonInput();

$email = $input['email'] ?? '';
$otp = $input['otp'] ?? '';
$password = $input['password'] ?? '';

if (!$email || !$otp || !$password) {
    sendError('All fields are required', 400);
}

if (strlen($password) < 8) {
    sendError('Password must be at least 8 characters', 400);
}

try {
    $pdo = getDBConnection();

    // Verify OTP again
    $stmt = $pdo->prepare("
        SELECT id FROM password_resets 
        WHERE email = ? AND otp = ? AND expires_at > NOW()
    ");
    $stmt->execute([$email, $otp]);
    $reset = $stmt->fetch();

    if (!$reset) {
        sendError('Invalid or expired OTP', 400);
    }

    // Update User Password
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $update = $pdo->prepare("UPDATE users SET password_hash = ? WHERE email = ?");
    $update->execute([$hash, $email]);

    // Delete used OTP
    $pdo->prepare("DELETE FROM password_resets WHERE email = ?")->execute([$email]);

    sendResponse(['success' => true, 'message' => 'Password has been reset successfully.']);

} catch (Exception $e) {
    sendError('Server error', 500, $e->getMessage());
}
