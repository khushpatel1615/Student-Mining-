// ==========================================
// GRADEBOOK v2 — useGradeEdits Hook
// Manages local grade edits, validation, save
// ==========================================
import { useState, useCallback, useEffect } from 'react';
import { bulkSaveGrades } from '../../../services/gradeService';

/**
 * Builds an initial grade map from enrollment data returned by the backend.
 * Shape: { [enrollmentId]: { [criteriaId]: value } }
 */
function buildGradeMap(enrollments, criteria) {
    const g = {};
    enrollments.forEach(e => {
        g[e.id] = {};
        criteria.forEach(c => {
            const eg = e.grades?.find(x => String(x.criteria_id) === String(c.id));
            g[e.id][c.id] = eg?.marks_obtained ?? '';
        });
    });
    return g;
}

export function useGradeEdits(enrollments, criteria, onSaved) {
    const [grades, setGrades] = useState({});
    const [errors, setErrors] = useState({});
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(null);

    // Re-initialise when data changes (new subject selected)
    useEffect(() => {
        setGrades(buildGradeMap(enrollments, criteria));
        setErrors({});
        setDirty(false);
    }, [enrollments, criteria]);

    const updateGrade = useCallback((enrollmentId, criteriaId, value) => {
        const c = criteria.find(x => String(x.id) === String(criteriaId));
        const max = parseFloat(c?.max_marks);
        const n = value === '' ? '' : Number(value);
        let err = null;
        if (n !== '' && isNaN(n)) err = 'Invalid';
        else if (n !== '' && n < 0) err = 'Min 0';
        else if (n !== '' && !isNaN(max) && n > max) err = `Max ${max}`;

        setGrades(prev => ({ ...prev, [enrollmentId]: { ...prev[enrollmentId], [criteriaId]: value } }));
        setErrors(prev => ({ ...prev, [enrollmentId]: { ...prev[enrollmentId], [criteriaId]: err } }));
        setDirty(true);
    }, [criteria]);

    const hasErrors = useCallback(() =>
        Object.values(errors).some(e => Object.values(e).some(Boolean)),
        [errors]);

    const saveAll = useCallback(async (selectedSubject) => {
        if (hasErrors()) { setSaveError('Fix invalid marks before saving.'); return false; }
        setSaving(true); setSaveError(null); setSaveSuccess(null);
        const payload = [];
        Object.entries(grades).forEach(([eId, cMap]) => {
            Object.entries(cMap).forEach(([cId, marks]) => {
                if (marks !== '' && marks !== null) {
                    payload.push({
                        enrollment_id: parseInt(eId),
                        criteria_id: parseInt(cId),
                        marks_obtained: parseFloat(marks),
                    });
                }
            });
        });
        try {
            await bulkSaveGrades(selectedSubject, payload);
            setSaveSuccess('Grades saved successfully!');
            setDirty(false);
            setTimeout(() => setSaveSuccess(null), 3500);
            if (onSaved) onSaved();
            return true;
        } catch (err) {
            setSaveError(err.message || 'Save failed.');
            return false;
        } finally {
            setSaving(false);
        }
    }, [grades, hasErrors, onSaved]);

    return {
        grades, errors, dirty,
        saving, saveError, saveSuccess,
        updateGrade, saveAll, hasErrors,
    };
}
