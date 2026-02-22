import apiClient from '../utils/apiClient';

/**
 * Enrollment Service
 */

export const fetchEnrollments = async (filters = {}) => {
    try {
        const data = await apiClient.get('/enrollments.php', filters);
        return { data: data.data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const createEnrollment = async (enrollmentData) => {
    try {
        const data = await apiClient.post('/enrollments.php', enrollmentData);
        return { data: data.data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const updateEnrollment = async (enrollmentId, updateData) => {
    try {
        const data = await apiClient.put('/enrollments.php', {
            enrollment_id: enrollmentId,
            ...updateData
        });
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const deleteEnrollment = async (id) => {
    try {
        const data = await apiClient.delete('/enrollments.php', { id });
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const bulkEnroll = async (bulkData) => {
    try {
        // Post body expected: { program_id, semester, user_ids, academic_year }
        const data = await apiClient.post('/enrollments.php', bulkData);
        return { data: data.data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const exportEnrollments = async (filters = {}) => {
    try {
        // Placeholder for export functionality
        // Usually this would be a specialized endpoint or direct window download
        return { data: { message: 'Export initiated' }, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};
