// ==========================================
// GRADEBOOK v2 — useGradeFilter Hook
// Manages program/semester/subject dropdowns
// ==========================================
import { useState, useEffect, useCallback } from 'react';
import { fetchPrograms, fetchSubjects } from '../../../services/programService';

export function useGradeFilter(initialValues = {}) {
    const [programs, setPrograms] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedProgram, setSelectedProgram] = useState(initialValues.program || '');
    const [selectedSemester, setSelectedSemester] = useState(initialValues.semester || '');
    const [selectedSubject, setSelectedSubject] = useState(initialValues.subject || '');
    const [loadingPrograms, setLoadingPrograms] = useState(false);
    const [loadingSubjects, setLoadingSubjects] = useState(false);
    const [error, setError] = useState(null);

    // Load programs once
    useEffect(() => {
        setLoadingPrograms(true);
        fetchPrograms()
            .then(res => {
                if (res.data) {
                    setPrograms(res.data);
                    // Auto-select first program
                    if (!selectedProgram && res.data.length > 0) {
                        setSelectedProgram(String(res.data[0].id));
                    }
                } else if (res.error) {
                    setError(res.error);
                }
            })
            .finally(() => setLoadingPrograms(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reload subjects when program or semester changes
    useEffect(() => {
        if (!selectedProgram) { setSubjects([]); return; }
        setLoadingSubjects(true);
        setSelectedSubject(''); // reset subject on filter change
        fetchSubjects(selectedProgram, selectedSemester || null)
            .then(res => {
                if (res.data) setSubjects(res.data);
            })
            .finally(() => setLoadingSubjects(false));
    }, [selectedProgram, selectedSemester]);

    const reset = useCallback(() => {
        setSelectedProgram(programs.length ? String(programs[0].id) : '');
        setSelectedSemester('');
        setSelectedSubject('');
    }, [programs]);

    const isValid = Boolean(selectedSubject);

    return {
        programs, subjects,
        selectedProgram, setSelectedProgram,
        selectedSemester, setSelectedSemester,
        selectedSubject, setSelectedSubject,
        loadingPrograms, loadingSubjects,
        error, isValid, reset,
    };
}
