import apiClient from '../utils/apiClient';

/**
 * Student Service
 */

export const fetchStudents = async (filters = {}) => {
    try {
        const data = await apiClient.get('/students.php', filters);
        return {
            data: data.data,
            pagination: data.pagination,
            error: null
        };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const fetchStudentById = async (id) => {
    try {
        const data = await apiClient.get('/students.php', { id });
        return { data: data.data?.[0] || data.data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const updateStudent = async (id, studentData) => {
    try {
        const data = await apiClient.put('/students.php', {
            id,
            ...studentData
        });
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const fetchStudentProfile = async (id) => {
    try {
        const data = await apiClient.get('/student_live_analytics.php', { student_id: id });
        return { data: data.data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const fetchDashboardData = async (params = {}) => {
    try {
        const data = await apiClient.get('/student_dashboard.php', params);
        return { data: data.data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const createStudent = async (studentData) => {
    try {
        const data = await apiClient.post('/students.php', studentData);
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const deleteStudent = async (id) => {
    try {
        const data = await apiClient.delete(`/students.php?id=${id}`);
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

