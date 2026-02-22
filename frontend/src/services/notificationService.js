import apiClient from '../utils/apiClient';

/**
 * Notification Service
 */

export const fetchNotifications = async (limit = 10) => {
    try {
        const data = await apiClient.get('/notifications.php', { limit });
        return { data: data.data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const markAsRead = async (notificationId = null) => {
    try {
        const body = notificationId
            ? { action: 'mark_read', notification_id: notificationId }
            : { action: 'mark_read' };

        const data = await apiClient.put('/notifications.php', body);
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};
