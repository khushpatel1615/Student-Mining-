import apiClient from '../utils/apiClient';

/**
 * Teacher Service
 */

export const fetchTeachers = async (params = {}) => {
    try {
        const data = await apiClient.get('/teachers.php', params);
        return { data: data.data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const fetchMySubjects = async () => {
    try {
        const data = await apiClient.get('/teachers.php', { action: 'my_subjects' });
        return { data: data.data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const updateTeacher = async (id, teacherData) => {
    try {
        const data = await apiClient.put('/teachers.php', { id, ...teacherData });
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const deleteTeacherSubject = async (teacherId, subjectId) => {
    try {
        const data = await apiClient.delete('/teachers.php', {
            teacher_id: teacherId,
            subject_id: subjectId
        });
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};
