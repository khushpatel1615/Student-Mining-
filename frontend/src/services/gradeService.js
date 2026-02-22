import apiClient from '../utils/apiClient';

/**
 * Fetch all grades for a subject (paginated)
 */
export const fetchSubjectGrades = async (subjectId, page = 1, limit = 50) => {
    const response = await apiClient.get('/grades.php', { subject_id: subjectId, page, limit });
    return response.data; // backend wraps in { success, data }
};

/**
 * Fetch Grade Data by program or subject
 */
export const fetchGradeData = async (programId, subjectId = null) => {
    try {
        const params = {};
        if (programId) params.program_id = programId;
        if (subjectId) params.subject_id = subjectId;

        const response = await apiClient.get('/grades.php', params);
        return { data: response.data || response, error: null }; // Fallback for unwrapped response
    } catch (error) {
        return { data: null, error: error.message };
    }
};

/**
 * Fetch a single student's grades across all enrolled subjects
 */
export const fetchStudentGrades = async (studentId) => {
    const params = studentId ? { user_id: studentId } : {};
    const response = await apiClient.get('/grades.php', params);
    return response.data;
};

/**
 * Save/update a single grade entry
 */
export const saveGrade = async (enrollmentId, criteriaId, marksObtained, remarks) => {
    const response = await apiClient.put('/grades.php', {
        grades: [{
            enrollment_id: enrollmentId,
            criteria_id: criteriaId,
            marks_obtained: marksObtained,
            remarks
        }]
    });
    return response.data;
};

/**
 * Bulk save grades for an entire subject
 */
export const bulkSaveGrades = async (subjectId, gradesArray) => {
    // subjectId is provided for logical grouping, but PUT takes grades array directly
    const response = await apiClient.put('/grades.php', { grades: gradesArray });
    return response.data;
};

/**
 * Fetch evaluation criteria for a subject
 */
export const fetchCriteria = async (subjectId) => {
    // Calling subject_id endpoint returns both criteria and enrollments, we just extract criteria
    const response = await apiClient.get('/grades.php', { subject_id: subjectId, page: 1, limit: 1 });
    return response.data.criteria;
};

/**
 * Trigger final percentage + letter grade recalculation for an enrollment
 */
export const recalculateFinalGrade = async (subjectId) => {
    const response = await apiClient.put('/grades.php', {
        action: 'recalculate_subject',
        subject_id: subjectId
    });
    return response.data;
};
