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
