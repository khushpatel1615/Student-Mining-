import apiClient from '../utils/apiClient';

/**
 * Student Service
 */

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNumericKey = (key) => /^\d+$/.test(key);

const logServiceError = (context, error) => {
    console.error(`[studentService] ${context}`, error);
};

const normalizeIndexedObject = (value) => {
    if (!isPlainObject(value)) {
        return value;
    }

    const keys = Object.keys(value);
    const numericKeys = keys.filter(isNumericKey);
    if (numericKeys.length === 0) {
        return value;
    }

    const nonNumericKeys = keys.filter((key) => !isNumericKey(key) && key !== 'requestId');
    if (nonNumericKeys.length > 0) {
        return value;
    }

    return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => value[key]);
};

const unwrapResponse = (response) => {
    if (!response) {
        return response;
    }

    if (response.success === false) {
        throw new Error(response.error || response.message || 'Request failed');
    }

    const payload = Object.prototype.hasOwnProperty.call(response, 'data') ? response.data : response;
    return normalizeIndexedObject(payload);
};

const asArray = (payload) => {
    const normalized = normalizeIndexedObject(payload);
    return Array.isArray(normalized) ? normalized : [];
};

const getErrorMessage = (error, fallback = 'Request failed') => {
    return error?.data?.error || error?.message || fallback;
};

const fail = (context, error, fallback, defaultData = null) => {
    logServiceError(context, error);
    return { data: defaultData, error: getErrorMessage(error, fallback) };
};

const toStudentParams = (studentIdOrParams, idKey = 'user_id') => {
    if (isPlainObject(studentIdOrParams)) {
        return { ...studentIdOrParams };
    }

    if (
        studentIdOrParams === null ||
        studentIdOrParams === undefined ||
        studentIdOrParams === ''
    ) {
        return {};
    }

    return { [idKey]: studentIdOrParams };
};

export const fetchStudents = async (filters = {}) => {
    try {
        const response = await apiClient.get('/students.php', filters);
        if (response?.success === false) {
            throw new Error(response.error || response.message || 'Failed to fetch students');
        }

        const studentRows = normalizeIndexedObject(response?.data);
        return {
            data: Array.isArray(studentRows) ? studentRows : [],
            pagination: response?.pagination || null,
            error: null
        };
    } catch (error) {
        return fail('fetchStudents', error, 'Failed to fetch students');
    }
};

export const fetchStudentById = async (id) => {
    try {
        const response = await apiClient.get('/students.php', { id });
        if (response?.success === false) {
            throw new Error(response.error || response.message || 'Failed to fetch student');
        }

        const data = normalizeIndexedObject(response?.data);
        if (Array.isArray(data)) {
            return { data: data[0] || null, error: null };
        }

        return { data: data || null, error: null };
    } catch (error) {
        return fail('fetchStudentById', error, 'Failed to fetch student');
    }
};

export const updateStudent = async (id, studentData) => {
    try {
        const response = await apiClient.put('/students.php', {
            id,
            ...studentData
        });
        const data = unwrapResponse(response);
        return { data, error: null };
    } catch (error) {
        return fail('updateStudent', error, 'Failed to update student');
    }
};

export const fetchStudentProfile = async (studentId = null) => {
    try {
        const params = toStudentParams(studentId, 'user_id');
        const response = await apiClient.get('/student_live_analytics.php', params);
        const data = unwrapResponse(response);
        return { data, error: null };
    } catch (error) {
        return fail('fetchStudentProfile', error, 'Failed to fetch student profile');
    }
};

export const fetchDashboardData = async (studentIdOrParams = null) => {
    try {
        const params = toStudentParams(studentIdOrParams, 'user_id');
        const response = await apiClient.get('/student_dashboard.php', params);
        const data = unwrapResponse(response);
        return { data, error: null };
    } catch (error) {
        return fail('fetchDashboardData', error, 'Failed to fetch dashboard data');
    }
};

export const createStudent = async (studentData) => {
    try {
        const response = await apiClient.post('/students.php', studentData);
        const data = unwrapResponse(response);
        return { data, error: null };
    } catch (error) {
        return fail('createStudent', error, 'Failed to create student');
    }
};

export const deleteStudent = async (id) => {
    try {
        const response = await apiClient.delete('/students.php', { id });
        const data = unwrapResponse(response);
        return { data, error: null };
    } catch (error) {
        return fail('deleteStudent', error, 'Failed to delete student');
    }
};

/**
 * Student-facing endpoint helpers
 */

export const fetchStudentNotifications = async (limit = 10) => {
    try {
        const response = await apiClient.get('/notifications.php', { limit });
        const data = unwrapResponse(response);
        return { data, error: null };
    } catch (error) {
        return fail('fetchStudentNotifications', error, 'Failed to fetch notifications');
    }
};

export const markStudentNotificationAsRead = async (notificationId = null) => {
    try {
        const body = notificationId
            ? { action: 'mark_read', notification_id: notificationId }
            : { action: 'mark_read' };
        const response = await apiClient.put('/notifications.php', body);
        const data = unwrapResponse(response);
        return { data, error: null };
    } catch (error) {
        return fail('markStudentNotificationAsRead', error, 'Failed to update notifications');
    }
};

