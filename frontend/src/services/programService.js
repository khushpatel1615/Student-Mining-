import apiClient from '../utils/apiClient';

/**
 * Program & Subject Service
 */

export const fetchPrograms = async () => {
    try {
        const data = await apiClient.get('/programs.php');
        return { data: data.data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const fetchSubjects = async (programId = null, semester = null) => {
    try {
        const params = {};
        if (programId) params.program_id = programId;
        if (semester) params.semester = semester;

        const data = await apiClient.get('/subjects.php', params);
        return { data: data.data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};
