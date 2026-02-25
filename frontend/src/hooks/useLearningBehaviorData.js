import { useState, useCallback, useRef, useEffect } from 'react';
import apiClient from '../utils/apiClient';

export function useLearningBehaviorData(token) {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [errorDetails, setErrorDetails] = useState(null);
    const [filter, setFilter] = useState('risky');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [summary, setSummary] = useState({ critical: 0, at_risk: 0, warning: 0, avg_engagement: 0 });
    const [setupMessage, setSetupMessage] = useState(null);
    const [programs, setPrograms] = useState([]);
    const [selectedProgram, setSelectedProgram] = useState('');

    const userSelectedFilterRef = useRef(false);
    const summaryRef = useRef(summary);

    // Filter Logic Helpers
    const getAutoFilter = useCallback((nextSummary) => {
        const critical = Number(nextSummary?.critical || 0);
        const atRisk = Number(nextSummary?.at_risk || 0);
        const warning = Number(nextSummary?.warning || 0);

        if (critical > 0) return 'critical';
        if (atRisk > 0) return 'at_risk';
        if (warning > 0) return 'warning';
        return 'all';
    }, []);

    // Fetch Programs
    useEffect(() => {
        const fetchPrograms = async () => {
            if (!token) return;
            try {
                const data = await apiClient.get('/programs.php');
                if (data.success) {
                    setPrograms(data.data || []);
                }
            } catch {
                // Program fetch failed — non-critical
            }
        };
        fetchPrograms();
    }, [token]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPagination(prev => ({ ...prev, page: 1 }));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Initial Filter
    useEffect(() => {
        setFilter('risky');
    }, []);

    // Fetch Data
    const fetchAtRiskStudents = useCallback(async () => {
        if (!token) {
            setError('Not authenticated. Please log in.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        setErrorDetails(null);
        setSetupMessage(null);

        const params = {
            limit: pagination.limit,
            offset: (pagination.page - 1) * pagination.limit
        };

        if (filter !== 'all') {
            params.risk_level = filter;
        }

        if (selectedProgram) {
            params.program_id = selectedProgram;
        }

        if (debouncedSearch) {
            params.search = debouncedSearch;
        }

        try {
            const data = await apiClient.get('/behavior/at_risk_students.php', params);

            if (data.success) {
                setStudents(data.students || []);
                const nextSummary = data.summary || { critical: 0, at_risk: 0, warning: 0, avg_engagement: 0 };
                setSummary(nextSummary);
                setPagination(prev => ({ ...prev, total: data.pagination?.total || 0 }));
                summaryRef.current = nextSummary;

                if (data.message) {
                    setSetupMessage({
                        message: data.message,
                        setupUrl: data.setup_url
                    });
                }
            } else {
                throw new Error(data.error || 'Unknown error');
            }

        } catch (err) {
            setError(err.message || 'Network Error');
            setErrorDetails({ message: err.message });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token, filter, debouncedSearch, pagination.page, pagination.limit, selectedProgram]);

    // Auto Filter Effect
    useEffect(() => {
        const nextSummary = summaryRef.current;
        if (!nextSummary) return;

        const autoFilter = getAutoFilter(nextSummary);

        if (!userSelectedFilterRef.current && autoFilter !== filter) {
            setFilter(autoFilter);
            setPagination(prev => ({ ...prev, page: 1 }));
        }
    }, [filter, getAutoFilter]);

    // Trigger Fetch
    useEffect(() => {
        fetchAtRiskStudents();
    }, [fetchAtRiskStudents]);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const data = await apiClient.get('/behavior/refresh.php');
            if (!data.success) throw new Error(data.error);
            await fetchAtRiskStudents();
        } catch (err) {
            setError('Failed to refresh data: ' + err.message);
            setRefreshing(false);
        }
    };

    const handleFilterChange = (newFilter) => {
        userSelectedFilterRef.current = true;
        setFilter(newFilter);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleProgramChange = (progId) => {
        setSelectedProgram(progId);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    return {
        students,
        loading,
        refreshing,
        error,
        errorDetails,
        setupMessage,
        summary,
        pagination,
        setPagination,
        filter,
        handleFilterChange,
        searchTerm,
        setSearchTerm,
        programs,
        selectedProgram,
        handleProgramChange,
        handleRefresh
    };
}
