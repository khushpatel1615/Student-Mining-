import apiClient from '../utils/apiClient';

export const degreeService = {
    fetchDegreeAudit: async (studentIdParam = '') => {
        try {
            const query = studentIdParam ? { student_id: studentIdParam } : {};
            const data = await apiClient.get('/degree_audit.php', query);

            return { data: data.data || data, error: null };
        } catch (error) {
            return { data: null, error: error.message || 'Failed to fetch degree audit' };
        }
    }
};