export const fetchStudentGrades = async (studentIdOrParams = null) => {
    try {
        const params = toStudentParams(studentIdOrParams, 'user_id');
        const response = await apiClient.get('/grades.php', params);
        const data = asArray(unwrapResponse(response));
        return { data, error: null };
    } catch (error) {
        return fail('fetchStudentGrades', error, 'Failed to fetch grades', []);
    }
};

export const fetchAssignments = async (studentIdOrParams = null) => {
    try {
        const params = toStudentParams(studentIdOrParams, 'student_id');
        const response = await apiClient.get('/assignments.php', params);
        const data = asArray(unwrapResponse(response));
        return { data, error: null };
    } catch (error) {
        return fail('fetchAssignments', error, 'Failed to fetch assignments', []);
    }
};

export const fetchStudentAssignments = fetchAssignments;

export const fetchSubmissions = async (studentIdOrParams = null) => {
    try {
        const params = toStudentParams(studentIdOrParams, 'student_id');
        const response = await apiClient.get('/submissions.php', params);
        const data = asArray(unwrapResponse(response));
        return { data, error: null };
    } catch (error) {
        return fail('fetchSubmissions', error, 'Failed to fetch submissions', []);
    }
};

export const submitStudentAssignment = async (assignmentId, file) => {
    try {
        const formData = new FormData();
        formData.append('assignment_id', assignmentId);
        formData.append('file', file);

        const response = await apiClient.upload('/submissions.php', formData);
        const data = unwrapResponse(response);
        return { data, error: null };
    } catch (error) {
        return fail('submitStudentAssignment', error, 'Failed to submit assignment');
    }
};

export const fetchExams = async (studentIdOrParams = null) => {
    try {
        const params = toStudentParams(studentIdOrParams, 'user_id');
        const response = await apiClient.get('/exams.php', params);
        const data = asArray(unwrapResponse(response));
        return { data, error: null };
    } catch (error) {
        return fail('fetchExams', error, 'Failed to fetch exams', []);
    }
};

export const fetchStudentExams = fetchExams;

export const fetchEnrollments = async (studentIdOrParams = null) => {
    try {
        const params = toStudentParams(studentIdOrParams, 'user_id');
        const response = await apiClient.get('/enrollments.php', params);
        const data = asArray(unwrapResponse(response));
        return { data, error: null };
    } catch (error) {
        return fail('fetchEnrollments', error, 'Failed to fetch enrollments', []);
    }
};

export const fetchPerformance = async (studentIdOrParams = null) => {
    try {
        const params = toStudentParams(studentIdOrParams, 'student_id');
        const response = await apiClient.get('/performance.php', params);
        const data = unwrapResponse(response);
        return { data, error: null };
    } catch (error) {
        return fail('fetchPerformance', error, 'Failed to fetch performance data');
    }
};

export const fetchDegreeAudit = async (studentIdOrParams = null) => {
    try {
        const params = toStudentParams(studentIdOrParams, 'student_id');
        const response = await apiClient.get('/degree_audit.php', params);
        const data = unwrapResponse(response);
        return { data, error: null };
    } catch (error) {
        return fail('fetchDegreeAudit', error, 'Failed to fetch degree audit');
    }
};

export const fetchStudyPlannerData = async () => {
    try {
        const response = await apiClient.get('/study_planner.php');
        const data = unwrapResponse(response);
        return { data, error: null };
    } catch (error) {
        return fail('fetchStudyPlannerData', error, 'Failed to fetch study planner data');
    }
};

export const fetchStudentLiveAnalytics = async (userId = null) => {
    try {
        const params = toStudentParams(userId, 'user_id');
        const response = await apiClient.get('/student_live_analytics.php', params);
        const data = unwrapResponse(response);
        return { data, error: null };
    } catch (error) {
        return fail('fetchStudentLiveAnalytics', error, 'Failed to fetch live analytics');
    }
};

export const fetchStudentAnalytics = async ({ range = '30d', semester = null } = {}) => {
    try {
        const params = { action: 'analytics', range };
        if (semester !== null && semester !== undefined) {
            params.semester = semester;
        }
        const response = await apiClient.get('/student_dashboard.php', params);
        const data = unwrapResponse(response);
        return { data, error: null };
    } catch (error) {
        return fail('fetchStudentAnalytics', error, 'Failed to fetch analytics');
    }
};

export const fetchCareerProfile = async (userId = null) => {
    try {
        const params = { action: 'profile' };
        if (userId) {
            params.user_id = userId;
        }
        const response = await apiClient.get('/analytics/features.php', params);
        const data = unwrapResponse(response);
        return { data, error: null };
    } catch (error) {
        return fail('fetchCareerProfile', error, 'Failed to fetch career profile');
    }
};

export const fetchStudentSubjects = async (params = {}) => {
    try {
        const response = await apiClient.get('/subjects.php', params);
        const data = asArray(unwrapResponse(response));
        return { data, error: null };
    } catch (error) {
        return fail('fetchStudentSubjects', error, 'Failed to fetch subjects', []);
    }
};

export const fetchStudentCalendarEvents = async (params = {}) => {
    try {
        const response = await apiClient.get('/calendar.php', params);
        const data = asArray(unwrapResponse(response));
        return { data, error: null };
    } catch (error) {
        return fail('fetchStudentCalendarEvents', error, 'Failed to fetch calendar events', []);
    }
};
