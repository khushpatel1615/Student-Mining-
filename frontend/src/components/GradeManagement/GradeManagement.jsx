import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import apiClient from '../../utils/apiClient';
import { fetchSubjectGrades, bulkSaveGrades } from '../../services/gradeService';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../EmptyState/EmptyState';

// Icons
import { Save, BookOpen, AlertCircle, AlertTriangle, ChevronLeft, ChevronRight, Upload, X } from 'lucide-react';
import GradeImport from './GradeImport';

const toSentenceCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
};

function GradeManagement() {
    const { token } = useAuth();
    const [searchParams] = useSearchParams();
    const isFirstRender = useRef(true);

    const [programs, setPrograms] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [criteria, setCriteria] = useState([]);
    const [grades, setGrades] = useState({});
    const [remarks, setRemarks] = useState({});
    const [gradeErrors, setGradeErrors] = useState({});

    // Pagination
    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [pagination, setPagination] = useState(null);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Inline error states
    const [fetchError, setFetchError] = useState(null);
    const [saveError, setSaveError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Filters
    const [selectedProgram, setSelectedProgram] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showImport, setShowImport] = useState(false);

    // Sync state with URL params ONLY on mount
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;

            const urlProgramId = searchParams.get('program_id');
            const urlSemester = searchParams.get('semester');
            const urlStudentName = searchParams.get('student_name');
            const urlSubject = searchParams.get('subject');

            if (urlProgramId) setSelectedProgram(urlProgramId);
            if (urlSemester) setSelectedSemester(urlSemester);
            if (urlStudentName) setSearchQuery(decodeURIComponent(urlStudentName));
            if (urlSubject === 'all' || urlStudentName) {
                setSelectedSubject('all');
            }
        }
    }, [searchParams]);

    // Fetch programs
    useEffect(() => {
        const loadPrograms = async () => {
            try {
                const res = await apiClient.get('/programs.php');
                if (res.success) {
                    setPrograms(res.data);
                    if (!selectedProgram && res.data.length > 0) {
                        setSelectedProgram(res.data[0].id.toString());
                    }
                }
            } catch (err) {
                console.error('Failed to fetch programs:', err);
                setFetchError('Failed to load programs.');
            }
        };
        loadPrograms();
    }, []);

    // Fetch subjects when program/semester changes
    useEffect(() => {
        const loadSubjects = async () => {
            if (!selectedProgram) return;
            try {
                let url = `/subjects.php?program_id=${selectedProgram}`;
                if (selectedSemester) url += `&semester=${selectedSemester}`;
                const res = await apiClient.get(url);
                if (res.success) {
                    setSubjects(res.data);
                }
            } catch (err) {
                console.error('Failed to fetch subjects:', err);
            }
        };
        loadSubjects();
    }, [selectedProgram, selectedSemester]);

    // Fetch grades when subject or page changes
    const loadGrades = useCallback(async () => {
        if (!selectedSubject) return;

        setLoading(true);
        setFetchError(null);

        try {
            if (selectedSubject === 'all') {
                const res = await apiClient.get('/grades.php', {
                    program_id: selectedProgram,
                    semester: selectedSemester
                });
                processGradesData(res.data);
            } else {
                const data = await fetchSubjectGrades(selectedSubject, page, limit); // Uses { data, pagination } shape
                processGradesData(data);
            }
        } catch (err) {
            setFetchError(err.message || 'Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [selectedSubject, selectedProgram, selectedSemester, page, limit]);

    useEffect(() => {
        loadGrades();
    }, [loadGrades]);

    const processGradesData = (data) => {
        const enrs = data.enrollments || [];
        const crits = data.criteria || [];
        setEnrollments(enrs);
        setCriteria(crits);
        setGradeErrors({});
        setPagination(data.pagination || null);

        const gradesObj = {};
        const remarksObj = {};
        enrs.forEach(enrollment => {
            gradesObj[enrollment.id] = {};
            remarksObj[enrollment.id] = {};
            crits.forEach(c => {
                const existingGrade = enrollment.grades?.find(g => String(g.criteria_id) === String(c.id));
                gradesObj[enrollment.id][c.id] = (existingGrade?.marks_obtained !== undefined && existingGrade?.marks_obtained !== null)
                    ? existingGrade.marks_obtained
                    : '';
                remarksObj[enrollment.id][c.id] = existingGrade?.remarks || '';
            });
        });
        setGrades(gradesObj);
        setRemarks(remarksObj);
    };

    const updateGrade = (enrollmentId, criteriaId, value) => {
        const maxMarks = criteria.find(c => String(c.id) === String(criteriaId))?.max_marks ?? null;
        const normalized = value === '' ? '' : Number(value);
        let errorMsg = null;
        if (normalized !== '' && isNaN(normalized)) errorMsg = 'Invalid';
        else if (normalized !== '' && normalized < 0) errorMsg = 'Min 0';
        else if (normalized !== '' && maxMarks !== null && normalized > maxMarks) errorMsg = `Max ${maxMarks}`;

        setGrades(prev => ({
            ...prev,
            [enrollmentId]: { ...prev[enrollmentId], [criteriaId]: value }
        }));
        setGradeErrors(prev => ({
            ...prev,
            [enrollmentId]: { ...prev[enrollmentId], [criteriaId]: errorMsg }
        }));
    };

    const clampGradeValue = (value, maxMarks) => {
        if (value === '' || value === null || value === undefined) return '';
        let num = Number(value);
        if (Number.isNaN(num)) return '';
        if (num < 0) num = 0;
        if (maxMarks !== null && num > Number(maxMarks)) num = Number(maxMarks);
        return num;
    };

    const hasValidationErrors = () => {
        return Object.values(gradeErrors).some(errs => Object.values(errs).some(Boolean));
    };

    const handleSaveGrades = async () => {
        if (hasValidationErrors()) {
            setSaveError('Please fix invalid marks before saving.');
            return;
        }

        setSaving(true);
        setSaveError(null);
        setSuccess(null);

        try {
            const gradesData = [];
            Object.entries(grades).forEach(([enrollmentId, cGrades]) => {
                Object.entries(cGrades).forEach(([criteriaId, marks]) => {
                    const remark = remarks[enrollmentId]?.[criteriaId];
                    if (marks !== '' && marks !== null) {
                        gradesData.push({
                            enrollment_id: parseInt(enrollmentId),
                            criteria_id: parseInt(criteriaId),
                            marks_obtained: parseFloat(marks),
                            remarks: remark || null
                        });
                    }
                });
            });

            await bulkSaveGrades(selectedSubject, gradesData);
            setSuccess('Grades saved successfully!');
            setTimeout(() => setSuccess(null), 3000);
            await loadGrades(); // refresh
        } catch (err) {
            setSaveError(err.message || 'Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // Derived states
    const currentProgram = programs.find(p => p.id.toString() === selectedProgram);
    const semesters = currentProgram ? Array.from({ length: currentProgram.total_semesters }, (_, i) => i + 1) : [];

    const weightSum = criteria.reduce((sum, c) => sum + parseFloat(c.weight_percentage), 0);
    const showWeightWarning = criteria.length > 0 && Math.abs(weightSum - 100) > 0.01;

    // Helper to calc live weighted score
    const getLiveWeightedScore = (enrollmentId, criteriaId) => {
        const cr = criteria.find(c => String(c.id) === String(criteriaId));
        if (!cr) return 0;
        const mark = parseFloat(grades[enrollmentId]?.[criteriaId]);
        if (isNaN(mark)) return 0;
        return (mark / parseFloat(cr.max_marks)) * parseFloat(cr.weight_percentage);
    };

    const getTotalWeightedScore = (enrollmentId) => {
        let total = 0;
        criteria.forEach(c => { total += getLiveWeightedScore(enrollmentId, c.id); });
        return total.toFixed(2);
    };

    const getScoreColor = (score, weight) => {
        if (weight === 0) return 'text-gray-500';
        const percent = (score / weight) * 100;
        if (percent >= 90) return 'text-green-500';
        if (percent >= 60) return 'text-amber-500';
        return 'text-red-500';
    };

    // Skeleton loader component
    const SkeletonTable = () => (
        <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 animate-pulse flex space-x-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
            </div>
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="p-4 border-b border-gray-100 dark:border-gray-800 animate-pulse flex space-x-4">
                    <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h2 className="text-2xl font-bold tracking-tight">Grade Management</h2>
                <div className="flex flex-wrap gap-3">
                    {selectedSubject && enrollments.length > 0 && (
                        <>
                            <button
                                onClick={() => setShowImport(true)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center shadow-sm"
                            >
                                <Upload size={18} className="mr-2" />
                                Import Grades
                            </button>
                            <button
                                onClick={handleSaveGrades}
                                disabled={saving || hasValidationErrors() || showWeightWarning}
                                className={`flex items-center px-4 py-2 rounded-lg font-semibold transition-colors
                                    ${(saving || hasValidationErrors() || showWeightWarning)
                                        ? 'bg-gray-400 cursor-not-allowed text-white'
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'}`}
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {saving ? 'Saving...' : 'Save All Grades'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <select
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={selectedProgram}
                    onChange={(e) => { setSelectedProgram(e.target.value); setSelectedSemester(''); setSelectedSubject(''); setPage(1); }}
                >
                    <option value="">Select Program</option>
                    {programs.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                </select>
                <select
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 disabled:opacity-50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={selectedSemester}
                    onChange={(e) => { setSelectedSemester(e.target.value); setSelectedSubject(''); setPage(1); }}
                    disabled={!selectedProgram}
                >
                    <option value="">All Semesters</option>
                    {semesters.map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                    ))}
                </select>
                <select
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 disabled:opacity-50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={selectedSubject}
                    onChange={(e) => { setSelectedSubject(e.target.value); setPage(1); }}
                    disabled={!selectedProgram}
                >
                    <option value="">Select Subject</option>
                    {selectedProgram && <option value="all">All Subjects</option>}
                    {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                </select>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search student..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={!selectedSubject}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 disabled:opacity-50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
            </div>

            {showImport && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl overflow-hidden">
                    <div className="bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700 relative animate-fade-in shadow-2xl">
                        <button
                            onClick={() => { setShowImport(false); loadGrades(); }}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors bg-slate-800 rounded-full hover:bg-slate-700 z-10"
                        >
                            <X size={24} />
                        </button>
                        <GradeImport programId={selectedProgram || null} subjectId={selectedSubject || null} />
                    </div>
                </div>
            )}

            {/* Inline Error/Success Messages */}
            {fetchError && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-red-700 dark:text-red-400 font-medium">{fetchError}</p>
                    </div>
                    <button onClick={loadGrades} className="text-sm bg-white dark:bg-gray-800 px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">Retry</button>
                </div>
            )}

            {saveError && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" />
                    <div><p className="text-red-700 dark:text-red-400 font-medium">{saveError}</p></div>
                </div>
            )}

            {success && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <p className="text-green-700 dark:text-green-400 font-medium">{success}</p>
                </div>
            )}

            {/* Weight Integrity Warning */}
            {selectedSubject && selectedSubject !== 'all' && showWeightWarning && !loading && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded-r-xl shadow-sm flex items-center">
                    <AlertCircle className="text-amber-500 mr-3 h-6 w-6" />
                    <p className="text-amber-800 dark:text-amber-200 font-bold">
                        ⚠️ Criteria weights for this subject sum to {weightSum}%, not 100%. Final grades will be inaccurate until corrected.
                    </p>
                </div>
            )}

            {/* Main Content Area */}
            {loading ? (
                <SkeletonTable />
            ) : !selectedSubject ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-12 text-center border border-gray-200 dark:border-gray-800">
                    <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Select a Subject</h3>
                    <p className="text-gray-500">Choose a subject from the filters above to manage and enter student grades.</p>
                </div>
            ) : enrollments.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-12 text-center border border-gray-200 dark:border-gray-800">
                    <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-bold mb-2">No Enrollments Found</h3>
                    <p className="text-gray-500">No students are currently enrolled in this subject.</p>
                </div>
            ) : selectedSubject === 'all' ? (
                <div className="space-y-6">
                    {/* All Subjects View (Legacy Support, simplified) */}
                    <p className="text-gray-500 dark:text-gray-400 italic">For detailed grading, please select a specific subject.</p>
                    {/* Simplified all-subjects view can go here, omitted for brevity as per instructions to focus on main grade table */}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse divide-y divide-gray-200 dark:divide-gray-800">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 min-w-[200px]">
                                        Student Name
                                    </th>
                                    {criteria.map((c, i) => (
                                        <th key={c.id} className="px-6 py-4 border-l border-gray-200 dark:border-gray-700 min-w-[320px]">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">{c.component_name}</span>
                                                <div className="flex text-xs space-x-3 text-gray-400">
                                                    <span>Weight: <strong className="text-gray-700 dark:text-gray-300">{parseFloat(c.weight_percentage)}%</strong></span>
                                                    <span>Max: <strong className="text-gray-700 dark:text-gray-300">{parseFloat(c.max_marks)}</strong></span>
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-gray-700 min-w-[150px]">
                                        Projected Final %
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {enrollments
                                    .filter(e => {
                                        if (!searchQuery) return true;
                                        const q = searchQuery.toLowerCase();
                                        return e.student_name.toLowerCase().includes(q) || String(e.student_id).toLowerCase().includes(q);
                                    })
                                    .map(enrollment => {
                                        const totalScore = getTotalWeightedScore(enrollment.id);
                                        const totalColor = getScoreColor(totalScore, weightSum);

                                        return (
                                            <tr key={enrollment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                <td className="px-6 py-4 sticky left-0 bg-inherit z-10 border-r border-gray-100 dark:border-gray-800">
                                                    <div className="font-semibold text-gray-900 dark:text-gray-100">{toSentenceCase(enrollment.student_name)}</div>
                                                    <div className="text-xs text-gray-500 font-mono mt-1">{enrollment.student_id}</div>
                                                </td>
                                                {criteria.map(c => {
                                                    const liveScore = getLiveWeightedScore(enrollment.id, c.id);
                                                    const scoreColor = getScoreColor(liveScore, parseFloat(c.weight_percentage));

                                                    return (
                                                        <td key={c.id} className="px-6 py-4 border-l border-gray-100 dark:border-gray-800 align-top">
                                                            <div className="grid grid-cols-[1fr_80px] gap-2 items-start">
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            type="number"
                                                                            placeholder="Marks"
                                                                            value={grades[enrollment.id]?.[c.id] ?? ''}
                                                                            onChange={(e) => updateGrade(enrollment.id, c.id, e.target.value)}
                                                                            onBlur={(e) => {
                                                                                const clamped = clampGradeValue(e.target.value, c.max_marks);
                                                                                updateGrade(enrollment.id, c.id, clamped);
                                                                            }}
                                                                            min="0"
                                                                            max={c.max_marks}
                                                                            step="0.01"
                                                                            className={`w-full bg-white dark:bg-gray-800 border ${gradeErrors[enrollment.id]?.[c.id] ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 focus:ring-indigo-500'} rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:border-transparent transition-all`}
                                                                        />
                                                                        <span className="text-gray-400 text-sm h-full flex items-center">/ {c.max_marks}</span>
                                                                    </div>
                                                                    {gradeErrors[enrollment.id]?.[c.id] && (
                                                                        <span className="text-xs text-red-500 mt-1">{gradeErrors[enrollment.id][c.id]}</span>
                                                                    )}
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Remarks (optional)"
                                                                        value={remarks[enrollment.id]?.[c.id] || ''}
                                                                        onChange={(e) => setRemarks(prev => ({ ...prev, [enrollment.id]: { ...prev[enrollment.id], [c.id]: e.target.value } }))}
                                                                        className="w-full mt-2 bg-transparent border-none text-xs text-gray-600 dark:text-gray-400 placeholder-gray-400 focus:ring-0 p-0"
                                                                    />
                                                                </div>

                                                                {/* Live Weighted Score Display */}
                                                                <div className="flex flex-col items-end pt-2">
                                                                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Weighted</span>
                                                                    <span className={`font-mono font-bold text-sm ${scoreColor}`}>
                                                                        {liveScore.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-6 py-4 border-l border-gray-100 dark:border-gray-800 align-middle text-right">
                                                    <span className={`font-mono font-bold text-lg ${totalColor}`}>
                                                        {totalScore}%
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                            </tbody>
                            <tfoot className="bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 z-20">
                                <tr>
                                    <td colSpan={criteria.length + 2} className="px-6 py-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                                                Total Weight Allocated: <span className={showWeightWarning ? 'text-red-500' : 'text-green-500'}>{weightSum}%</span>
                                            </span>

                                            {/* Pagination Controls */}
                                            {pagination && pagination.totalPages > 1 && (
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm text-gray-500">
                                                        Page {pagination.page} of {pagination.totalPages}
                                                    </span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                                            disabled={pagination.page <= 1}
                                                            className="p-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        >
                                                            <ChevronLeft size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                                            disabled={pagination.page >= pagination.totalPages}
                                                            className="p-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        >
                                                            <ChevronRight size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GradeManagement;
