import apiClient from '../utils/apiClient';

export const finalizeService = {
    finalizeSubject: async (subjectId) => {
        try {
            const response = await apiClient.post('/finalize.php', { action: 'finalize_subject', subject_id: subjectId });
            return { data: response.data, error: null };
        } catch (error) {
            return { data: null, error: error.message };
        }
    },
    unfinalizeSubject: async (subjectId, reason) => {
        try {
            const response = await apiClient.post('/finalize.php', { action: 'unfinalize_subject', subject_id: subjectId, reason });
            return { data: response.data, error: null };
        } catch (error) {
            return { data: null, error: error.message };
        }
    }
};
