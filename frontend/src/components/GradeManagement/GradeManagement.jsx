import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import apiClient from '../../utils/apiClient';
import { fetchSubjectGrades, bulkSaveGrades, fetchGradeData } from '../../services/gradeService';
import { fetchPrograms, fetchSubjects } from '../../services/programService';
import { useAuth } from '../../context/AuthContext';

// Icons
import {
    Save, BookOpen, AlertCircle, AlertTriangle, ChevronLeft, ChevronRight,
    Upload, X, Search, Filter, GraduationCap, LayoutGrid, Users, Check, Info, Command, Activity
} from 'lucide-react';
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
    const [showFilters, setShowFilters] = useState(true);

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
            const res = await fetchPrograms();
            if (res.data) {
                setPrograms(res.data);
                if (!selectedProgram && res.data.length > 0) {
                    setSelectedProgram(res.data[0].id.toString());
                }
            } else if (res.error) {
                console.error('Failed to fetch programs:', res.error);
                setFetchError('Failed to load programs: ' + res.error);
            }
        };
        loadPrograms();
    }, []);

    // Fetch subjects when program/semester changes
    useEffect(() => {
        const loadSubjects = async () => {
            if (!selectedProgram) return;
            const res = await fetchSubjects(selectedProgram, selectedSemester || null);
            if (res.data) {
                setSubjects(res.data);
            } else if (res.error) {
                console.error('Failed to fetch subjects:', res.error);
            }
        };
        loadSubjects();
    }, [selectedProgram, selectedSemester]);

    // Fetch grades when subject or page changes
    const loadGrades = useCallback(async () => {
        if (!selectedSubject) return;

        setLoading(true);
        setFetchError(null);
        setSuccess(null);

        try {
            if (selectedSubject === 'all') {
                const res = await fetchGradeData(selectedProgram, null);
                if (res.data) {
                    processGradesData(res.data);
                } else if (res.error) {
                    setFetchError(res.error);
                }
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
            setTimeout(() => setSuccess(null), 3500);
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
        if (weight === 0) return 'text-slate-400';
        const percent = (score / weight) * 100;
        if (percent >= 90) return 'text-emerald-600';
        if (percent >= 60) return 'text-indigo-600';
        return 'text-rose-600';
    };

    // Skeleton loader component
    const SkeletonTable = () => (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 animate-pulse flex space-x-6">
                <div className="h-4 bg-slate-200 rounded-full w-1/4"></div>
                <div className="h-4 bg-slate-200 rounded-full w-1/4"></div>
                <div className="h-4 bg-slate-200 rounded-full w-1/4"></div>
            </div>
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="p-6 border-b border-slate-50 animate-pulse flex space-x-6 items-center">
                    <div className="h-10 w-10 bg-slate-200 rounded-full shrink-0"></div>
                    <div className="h-12 bg-slate-100 rounded-xl w-full"></div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900 font-sans pb-20">
            <div className="mx-auto max-w-[1600px] px-6 py-6">

                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600/10 flex items-center justify-center">
                            <BookOpen className="text-indigo-600" size={20} />
                        </div>
                        <div>
                            <div className="text-xs font-semibold tracking-wide text-indigo-600 uppercase">
                                Data Mining • Enterprise
                            </div>
                            <div className="text-2xl font-semibold text-slate-900 leading-none mt-1">Gradebook</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedSubject && enrollments.length > 0 && (
                            <>
                                <button
                                    onClick={() => setShowImport(true)}
                                    className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm flex items-center gap-2 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                                >
                                    <Upload size={16} />
                                    Import
                                </button>
                                <button
                                    onClick={handleSaveGrades}
                                    disabled={saving || hasValidationErrors() || showWeightWarning}
                                    className={`h-10 px-4 font-semibold rounded-xl text-sm flex items-center gap-2 transition-all duration-200
                                        ${(saving || hasValidationErrors() || showWeightWarning)
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'}`}
                                >
                                    {saving ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Save size={16} />
                                    )}
                                    {saving ? 'Saving...' : 'Save Grades'}
                                </button>
                            </>
                        )}
                        <button
                            className={`h-10 w-10 rounded-xl border flex items-center justify-center transition-colors
                                ${showFilters ? 'border-indigo-200 bg-indigo-50 text-indigo-600' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                            onClick={() => setShowFilters(!showFilters)}
                            title="Toggle Filters"
                        >
                            <Filter size={18} />
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                {showFilters && (
                    <div className="mt-5 grid grid-cols-12 gap-3">
                        <select
                            className="col-span-12 md:col-span-4 h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-shadow cursor-pointer"
                            value={selectedProgram}
                            onChange={(e) => { setSelectedProgram(e.target.value); setSelectedSemester(''); setSelectedSubject(''); setPage(1); }}
                        >
                            <option value="">Select Program...</option>
                            {programs.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                            ))}
                        </select>

                        <select
                            className="col-span-12 md:col-span-3 h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            value={selectedSemester}
                            onChange={(e) => { setSelectedSemester(e.target.value); setSelectedSubject(''); setPage(1); }}
                            disabled={!selectedProgram}
                        >
                            <option value="">Target Semester…</option>
                            {semesters.map(s => (
                                <option key={s} value={s}>Semester {s}</option>
                            ))}
                        </select>

                        <select
                            className="col-span-12 md:col-span-3 h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            value={selectedSubject}
                            onChange={(e) => { setSelectedSubject(e.target.value); setPage(1); }}
                            disabled={!selectedProgram}
                        >
                            <option value="">Select Subject…</option>
                            {selectedProgram && <option value="all">All Subjects</option>}
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                            ))}
                        </select>

                        <div className="col-span-12 md:col-span-2 relative">
                            <input
                                type="text"
                                placeholder="Student lookup…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={!selectedSubject}
                                className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-4 pr-10 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                                <Search size={16} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Overlays / Alerts */}
                {showImport && (
                    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm shadow-2xl overflow-hidden animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-200 relative animate-in zoom-in-95 duration-300 shadow-2xl">
                            <button
                                onClick={() => { setShowImport(false); loadGrades(); }}
                                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 transition-colors bg-slate-50 rounded-lg hover:bg-slate-100 z-10"
                            >
                                <X size={20} />
                            </button>
                            <GradeImport programId={selectedProgram || null} subjectId={selectedSubject || null} />
                        </div>
                    </div>
                )}

                {fetchError && (
                    <div className="mt-5 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 animate-in fade-in">
                        <AlertTriangle size={18} className="text-rose-600 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-rose-900">Retrieval Failed</h4>
                            <p className="text-sm text-rose-700 mt-1">{fetchError}</p>
                        </div>
                        <button onClick={loadGrades} className="text-sm font-medium text-rose-700 bg-rose-100 hover:bg-rose-200 px-3 py-1.5 rounded-lg transition-colors">Retry Connection</button>
                    </div>
                )}

                {saveError && (
                    <div className="mt-5 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 animate-in fade-in">
                        <AlertTriangle size={18} className="text-rose-600 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-semibold text-rose-900">Commit Failed</h4>
                            <p className="text-sm text-rose-700 mt-1">{saveError}</p>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300">
                        <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400">
                            <Check size={16} />
                        </div>
                        <p className="font-medium text-sm pr-2">Grades saved successfully.</p>
                    </div>
                )}

                {selectedSubject && selectedSubject !== 'all' && showWeightWarning && !loading && (
                    <div className="mt-5 p-4 bg-amber-50 rounded-xl flex items-start border border-amber-200 gap-3 shadow-sm animate-in fade-in">
                        <AlertCircle size={18} className="text-amber-600 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-amber-900">Weight Calibration Warning</h4>
                            <p className="text-sm text-amber-700 mt-1">
                                Criteria weights sum to <strong className="font-semibold text-amber-900">{weightSum}%</strong> instead of 100%. Final calculations may be inaccurate.
                            </p>
                        </div>
                    </div>
                )}

                {/* Content Area */}
                {loading ? (
                    <SkeletonTable />
                ) : !selectedSubject ? (
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 min-h-[420px] flex items-center justify-center shadow-sm">
                        <div className="max-w-md text-center">
                            <div className="mx-auto h-14 w-14 rounded-2xl bg-indigo-600/10 flex items-center justify-center">
                                <Command className="text-indigo-600" size={28} />
                            </div>
                            <h2 className="mt-4 text-xl font-semibold text-slate-900">Select context</h2>
                            <p className="mt-2 text-slate-600">
                                Choose a program, semester, and subject above to manage student grades.
                            </p>
                            {!selectedProgram && (
                                <button
                                    onClick={() => document.querySelector('select')?.focus()}
                                    className="mt-6 h-10 rounded-xl bg-indigo-600 px-5 font-semibold text-white hover:bg-indigo-700 transition-colors inline-block"
                                >
                                    Select Program
                                </button>
                            )}
                        </div>
                    </div>
                ) : enrollments.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 min-h-[420px] flex items-center justify-center shadow-sm">
                        <div className="max-w-md text-center">
                            <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <Users className="text-slate-400" size={28} />
                            </div>
                            <h2 className="mt-4 text-xl font-semibold text-slate-900">No Roster Found</h2>
                            <p className="mt-2 text-slate-600">
                                There are no active enrollments currently registered for this subject.
                            </p>
                        </div>
                    </div>
                ) : selectedSubject === 'all' ? (
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 min-h-[420px] flex items-center justify-center shadow-sm">
                        <div className="max-w-md text-center">
                            <div className="mx-auto h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                <Info className="text-indigo-500" size={28} />
                            </div>
                            <h2 className="mt-4 text-xl font-semibold text-slate-900">Subject Required</h2>
                            <p className="mt-2 text-slate-600">
                                Please target a specific subject down to the leaf node for bulk grade entry.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                        <div className="flex bg-white border-b border-slate-200 p-4 items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="px-2.5 py-1 bg-slate-100 text-[11px] font-semibold text-slate-600 rounded-md">
                                    {enrollments.length} Active Records
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr>
                                        <th className="px-5 py-4 bg-slate-50 sticky left-0 z-20 border-b border-r border-slate-200 min-w-[280px]">
                                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Student Name</span>
                                        </th>
                                        {criteria.map((c, i) => (
                                            <th key={c.id} className="px-5 py-4 bg-slate-50 border-b border-r border-slate-200 min-w-[320px] align-top">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-semibold text-slate-800">{c.component_name}</span>
                                                    <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                        W: {parseFloat(c.weight_percentage)}%
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-500">Max mark: {c.max_marks}</div>
                                            </th>
                                        ))}
                                        <th className="px-5 py-4 bg-slate-50 border-b border-slate-200 min-w-[150px] text-right">
                                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Calculated %</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {enrollments
                                        .filter(e => {
                                            if (!searchQuery) return true;
                                            const q = searchQuery.toLowerCase();
                                            return e.student_name.toLowerCase().includes(q) || String(e.student_id).toLowerCase().includes(q);
                                        })
                                        .map((enrollment, idx) => {
                                            const totalScore = getTotalWeightedScore(enrollment.id);
                                            const totalColor = getScoreColor(totalScore, weightSum);

                                            return (
                                                <tr key={enrollment.id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-5 py-4 sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-100 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold text-sm">
                                                                {toSentenceCase(enrollment.student_name).charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-slate-900 text-sm leading-tight">{toSentenceCase(enrollment.student_name)}</div>
                                                                <div className="text-xs text-slate-500 mt-0.5">{enrollment.student_id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {criteria.map(c => {
                                                        const liveScore = getLiveWeightedScore(enrollment.id, c.id);
                                                        const hasError = gradeErrors[enrollment.id]?.[c.id];

                                                        return (
                                                            <td key={c.id} className="px-5 py-4 border-r border-slate-100 align-top relative">
                                                                <div className="flex items-start gap-4">
                                                                    <div className="flex-1 space-y-2">
                                                                        <div className="relative">
                                                                            <input
                                                                                type="number"
                                                                                placeholder="0.00"
                                                                                value={grades[enrollment.id]?.[c.id] ?? ''}
                                                                                onChange={(e) => updateGrade(enrollment.id, c.id, e.target.value)}
                                                                                onBlur={(e) => {
                                                                                    const clamped = clampGradeValue(e.target.value, c.max_marks);
                                                                                    updateGrade(enrollment.id, c.id, clamped);
                                                                                }}
                                                                                min="0"
                                                                                max={c.max_marks}
                                                                                step="0.01"
                                                                                className={`w-full h-10 rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 
                                                                                ${hasError ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'} transition-shadow`}
                                                                            />
                                                                        </div>

                                                                        <div className="relative">
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Feedback (optional)..."
                                                                                value={remarks[enrollment.id]?.[c.id] || ''}
                                                                                onChange={(e) => setRemarks(prev => ({ ...prev, [enrollment.id]: { ...prev[enrollment.id], [c.id]: e.target.value } }))}
                                                                                className="w-full bg-transparent border-none text-xs text-slate-500 placeholder-slate-400 focus:ring-0 p-0 focus:text-slate-900"
                                                                            />
                                                                        </div>

                                                                        {hasError && (
                                                                            <div className="text-xs text-rose-600 font-medium">
                                                                                {gradeErrors[enrollment.id][c.id]}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="w-14 shrink-0 flex flex-col items-end pt-2">
                                                                        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Yield</span>
                                                                        <span className="text-sm font-semibold text-slate-700 mt-0.5">
                                                                            {liveScore.toFixed(1)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-5 py-4 align-middle text-right bg-slate-50/50">
                                                        <div className={`text-lg font-bold tabular-nums ${totalColor}`}>
                                                            {totalScore}%
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                </tbody>
                                <tfoot className="bg-slate-50 border-t border-slate-200 sticky bottom-0 z-30">
                                    <tr>
                                        <td colSpan={criteria.length + 2} className="px-5 py-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-slate-600">
                                                        Total Weight Allocated: <span className={showWeightWarning ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}>{weightSum}%</span>
                                                    </span>
                                                </div>

                                                {pagination && pagination.totalPages > 1 && (
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-sm text-slate-500">
                                                            Page {pagination.page} of {pagination.totalPages}
                                                        </span>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                                disabled={pagination.page <= 1}
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
                                                            >
                                                                <ChevronLeft size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                                                disabled={pagination.page >= pagination.totalPages}
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
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

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    height: 10px;
                    width: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 10px;
                    border: 3px solid #f8fafc;
                }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb {
                    background-color: #94a3b8;
                }
            `}} />
        </div>
    );
}

export default GradeManagement;
