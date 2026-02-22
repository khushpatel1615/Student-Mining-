<?php

/**
 * Notification Helper Functions
 */

/**
 * Create a new notification for a user
 *
 * @param PDO $pdo Database connection
 * @param int $userId Target user ID
 * @param string $type Notification type (grade_update, attendance_warning, announcement)
 * @param string $title Notification title
 * @param string $message Notification message body
 * @param int|null $relatedId ID of related entity (e.g. grade_id, enrollment_id)
 * @return bool Success status
 */
function createNotification($pdo, $userId, $type, $title, $message, $relatedId = null)
{
    try {
        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, type, title, message, related_id)
            VALUES (?, ?, ?, ?, ?)
        ");
        return $stmt->execute([$userId, $type, $title, $message, $relatedId]);
    } catch (Exception $e) {
        error_log("Failed to create notification: " . $e->getMessage());
        return false;
    }
}

/**
 * Queue an email for a user if they have not disabled that template type
 */
function queueEmail($pdo, $userId, $templateType, $templateData)
{
    try {
        // Fetch user email
        $stmt = $pdo->prepare("SELECT email FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $userEmail = $stmt->fetchColumn();

        if (!$userEmail)
            return false;

        // Check preferences
        $prefStmt = $pdo->prepare("SELECT * FROM email_preferences WHERE user_id = ?");
        $prefStmt->execute([$userId]);
        $prefs = $prefStmt->fetch(PDO::FETCH_ASSOC);

        // If preference row explicitly disables this template, return false to skip.
        // Assuming column names match enum. e.g. 'grade_finalized'
        if ($prefs && isset($prefs[$templateType]) && (int) $prefs[$templateType] === 0) {
            return false;
        }

        $insStmt = $pdo->prepare("
            INSERT INTO email_queue (user_id, template_type, template_data, status, created_at)
            VALUES (?, ?, ?, 'pending', NOW())
        ");
        return $insStmt->execute([$userId, $templateType, json_encode($templateData)]);
    } catch (Exception $e) {
        error_log("Failed to queue email: " . $e->getMessage());
        return false;
    }
}
