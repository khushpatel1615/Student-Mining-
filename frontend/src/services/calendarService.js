import apiClient from '../utils/apiClient';

/**
 * Calendar Service
 */

export const fetchCalendarEvents = async (params = {}) => {
    try {
        const data = await apiClient.get('/calendar.php', params);
        return { data: data.data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const createCalendarEvent = async (eventData) => {
    try {
        const data = await apiClient.post('/calendar.php', eventData);
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const deleteCalendarEvent = async (id) => {
    try {
        const data = await apiClient.delete('/calendar.php', { id });
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};
