import apiClient from '../utils/apiClient';

export const importService = {
    validateCSV: async (subjectId, csvFile) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64Str = e.target.result.split(',')[1] || e.target.result;
                try {
                    const data = await apiClient.post(`/import.php`, {
                        action: 'validate_csv',
                        subject_id: subjectId,
                        csv_data: base64Str
                    });

                    resolve({ data: data.data || data, error: null });
                } catch (error) {
                    resolve({ data: null, error: error.message || 'Validation failed' });
                }
            };
            reader.onerror = () => {
                resolve({ data: null, error: 'Failed to read file' });
            };

            // We read as data URL so it natively gives base64
            reader.readAsDataURL(csvFile);
        });
    },

    applyImport: async (importJobId) => {
        try {
            const data = await apiClient.post(`/import.php`, {
                action: 'apply_import',
                import_job_id: importJobId
            });

            return { data: data.data || data, error: null };
        } catch (error) {
            return { data: null, error: error.message || 'Import failed' };
        }
    },

    downloadTemplate: async (subjectId, criteria) => {
        try {
            if (!criteria || !criteria.length) {
                throw new Error("No evaluation criteria found for this subject.");
            }

            const headers = ['student_id'];
            criteria.forEach(c => headers.push(c.component_name));

            const csvContent = headers.join(',') + '\n' + 'STU001,85,90,...';

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `grade_template_subject_${subjectId}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            return { error: null };
        } catch (error) {
            return { error: error.message };
        }
    },

    importStudents: async (students) => {
        try {
            const data = await apiClient.post('/import_students_backend.php', {
                action: 'import_students',
                data: students
            });
            return { data: data.data || data, error: null };
        } catch (error) {
            return { data: null, error: error.message || 'Student import failed' };
        }
    },

    importEnrollments: async (enrollments) => {
        try {
            const data = await apiClient.post('/import_students_backend.php', {
                action: 'import_enrollments',
                data: enrollments
            });
            return { data: data.data || data, error: null };
        } catch (error) {
            return { data: null, error: error.message || 'Enrollment import failed' };
        }
    }
};
