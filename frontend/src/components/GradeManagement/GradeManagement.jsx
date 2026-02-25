import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import apiClient from '../../utils/apiClient';
import { fetchSubjectGrades, bulkSaveGrades, fetchGradeData } from '../../services/gradeService';
import { fetchPrograms, fetchSubjects } from '../../services/programService';
import { useAuth } from '../../context/AuthContext';

// Icons
import {
    Save, BookOpen, AlertCircle, AlertTriangle, ChevronLeft, ChevronRight,
    Upload, X, Search, Filter, GraduationCap, LayoutGrid, Users, Check, Info,
    Command, Activity, ChevronDown, BarChart3, Trophy, TrendingUp, Zap,
    ClipboardList, RefreshCw, CheckCircle2
} from 'lucide-react';
import GradeImport from './GradeImport';

const toSentenceCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
};

/* ────── Mini Components ────── */

function StatPill({ label, value, color = 'indigo' }) {
    const colors = {
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-100',
        rose: 'bg-rose-50 text-rose-700 border-rose-100',
        slate: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${colors[color]}`}>
            <span className="opacity-60">{label}</span>
            <span>{value}</span>
        </div>
    );
}

function ScoreBadge({ score, max = 100 }) {
    const pct = max > 0 ? Math.min(100, (score / max) * 100) : 0;
    const color =
        pct >= 90 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
            pct >= 60 ? 'text-indigo-600 bg-indigo-50 border-indigo-200' :
                'text-rose-600 bg-rose-50 border-rose-200';
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-bold tabular-nums ${color}`}>
            {score.toFixed(1)}%
        </span>
    );
}

