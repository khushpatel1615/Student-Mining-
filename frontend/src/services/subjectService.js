import apiClient from '../utils/apiClient';

/**
 * Subject Service
 */

export const fetchSubjects = async (params = {}) => {
    try {
        const data = await apiClient.get('/subjects.php', params);
        return { data: data.data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const fetchSubjectDetails = async (subjectId) => {
    try {
        const data = await apiClient.get('/subject_details.php', { subject_id: subjectId });
        return { data: data.data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const createSubject = async (subjectData) => {
    try {
        const data = await apiClient.post('/subjects.php', subjectData);
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const updateSubject = async (id, subjectData) => {
    try {
        const data = await apiClient.put('/subjects.php', { id, ...subjectData });
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const deleteSubject = async (id) => {
    try {
        const data = await apiClient.delete('/subjects.php', { id });
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};
