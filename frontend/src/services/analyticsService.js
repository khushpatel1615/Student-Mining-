import apiClient from '../utils/apiClient';

export const analyticsService = {
    fetchGradeIntegrity: async () => {
        try {
            const response = await apiClient.get('/analytics.php', { report: 'grade_integrity' });
            return { data: response.data || response, error: null };
        } catch (error) {
            return { data: null, error: error.message };
        }
    },
    fetchStudentGPAHistory: async (studentId) => {
        try {
            const response = await apiClient.get('/analytics.php', { student_gpa_history: 1, student_id: studentId });
            return { data: response.data, error: null };
        } catch (error) {
            return { data: null, error: error.message };
        }
    }
};
