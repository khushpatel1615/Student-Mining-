import apiClient from '../utils/apiClient';

/**
 * Grade Service
 */

export const fetchGrades = async (params = {}) => {
    try {
        const data = await apiClient.get('/grades.php', params);
        return { data: data.data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const updateGrade = async (gradeData) => {
    try {
        const data = await apiClient.put('/grades.php', gradeData);
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const deleteGrade = async (gradeId) => {
    try {
        const data = await apiClient.delete('/grades.php', { id: gradeId });
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};
