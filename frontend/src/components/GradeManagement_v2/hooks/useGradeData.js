// ==========================================
// GRADEBOOK v2 — useGradeData Hook
// Fetches and normalises grade data
// ==========================================
import { useState, useEffect, useCallback } from 'react';
import { fetchSubjectGrades, fetchDataQuality } from '../../../services/gradeService';

export function useGradeData(selectedSubject) {
    const [enrollments, setEnrollments] = useState([]);
    const [criteria, setCriteria] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [dataQuality, setDataQuality] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const LIMIT = 50;

    const normalise = useCallback((data) => {
        const enrs = data.enrollments || [];
        const crits = data.criteria || [];
        setEnrollments(enrs);
        setCriteria(crits);
        setPagination(data.pagination || null);
        return { enrs, crits };
    }, []);

    const load = useCallback(async () => {
        if (!selectedSubject || selectedSubject === 'all') return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchSubjectGrades(selectedSubject, page, LIMIT);
            normalise(data);
        } catch (err) {
            setError(err.message || 'Failed to load grades.');
        } finally {
            setLoading(false);
        }
    }, [selectedSubject, page, normalise]);

    useEffect(() => {
        load();
    }, [load]);

    // Fetch data quality stats whenever subject / data changes
    useEffect(() => {
        if (!selectedSubject || selectedSubject === 'all') { setDataQuality(null); return; }
        fetchDataQuality(selectedSubject)
            .then(res => { if (res.data) setDataQuality(res.data); });
    }, [selectedSubject]);

    return {
        enrollments, criteria, pagination,
        dataQuality, loading, error,
        page, setPage, refetch: load,
    };
}
