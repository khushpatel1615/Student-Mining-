<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/jwt.php';
require_once __DIR__ . '/../includes/mailer.php';

// database.php already handles CORS via handleCORS()

requireMethod('POST');
$input = getJsonInput();
$email = $input['email'] ?? '';

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendError('Invalid email address', 400);
}

try {
    $pdo = getDBConnection();

    // Check if user exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND is_active = 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        // Return success even if user not found to prevent enumeration
        sendResponse(['success' => true, 'message' => 'If this email exists, an OTP has been sent.']);
    }

    // Generate 6-digit OTP
    $otp = sprintf("%06d", mt_rand(100000, 999999));
    $expires_at = date('Y-m-d H:i:s', strtotime('+15 minutes'));

    // Store OTP
    // First, delete any existing OTPs for this email to keep it clean
    $pdo->prepare("DELETE FROM password_resets WHERE email = ?")->execute([$email]);

    $stmt = $pdo->prepare("INSERT INTO password_resets (email, otp, expires_at) VALUES (?, ?, ?)");
    $stmt->execute([$email, $otp, $expires_at]);

    // Send Email
    $subject = "Password Reset OTP - Student Data Mining";
    $body = "
        <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;'>
            <h2 style='color: #2B5BA6; margin-top: 0;'>Password Reset Request</h2>
            <p>Your One-Time Password (OTP) for resetting your password is:</p>
            <div style='background: #f3f4f6; padding: 20px; text-align: center; border-radius: 6px; margin: 20px 0;'>
                <h1 style='font-size: 32px; letter-spacing: 5px; color: #1E4179; margin: 0;'>$otp</h1>
            </div>
            <p>This code expires in 15 minutes.</p>
            <p style='color: #6b7280; font-size: 14px; margin-top: 20px;'>If you did not request this, please ignore this email.</p>
        </div>
    ";

    $sent = sendEmail($email, $subject, $body);

    if (!$sent) {
        error_log("Failed to send OTP email to $email");
        // We still tell the user it was sent to prevent enumeration, 
        // but in development we might want to know.
        if (getenv('APP_ENV') === 'development') {
            sendError('Failed to send email. Check SMTP settings.', 500);
        }
    }

    sendResponse(['success' => true, 'message' => 'OTP sent to your email.']);

} catch (Exception $e) {
    sendError('Server error occurred', 500, $e->getMessage());
}