function ScoreBar({ score, max = 100 }) {
    const pct = max > 0 ? Math.min(100, (score / max) * 100) : 0;
    const barColor =
        pct >= 90 ? 'bg-emerald-500' :
            pct >= 60 ? 'bg-indigo-500' :
                'bg-rose-500';
    return (
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1.5">
            <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

function FilterSelect({ label, value, onChange, disabled, children, icon: Icon }) {
    return (
        <div className="relative flex-1 min-w-0">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                {Icon && <Icon size={14} />}
            </div>
            <select
                className={`w-full h-10 rounded-xl border text-sm font-medium transition-all duration-150 cursor-pointer appearance-none
                    ${Icon ? 'pl-8' : 'pl-3'} pr-8
                    ${disabled
                        ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm'
                    }`}
                value={value}
                onChange={onChange}
                disabled={disabled}
            >
                {children}
            </select>
            <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-slate-400">
                <ChevronDown size={14} />
            </div>
        </div>
    );
}

function GradeInput({ value, onChange, onBlur, min, max, hasError }) {
    return (
        <input
            type="number"
            placeholder="—"
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            min={min}
            max={max}
            step="0.01"
            className={`w-full h-9 rounded-lg border text-sm font-semibold text-center tabular-nums transition-all duration-150
                focus:outline-none focus:ring-2
                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                ${hasError
                    ? 'border-rose-300 bg-rose-50 text-rose-700 focus:ring-rose-400 placeholder:text-rose-300'
                    : 'border-slate-200 bg-white text-slate-800 focus:ring-indigo-400 focus:border-indigo-400 placeholder:text-slate-300 hover:border-indigo-300'
                }`}
        />
    );
}

/* ────── Skeleton Loader ────── */
function SkeletonTable() {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100">
                <div className="animate-pulse flex items-center gap-3">
                    <div className="h-4 bg-slate-200 rounded-full w-32" />
                    <div className="h-4 bg-slate-200 rounded-full w-20" />
                    <div className="h-4 bg-slate-200 rounded-full w-24" />
                </div>
            </div>
            {[...Array(6)].map((_, i) => (
                <div key={i} className="px-5 py-4 border-b border-slate-50 animate-pulse flex gap-4 items-center">
                    <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 bg-slate-200 rounded-full w-2/5" />
                        <div className="h-2 bg-slate-100 rounded-full w-1/5" />
                    </div>
                    <div className="h-9 bg-slate-100 rounded-xl w-28" />
                    <div className="h-9 bg-slate-100 rounded-xl w-28" />
                    <div className="h-9 bg-slate-100 rounded-xl w-28" />
                </div>
            ))}
        </div>
    );
}

/* ────── Empty / Prompt States ────── */
function EmptyState({ icon: Icon, color = 'indigo', title, description, action }) {
    const palette = {
        indigo: { ring: 'bg-indigo-600/10', icon: 'text-indigo-500', btn: 'bg-indigo-600 hover:bg-indigo-700' },
        slate: { ring: 'bg-slate-100', icon: 'text-slate-400', btn: 'bg-slate-700 hover:bg-slate-800' },
        amber: { ring: 'bg-amber-50', icon: 'text-amber-500', btn: 'bg-amber-600 hover:bg-amber-700' },
    };
    const p = palette[color];
    return (
        <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
            <div className={`w-16 h-16 rounded-2xl ${p.ring} flex items-center justify-center mb-5 shadow-inner`}>
                <Icon className={p.icon} size={32} />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">{title}</h2>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">{description}</p>
            {action && (
                <button
                    onClick={action.onClick}
                    className={`mt-6 h-10 px-6 rounded-xl font-semibold text-sm text-white transition-colors ${p.btn}`}
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}

/* ────── Main Component ────── */
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

    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [pagination, setPagination] = useState(null);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [fetchError, setFetchError] = useState(null);
    const [saveError, setSaveError] = useState(null);
    const [success, setSuccess] = useState(null);

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
            if (urlSubject === 'all' || urlStudentName) setSelectedSubject('all');
        }
    }, [searchParams]);

    useEffect(() => {
        const loadPrograms = async () => {
            const res = await fetchPrograms();
            if (res.data) {
                setPrograms(res.data);
                if (!selectedProgram && res.data.length > 0) setSelectedProgram(res.data[0].id.toString());
            } else if (res.error) {
                setFetchError('Failed to load programs: ' + res.error);
            }
        };
        loadPrograms();
    }, []);

    useEffect(() => {
        const loadSubjects = async () => {
            if (!selectedProgram) return;
            const res = await fetchSubjects(selectedProgram, selectedSemester || null);
            if (res.data) setSubjects(res.data);
        };
        loadSubjects();
    }, [selectedProgram, selectedSemester]);

    const loadGrades = useCallback(async () => {
        if (!selectedSubject) return;
        setLoading(true);
        setFetchError(null);
        setSuccess(null);
        try {
            if (selectedSubject === 'all') {
                const res = await fetchGradeData(selectedProgram, null);
                if (res.data) processGradesData(res.data);
                else if (res.error) setFetchError(res.error);
            } else {
                const data = await fetchSubjectGrades(selectedSubject, page, limit);
                processGradesData(data);
            }
        } catch (err) {
            setFetchError(err.message || 'Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [selectedSubject, selectedProgram, selectedSemester, page, limit]);

    useEffect(() => { loadGrades(); }, [loadGrades]);

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
                const eg = enrollment.grades?.find(g => String(g.criteria_id) === String(c.id));
                gradesObj[enrollment.id][c.id] = (eg?.marks_obtained !== undefined && eg?.marks_obtained !== null) ? eg.marks_obtained : '';
                remarksObj[enrollment.id][c.id] = eg?.remarks || '';
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

        setGrades(prev => ({ ...prev, [enrollmentId]: { ...prev[enrollmentId], [criteriaId]: value } }));
        setGradeErrors(prev => ({ ...prev, [enrollmentId]: { ...prev[enrollmentId], [criteriaId]: errorMsg } }));
    };

    const clampGradeValue = (value, maxMarks) => {
        if (value === '' || value === null || value === undefined) return '';
        let num = Number(value);
        if (Number.isNaN(num)) return '';
        if (num < 0) num = 0;
        if (maxMarks !== null && num > Number(maxMarks)) num = Number(maxMarks);
        return num;
    };

    const hasValidationErrors = () =>
        Object.values(gradeErrors).some(errs => Object.values(errs).some(Boolean));

    const handleSaveGrades = async () => {
        if (hasValidationErrors()) { setSaveError('Please fix invalid marks before saving.'); return; }
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
                            remarks: remark || null,
                        });
                    }
                });
            });
            await bulkSaveGrades(selectedSubject, gradesData);
            setSuccess('Grades saved successfully!');
            setTimeout(() => setSuccess(null), 3500);
            await loadGrades();
        } catch (err) {
            setSaveError(err.message || 'Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // Derived state
    const currentProgram = programs.find(p => p.id.toString() === selectedProgram);
    const semesters = currentProgram ? Array.from({ length: currentProgram.total_semesters }, (_, i) => i + 1) : [];
    const weightSum = criteria.reduce((sum, c) => sum + parseFloat(c.weight_percentage), 0);
    const showWeightWarning = criteria.length > 0 && Math.abs(weightSum - 100) > 0.01;

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
        return total;
    };

    const getGradeLevel = (score) => {
        if (score >= 90) return { label: 'A+', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
        if (score >= 80) return { label: 'A', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
        if (score >= 70) return { label: 'B', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
        if (score >= 60) return { label: 'C', color: 'text-sky-600 bg-sky-50 border-sky-200' };
        if (score >= 40) return { label: 'D', color: 'text-amber-600 bg-amber-50 border-amber-200' };
        return { label: 'F', color: 'text-rose-600 bg-rose-50 border-rose-200' };
    };

    // Stats
    const filteredEnrollments = enrollments.filter(e => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return e.student_name.toLowerCase().includes(q) || String(e.student_id).toLowerCase().includes(q);
    });

    const hasGrades = () => Object.values(grades).some(cGrades => Object.values(cGrades).some(v => v !== '' && v !== null));

    const avgScore = filteredEnrollments.length > 0
        ? filteredEnrollments.reduce((sum, e) => sum + getTotalWeightedScore(e.id), 0) / filteredEnrollments.length
        : 0;
    const passCount = filteredEnrollments.filter(e => getTotalWeightedScore(e.id) >= 40).length;

    const canSave = selectedSubject && selectedSubject !== 'all' && enrollments.length > 0 && !saving && !hasValidationErrors() && !showWeightWarning;

    return (
        <div className="bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 font-sans pb-8 selection:bg-indigo-100 selection:text-indigo-900">
            <div className="mx-auto max-w-[1680px] px-6 py-6 space-y-5">

                {/* ── Page Header ── */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <BookOpen className="text-white" size={22} />
                            </div>
                            <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                                <div className="h-1.5 w-1.5 bg-white rounded-full" />
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold tracking-[0.15em] text-indigo-500 uppercase mb-0.5">
                                Data Mining • Enterprise
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 leading-none">Gradebook</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        {selectedSubject && selectedSubject !== 'all' && enrollments.length > 0 && (
                            <>
                                <button
                                    onClick={() => setShowImport(true)}
                                    className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 font-semibold text-sm flex items-center gap-2
                                               hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-150 shadow-sm"
                                >
                                    <Upload size={15} />
                                    Import
                                </button>
                                <button
                                    onClick={handleSaveGrades}
                                    disabled={!canSave}
                                    className={`h-10 px-5 font-semibold rounded-xl text-sm flex items-center gap-2 transition-all duration-200 shadow-sm
                                        ${canSave
                                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 hover:shadow-md hover:shadow-indigo-200 active:scale-[0.98]'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                        }`}
                                >
                                    {saving ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Save size={15} />
                                    )}
                                    {saving ? 'Saving…' : 'Save Grades'}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* ── Filter Toolbar Card ── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5 shrink-0 mr-1">
                            <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                                <Filter size={12} className="text-indigo-500" />
                            </div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filters</span>
                        </div>

                        <div className="h-5 w-px bg-slate-200 shrink-0" />

                        {/* Program */}
                        <FilterSelect
                            value={selectedProgram}
                            onChange={(e) => { setSelectedProgram(e.target.value); setSelectedSemester(''); setSelectedSubject(''); setPage(1); }}
                            icon={GraduationCap}
                        >
                            <option value="">Select Program…</option>
                            {programs.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                            ))}
                        </FilterSelect>

                        {/* Semester */}
                        <FilterSelect
                            value={selectedSemester}
                            onChange={(e) => { setSelectedSemester(e.target.value); setSelectedSubject(''); setPage(1); }}
                            disabled={!selectedProgram}
                            icon={BarChart3}
                        >
                            <option value="">Target Semester…</option>
                            {semesters.map(s => (
                                <option key={s} value={s}>Semester {s}</option>
                            ))}
                        </FilterSelect>

                        {/* Subject */}
                        <FilterSelect
                            value={selectedSubject}
                            onChange={(e) => { setSelectedSubject(e.target.value); setPage(1); }}
                            disabled={!selectedProgram}
                            icon={BookOpen}
                        >
                            <option value="">Select Subject…</option>
                            {selectedProgram && <option value="all">All Subjects</option>}
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                            ))}
                        </FilterSelect>

                        {/* Search */}
                        <div className="relative flex-1 min-w-[160px]">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                                <Search size={14} />
                            </div>
                            <input
                                type="text"
                                placeholder="Student lookup…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={!selectedSubject}
                                className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400
                                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm
                                           disabled:opacity-50 disabled:cursor-not-allowed hover:border-indigo-300 transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Live stats pills (shown when data loaded) */}
                        {enrollments.length > 0 && (
                            <div className="flex items-center gap-2 ml-auto shrink-0">
                                <StatPill label="Students" value={filteredEnrollments.length} color="slate" />
                                {hasGrades() && (
                                    <>
                                        <StatPill label="Avg" value={`${avgScore.toFixed(1)}%`} color={avgScore >= 60 ? 'emerald' : 'rose'} />
                                        <StatPill label="Passing" value={passCount} color="indigo" />
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Alerts ── */}
                {fetchError && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                            <AlertTriangle size={16} className="text-rose-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-rose-900">Retrieval Failed</h4>
                            <p className="text-sm text-rose-700 mt-0.5">{fetchError}</p>
                        </div>
                        <button
                            onClick={loadGrades}
                            className="shrink-0 flex items-center gap-1.5 text-sm font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <RefreshCw size={13} />
                            Retry
                        </button>
                    </div>
                )}

                {saveError && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 animate-in fade-in duration-200">
                        <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                            <AlertTriangle size={16} className="text-rose-600" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-rose-900">Save Failed</h4>
                            <p className="text-sm text-rose-700 mt-0.5">{saveError}</p>
                        </div>
                        <button onClick={() => setSaveError(null)} className="text-rose-400 hover:text-rose-600">
                            <X size={16} />
                        </button>
                    </div>
                )}

                {showWeightWarning && !loading && selectedSubject && selectedSubject !== 'all' && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 animate-in fade-in duration-200">
                        <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                            <AlertCircle size={16} className="text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-amber-900">Weight Calibration Warning</h4>
                            <p className="text-sm text-amber-700 mt-0.5">
                                Criteria weights sum to <strong>{weightSum.toFixed(1)}%</strong> instead of 100%.
                                Saving is blocked until this is corrected in Subject settings.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Content Area ── */}
                {loading ? (
                    <SkeletonTable />
                ) : !selectedSubject ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 backdrop-blur-sm">
                        <EmptyState
                            icon={ClipboardList}
                            color="indigo"
                            title="Select context to begin"
                            description="Choose a program, semester, and subject from the filter bar above to load and manage student grades."
                            action={!selectedProgram ? { label: 'Pick a Program', onClick: () => { } } : undefined}
                        />
                    </div>
                ) : enrollments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70">
                        <EmptyState
                            icon={Users}
                            color="slate"
                            title="No roster found"
                            description="There are no active enrollments registered for this subject yet."
                        />
                    </div>
                ) : selectedSubject === 'all' ? (
                    <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40">
                        <EmptyState
                            icon={Info}
                            color="amber"
                            title="Specific subject required"
                            description="Please select a specific subject from the dropdown to begin bulk grade entry for that subject."
                        />
                    </div>
                ) : (
                    /* ── Grade Table ── */
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">

                        {/* Table toolbar */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Roster</span>
                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold">
                                    {filteredEnrollments.length} of {enrollments.length}
                                </span>
                                <span className="text-xs text-slate-400">{criteria.length} criteria</span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> ≥ 90%
                                </span>
                                <span className="flex items-center gap-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" /> ≥ 60%
                                </span>
                                <span className="flex items-center gap-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400" /> &lt; 60%
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto gm-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        {/* Sticky student column */}
                                        <th className="px-5 py-3.5 sticky left-0 z-20 bg-slate-50 border-r border-slate-200 min-w-[240px]">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Student</span>
                                        </th>

                                        {criteria.map((c) => (
                                            <th key={c.id} className="px-4 py-3.5 border-r border-slate-200 min-w-[220px] align-top">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold text-slate-800 truncate">{c.component_name}</div>
                                                        <div className="text-[11px] text-slate-500 mt-0.5">Max: <strong className="text-slate-700">{c.max_marks}</strong></div>
                                                    </div>
                                                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-bold text-indigo-600 tabular-nums">
                                                        {parseFloat(c.weight_percentage)}%
                                                    </span>
                                                </div>
                                            </th>
                                        ))}

                                        <th className="px-5 py-3.5 bg-slate-50 min-w-[140px] text-right">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Final Score</span>
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {filteredEnrollments.map((enrollment, idx) => {
                                        const totalScore = getTotalWeightedScore(enrollment.id);
                                        const grade = getGradeLevel(totalScore);

                                        return (
                                            <tr
                                                key={enrollment.id}
                                                className="group hover:bg-slate-50/70 transition-colors duration-100"
                                            >
                                                {/* Student cell */}
                                                <td className="px-5 py-3.5 sticky left-0 z-10 bg-white group-hover:bg-slate-50/70 border-r border-slate-100 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                                            {toSentenceCase(enrollment.student_name).charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-semibold text-slate-800 text-sm truncate leading-tight">
                                                                {toSentenceCase(enrollment.student_name)}
                                                            </div>
                                                            <div className="text-xs text-slate-400 mt-0.5 font-mono">
                                                                #{enrollment.student_id}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Criteria grade cells */}
                                                {criteria.map(c => {
                                                    const liveScore = getLiveWeightedScore(enrollment.id, c.id);
                                                    const hasError = gradeErrors[enrollment.id]?.[c.id];
                                                    const mark = grades[enrollment.id]?.[c.id];
                                                    const markPct = mark !== '' && mark !== null && !isNaN(mark)
                                                        ? Math.min(100, (parseFloat(mark) / parseFloat(c.max_marks)) * 100)
                                                        : 0;

                                                    return (
                                                        <td key={c.id} className="px-4 py-3.5 border-r border-slate-100 align-top">
                                                            <div className="flex items-start gap-3">
                                                                <div className="flex-1 space-y-1.5">
                                                                    {/* Grade input */}
                                                                    <GradeInput
                                                                        value={grades[enrollment.id]?.[c.id] ?? ''}
                                                                        onChange={(e) => updateGrade(enrollment.id, c.id, e.target.value)}
                                                                        onBlur={(e) => {
                                                                            const clamped = clampGradeValue(e.target.value, c.max_marks);
                                                                            updateGrade(enrollment.id, c.id, clamped);
                                                                        }}
                                                                        min={0}
                                                                        max={c.max_marks}
                                                                        hasError={hasError}
                                                                    />

                                                                    {/* Progress bar */}
                                                                    {mark !== '' && mark !== null && !isNaN(mark) && (
                                                                        <ScoreBar score={markPct} max={100} />
                                                                    )}

                                                                    {/* Remark field */}
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Feedback…"
                                                                        value={remarks[enrollment.id]?.[c.id] || ''}
                                                                        onChange={(e) => setRemarks(prev => ({
                                                                            ...prev,
                                                                            [enrollment.id]: { ...prev[enrollment.id], [c.id]: e.target.value }
                                                                        }))}
                                                                        className="w-full bg-transparent border-none text-[11px] text-slate-400 placeholder:text-slate-300 focus:outline-none focus:text-slate-600 p-0 truncate"
                                                                    />

                                                                    {hasError && (
                                                                        <div className="text-[10px] text-rose-500 font-semibold">
                                                                            ⚠ {gradeErrors[enrollment.id][c.id]}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Per-criteria contribution */}
                                                                <div className="shrink-0 flex flex-col items-end pt-1.5 min-w-[36px]">
                                                                    <span className="text-[9px] uppercase font-bold text-slate-300 tracking-widest">yield</span>
                                                                    <span className={`text-xs font-bold mt-0.5 tabular-nums ${liveScore >= c.weight_percentage * 0.9 ? 'text-emerald-600' :
                                                                            liveScore >= c.weight_percentage * 0.6 ? 'text-indigo-600' : 'text-rose-500'
                                                                        }`}>
                                                                        {liveScore.toFixed(1)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    );
                                                })}

                                                {/* Total score cell */}
                                                <td className="px-5 py-3.5 align-middle bg-slate-50/40 group-hover:bg-slate-100/60 transition-colors">
                                                    <div className="flex flex-col items-end gap-1.5">
                                                        <span className={`text-xl font-bold tabular-nums ${totalScore >= 90 ? 'text-emerald-600' :
                                                                totalScore >= 60 ? 'text-indigo-600' : 'text-rose-600'
                                                            }`}>
                                                            {totalScore.toFixed(1)}%
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${grade.color}`}>
                                                            {grade.label}
                                                        </span>
                                                        <ScoreBar score={totalScore} max={weightSum || 100} />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>

                                {/* Sticky footer */}
                                <tfoot className="sticky bottom-0 z-20">
                                    <tr className="bg-white border-t border-slate-200">
                                        <td colSpan={criteria.length + 2} className="px-5 py-3">
                                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-medium text-slate-500">
                                                        Weight total:
                                                        <span className={`ml-1.5 font-bold ${showWeightWarning ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                            {weightSum.toFixed(1)}%
                                                        </span>
                                                    </span>
                                                    {!showWeightWarning && (
                                                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                                                            <CheckCircle2 size={12} />
                                                            Calibrated
                                                        </span>
                                                    )}
                                                    {hasGrades() && (
                                                        <span className="text-xs text-slate-400">
                                                            Class avg: <strong className="text-slate-600">{avgScore.toFixed(1)}%</strong>
                                                        </span>
                                                    )}
                                                </div>

                                                {pagination && pagination.totalPages > 1 && (
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm text-slate-500">
                                                            Page {pagination.page} / {pagination.totalPages}
                                                        </span>
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                                disabled={pagination.page <= 1}
                                                                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 transition-colors"
                                                            >
                                                                <ChevronLeft size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                                                disabled={pagination.page >= pagination.totalPages}
                                                                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 transition-colors"
                                                            >
                                                                <ChevronRight size={15} />
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

            {/* ── Import Modal ── */}
            {showImport && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-200 relative shadow-2xl animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => { setShowImport(false); loadGrades(); }}
                            className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                        >
                            <X size={18} />
                        </button>
                        <GradeImport programId={selectedProgram || null} subjectId={selectedSubject || null} />
                    </div>
                </div>
            )}

            {/* ── Success Toast ── */}
            {success && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/30 animate-in slide-in-from-bottom-4 fade-in duration-300 border border-white/10">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/30 flex items-center justify-center">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                    </div>
                    <div>
                        <div className="font-semibold text-sm">Grades Saved</div>
                        <div className="text-xs text-slate-400">All changes committed successfully.</div>
                    </div>
                </div>
            )}

            {/* Scrollbar styling */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .gm-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
                .gm-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .gm-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; border: 2px solid #f8fafc; }
                .gm-scrollbar:hover::-webkit-scrollbar-thumb { background: #94a3b8; }
                .gm-scrollbar { scrollbar-width: thin; scrollbar-color: #cbd5e1 #f8fafc; }
            `}} />
        </div>
    );
}

export default GradeManagement;
