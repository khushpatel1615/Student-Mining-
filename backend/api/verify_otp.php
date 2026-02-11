<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';

requireMethod('POST');
$input = getJsonInput();

$email = $input['email'] ?? '';
$otp = $input['otp'] ?? '';

if (!$email || !$otp) {
    sendError('Email and OTP are required', 400);
}

try {
    $pdo = getDBConnection();

    $stmt = $pdo->prepare("
        SELECT id FROM password_resets 
        WHERE email = ? AND otp = ? AND expires_at > NOW()
    ");
    $stmt->execute([$email, $otp]);
    $reset = $stmt->fetch();

    if ($reset) {
        sendResponse(['success' => true, 'message' => 'OTP verified']);
    } else {
        sendError('Invalid or expired OTP', 400);
    }

} catch (Exception $e) {
    sendError('Server error', 500, $e->getMessage());
}
