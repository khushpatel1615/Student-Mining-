<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../vendor/autoload.php';

function sendEmail($to, $subject, $body)
{
    // Standardize to getenv as used in database.php hardening
    $host = getenv('SMTP_HOST');
    if (!$host) {
        error_log("SMTP not configured. Cannot send email to $to");
        return false;
    }

    $mail = new PHPMailer(true);

    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host = $host;
        $mail->SMTPAuth = true;
        $mail->Username = getenv('SMTP_USER');
        $mail->Password = getenv('SMTP_PASS');

        $secure = getenv('SMTP_SECURE');
        if ($secure === 'ssl') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        } else {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        }

        $mail->Port = (int) (getenv('SMTP_PORT') ?: 587);

        // Recipients
        $mail->setFrom(getenv('SMTP_FROM') ?: getenv('SMTP_USER'), getenv('SMTP_FROM_NAME') ?: 'Student Data Mining');
        $mail->addAddress($to);

        // Content
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $body;
        $mail->AltBody = strip_tags($body);

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("PHPMailer Error: " . $e->getMessage() . " (to: $to)");
        return false;
    }
}
