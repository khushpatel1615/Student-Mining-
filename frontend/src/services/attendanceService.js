import apiClient from '../utils/apiClient';

/**
 * Attendance Service
 */

export const fetchAttendance = async (filters = {}) => {
    try {
        const data = await apiClient.get('/attendance.php', filters);
        return { data: data.data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const markAttendance = async (attendanceData) => {
    try {
        const data = await apiClient.post('/attendance.php', attendanceData);
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const fetchAttendanceReport = async (filters = {}) => {
    try {
        const data = await apiClient.get('/attendance_report.php', filters);
        return { data: data.data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};
