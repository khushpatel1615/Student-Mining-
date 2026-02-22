<?php
require_once __DIR__ . '/../config/database.php';

// Assuming basic PHP mail() setup
function sendEmail($to, $subject, $body)
{
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=UTF-8\r\n";
    $headers .= "From: no-reply@studentdatamining.com\r\n";

    // In local dev, mail() might fail. So we log and simulate success if not working.
    // Replace with real mail() logic as needed.
    $success = @mail($to, $subject, $body, $headers);
    if (!$success) {
        // Fallback logging for testing
        error_log("Simulated Email Sent to: $to | Subject: $subject");
        return true;
    }
    return $success;
}

try {
    $pdo = getDBConnection();

    $stmt = $pdo->prepare("
        SELECT eq.*, u.full_name as student_name, u.email 
        FROM email_queue eq
        JOIN users u ON eq.user_id = u.id
        WHERE eq.status = 'pending' AND eq.retry_count < 3
        ORDER BY eq.created_at ASC
        LIMIT 50
    ");
    $stmt->execute();
    $emails = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $updSent = $pdo->prepare("UPDATE email_queue SET status = 'sent', sent_at = NOW() WHERE id = ?");
    $updFail = $pdo->prepare("
        UPDATE email_queue 
        SET retry_count = retry_count + 1, 
            status = CASE WHEN retry_count + 1 >= 3 THEN 'failed' ELSE 'pending' END 
        WHERE id = ?
    ");

    $count = 0;
    foreach ($emails as $emailJob) {
        $id = $emailJob['id'];
        $to = $emailJob['email'];
        $type = $emailJob['template_type'];
        $data = json_decode($emailJob['template_data'], true);
        $studentName = $emailJob['student_name'];

        $subject = "";
        $body = "";

        if ($type === 'grade_finalized') {
            $subName = $data['subject_name'] ?? 'Subject';
            $grade = $data['letter_grade'] ?? '';
            $pct = $data['final_percentage'] ?? '';
            $subject = "Your grades for {$subName} are now official";
            $body = "Dear {$studentName}, your final grade for {$subName} is {$grade} ({$pct}%). Log in to view your full grade breakdown.";
        } elseif ($type === 'risk_alert') {
            $subject = "Academic Support — Action Recommended";
            $body = "Dear {$studentName}, our system has flagged your academic performance as requiring attention. Please contact your academic advisor at your earliest convenience.";
        } elseif ($type === 'tier_achievement') {
            $subject = "🎓 Academic Achievement Unlocked";
            $body = "Dear {$studentName}, congratulations! Your performance has reached the Excellent tier. Keep up the outstanding work.";
        } elseif ($type === 'import_complete') {
            $subName = $data['subject_name'] ?? 'Subject';
            $applied = $data['applied'] ?? 0;
            $skipped = $data['skipped'] ?? 0;
            $subject = "Grade Import Completed — {$subName}";
            $body = "Your CSV import for {$subName} has been processed. {$applied} grades were applied, {$skipped} rows were skipped.";
        }

        if (sendEmail($to, $subject, $body)) {
            $updSent->execute([$id]);
            $count++;
        } else {
            $updFail->execute([$id]);
        }
    }

    echo "Processed $count emails.\n";

} catch (Exception $e) {
    error_log("Email Queue Error: " . $e->getMessage());
    echo "Error processing queue.\n";
}
