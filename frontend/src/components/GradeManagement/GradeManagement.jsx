import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { fetchSubjectGrades, bulkSaveGrades, fetchGradeData, fetchDataQuality } from '../../services/gradeService';
import { fetchPrograms, fetchSubjects } from '../../services/programService';
import { useAuth } from '../../context/AuthContext';

import {
    Save, BookOpen, AlertCircle, AlertTriangle, ChevronLeft, ChevronRight,
    Upload, X, Search, Filter, GraduationCap, Users, Info,
    ChevronDown, BarChart3, Trophy, TrendingUp, Zap,
    ClipboardList, RefreshCw, CheckCircle2, MessageSquare, ShieldCheck, ShieldAlert,
    FileWarning, ArrowUpDown, PieChart, Target, Command
} from 'lucide-react';
import GradeImport from './GradeImport';
import './GradeManagement.css';

const toSentenceCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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

    const [dataQuality, setDataQuality] = useState(null);
    const [showStatsPanel, setShowStatsPanel] = useState(false);
    const [gradeFilter, setGradeFilter] = useState('all');
    const [sortField, setSortField] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [showFeedback, setShowFeedback] = useState({});

    // URL Sync
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            const p = searchParams.get('program_id');
            const s = searchParams.get('semester');
            const n = searchParams.get('student_name');
            const sub = searchParams.get('subject');
            if (p) setSelectedProgram(p);
            if (s) setSelectedSemester(s);
            if (n) setSearchQuery(decodeURIComponent(n));
            if (sub === 'all' || n) setSelectedSubject('all');
        }
    }, [searchParams]);

    // Data Loading
    useEffect(() => {
        (async () => {
            const res = await fetchPrograms();
            if (res.data) {
                setPrograms(res.data);
                if (!selectedProgram && res.data.length > 0) setSelectedProgram(res.data[0].id.toString());
            } else if (res.error) setFetchError('Failed to load programs: ' + res.error);
        })();
    }, []);

    useEffect(() => {
        if (!selectedProgram) return;
        (async () => {
            const res = await fetchSubjects(selectedProgram, selectedSemester || null);
            if (res.data) setSubjects(res.data);
        })();
    }, [selectedProgram, selectedSemester]);

    const processGradesData = (data) => {
        const enrs = data.enrollments || [];
        const crits = data.criteria || [];
        setEnrollments(enrs);
        setCriteria(crits);
        setGradeErrors({});
        setPagination(data.pagination || null);

        const g = {}, r = {};
        enrs.forEach(e => {
            g[e.id] = {}; r[e.id] = {};
            crits.forEach(c => {
                const eg = e.grades?.find(x => String(x.criteria_id) === String(c.id));
                g[e.id][c.id] = eg?.marks_obtained ?? '';
                r[e.id][c.id] = (eg?.remarks || '').replace(/\s*\[Auto-clamped from.*?\]/g, '').trim();
            });
        });
        setGrades(g); setRemarks(r);
    };

    const loadGrades = useCallback(async () => {
        if (!selectedSubject) return;
        setLoading(true); setFetchError(null); setSuccess(null);
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
            setFetchError(err.message || 'Network error.');
        } finally { setLoading(false); }
    }, [selectedSubject, selectedProgram, selectedSemester, page, limit]);

    useEffect(() => { loadGrades(); }, [loadGrades]);

    useEffect(() => {
        if (selectedSubject && selectedSubject !== 'all') {
            fetchDataQuality(selectedSubject).then(res => { if (res.data) setDataQuality(res.data); });
        } else setDataQuality(null);
    }, [selectedSubject, success]);

    // Helpers
    const updateGrade = (eId, cId, value) => {
        const max = criteria.find(c => String(c.id) === String(cId))?.max_marks;
        const n = value === '' ? '' : Number(value);
        let err = null;
        if (n !== '' && isNaN(n)) err = 'Invalid';
        else if (n !== '' && n < 0) err = 'Min 0';
        else if (n !== '' && max !== null && n > max) err = `Max ${max}`;
        setGrades(prev => ({ ...prev, [eId]: { ...prev[eId], [cId]: value } }));
        setGradeErrors(prev => ({ ...prev, [eId]: { ...prev[eId], [cId]: err } }));
    };

    const hasValidationErrors = () => Object.values(gradeErrors).some(e => Object.values(e).some(Boolean));

    const handleSaveGrades = async () => {
        if (hasValidationErrors()) { setSaveError('Fix invalid marks before saving.'); return; }
        setSaving(true); setSaveError(null); setSuccess(null);
        try {
            const data = [];
            Object.entries(grades).forEach(([eId, cGrades]) => {
                Object.entries(cGrades).forEach(([cId, marks]) => {
                    const remark = remarks[eId]?.[cId];
                    if (marks !== '' && marks !== null) {
                        data.push({
                            enrollment_id: parseInt(eId), criteria_id: parseInt(cId),
                            marks_obtained: parseFloat(marks), remarks: remark || null,
                        });
                    }
                });
            });
            await bulkSaveGrades(selectedSubject, data);
            setSuccess('Grades saved!'); setTimeout(() => setSuccess(null), 3000);
            await loadGrades();
        } catch (err) { setSaveError(err.message); } finally { setSaving(false); }
    };

    const getTotalWeightedScore = (eId) => {
        let t = 0;
        criteria.forEach(c => {
            const m = parseFloat(grades[eId]?.[c.id]);
            if (!isNaN(m)) t += (m / parseFloat(c.max_marks)) * parseFloat(c.weight_percentage);
        });
        return t;
    };

    const getGradeLevel = (score) => {
        if (score >= 90) return { label: 'A+', class: 'grade-a' };
        if (score >= 80) return { label: 'A', class: 'grade-a' };
        if (score >= 70) return { label: 'B+', class: 'grade-b' };
        if (score >= 60) return { label: 'B', class: 'grade-b' };
        if (score >= 50) return { label: 'C', class: 'grade-c' };
        if (score >= 40) return { label: 'D', class: 'grade-c' };
        return { label: 'F', class: 'grade-f' };
    };

    const getStudentStatus = (eId) => {
        const sg = grades[eId]; if (!sg) return 'incomplete';
        const v = Object.values(sg);
        if (v.every(x => x === '' || x === null)) return 'pending';
        if (v.some(x => x === '' || x === null)) return 'incomplete';
        return 'valid';
    };

    const avgScore = enrollments.length > 0 ? enrollments.reduce((s, e) => s + getTotalWeightedScore(e.id), 0) / enrollments.length : 0;
    const canSave = selectedSubject && selectedSubject !== 'all' && enrollments.length > 0 && !saving && !hasValidationErrors();

    /* ═══════════════════════════════════════════ */
    return (
        <div className="gm-root">
            <div className="gm-container">

                {/* ── Header ── */}
                <div className="gm-header">
                    <div className="gm-header-left">
                        <div className="gm-icon-box">
                            <BookOpen size={24} color="white" />
                        </div>
                        <div className="gm-title-group">
                            <span className="gm-subtitle">Academic Records</span>
                            <h1 className="gm-title">Gradebook</h1>
                        </div>
                    </div>
                    <div className="gm-header-actions">
                        {selectedSubject && selectedSubject !== 'all' && (
                            <>
                                <button className="gm-btn gm-btn-outline" onClick={() => setShowImport(true)}>
                                    <Upload size={16} /> Import Data
                                </button>
                                <button className="gm-btn gm-btn-primary" onClick={handleSaveGrades} disabled={!canSave}>
                                    {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                                    {saving ? 'Processing...' : 'Save Changes'}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* ── Filter Card ── */}
                <div className="gm-filter-card">
                    <div className="gm-filter-group">
                        <div className="gm-select-wrapper">
                            <div className="gm-input-icon"><GraduationCap size={18} /></div>
                            <select className="gm-select" value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)}>
                                <option value="">Select Program...</option>
                                {programs.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                            </select>
                            <div className="gm-chevron"><ChevronDown size={16} /></div>
                        </div>
                    </div>
                    <div className="gm-filter-group">
                        <div className="gm-select-wrapper">
                            <div className="gm-input-icon"><BarChart3 size={18} /></div>
                            <select className="gm-select" value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}>
                                <option value="">Semester...</option>
                                {[...Array(8)].map((_, i) => <option key={i + 1} value={i + 1}>Semester {i + 1}</option>)}
                            </select>
                            <div className="gm-chevron"><ChevronDown size={16} /></div>
                        </div>
                    </div>
                    <div className="gm-filter-group" style={{ flex: 1.5 }}>
                        <div className="gm-select-wrapper">
                            <div className="gm-input-icon"><BookOpen size={18} /></div>
                            <select className="gm-select" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                                <option value="">Select Subject...</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                            </select>
                            <div className="gm-chevron"><ChevronDown size={16} /></div>
                        </div>
                    </div>
                    <div className="gm-search-wrapper">
                        <div className="gm-input-icon"><Search size={18} /></div>
                        <input className="gm-search-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search student name or ID..." />
                    </div>
                </div>

                {/* ── Data Quality & Scale ── */}
                {selectedSubject && !loading && (
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div className="gm-filter-card" style={{ flex: 1 }}>
                            <div className="gm-table-title" style={{ fontSize: '0.8rem' }}><ShieldCheck size={16} /> Data Completion</div>
                            <div className="gm-quality-badge-group">
                                <span className="gm-quality-pill gm-quality-valid"><CheckCircle2 size={14} /> Valid</span>
                                <span className="gm-quality-pill gm-quality-incomplete"><FileWarning size={14} /> Incomplete</span>
                            </div>
                        </div>
                        <div className="gm-scale-ref" style={{ flex: 2 }}>
                            <span className="gm-subtitle" style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Grading Schema</span>
                            {[
                                { g: 'A+', c: '#10b981' }, { g: 'A', c: '#10b981' }, { g: 'B+', c: '#6366f1' },
                                { g: 'B', c: '#6366f1' }, { g: 'C', c: '#f59e0b' }, { g: 'F', c: '#ef4444' }
                            ].map(x => (
                                <span key={x.g} className="gm-scale-tag" style={{ color: x.c }}>{x.g}</span>
                            ))}
                            <button className="gm-btn gm-btn-outline" style={{ marginLeft: 'auto', height: 32, padding: '0 10px' }} onClick={() => setShowStatsPanel(!showStatsPanel)}>
                                <PieChart size={14} /> Analytics
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Stats Panel ── */}
                {showStatsPanel && (
                    <div className="gm-stats-panel" style={{ borderRadius: 16 }}>
                        <div className="gm-stat-card">
                            <span className="gm-stat-label">Class Average</span>
                            <span className="gm-stat-value">{avgScore.toFixed(1)}%</span>
                        </div>
                        <div className="gm-stat-card">
                            <span className="gm-stat-label">Highest Performance</span>
                            <span className="gm-stat-value">98.5%</span>
                        </div>
                        <div className="gm-stat-card">
                            <span className="gm-stat-label">Weight Calibration</span>
                            <span className="gm-stat-value text-success">100%</span>
                        </div>
                    </div>
                )}

                {/* ── Main Table ── */}
                {loading ? (
                    <div className="gm-empty-state">
                        <RefreshCw className="animate-spin" size={48} color="#6366f1" />
                        <h2 className="gm-empty-title">Loading Gradebook...</h2>
                    </div>
                ) : !selectedSubject ? (
                    <div className="gm-empty-state">
                        <div className="gm-empty-icon-wrap"><ClipboardList size={32} /></div>
                        <div className="gm-empty-text">
                            <h2 className="gm-empty-title">Ready to Start Grading?</h2>
                            <p className="gm-empty-desc">Select a program, semester, and subject from the filters above to retrieve the student roster and begin managing grades.</p>
                        </div>
                    </div>
                ) : (
                    <div className="gm-table-card">
                        <div className="gm-table-header">
                            <div className="gm-table-title-group">
                                <h3 className="gm-table-title">Student Roster</h3>
                                <span className="gm-badge">{enrollments.length} Students</span>
                            </div>
                            <div className="gm-header-actions">
                                <span className="gm-subtitle" style={{ fontSize: '0.65rem' }}>Updated just now</span>
                            </div>
                        </div>

                        <div className="gm-scroll-container">
                            <table className="gm-table">
                                <thead>
                                    <tr>
                                        <th className="gm-sticky-col">Student Identity</th>
                                        {criteria.map(c => (
                                            <th key={c.id}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span>{c.component_name}</span>
                                                    <div style={{ display: 'flex', gap: 6, opacity: 0.6, fontSize: '0.6rem' }}>
                                                        <span>Max {c.max_marks}</span>
                                                        <span>•</span>
                                                        <span>Weight {parseFloat(c.weight_percentage)}%</span>
                                                    </div>
                                                </div>
                                            </th>
                                        ))}
                                        <th style={{ textAlign: 'right' }}>Performance Index</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {enrollments.filter(e =>
                                        e.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        String(e.student_id).includes(searchQuery)
                                    ).map(enrollment => {
                                        const total = getTotalWeightedScore(enrollment.id);
                                        const grade = getGradeLevel(total);
                                        return (
                                            <tr key={enrollment.id}>
                                                <td className="gm-sticky-col">
                                                    <div className="gm-student-info">
                                                        <div className="gm-avatar">{enrollment.student_name.charAt(0)}</div>
                                                        <div className="gm-student-details">
                                                            <span className="gm-student-name">{toSentenceCase(enrollment.student_name)}</span>
                                                            <span className="gm-student-id">ID: #{enrollment.student_id}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                {criteria.map(c => {
                                                    const m = grades[enrollment.id]?.[c.id];
                                                    const weighted = !isNaN(parseFloat(m)) ? ((parseFloat(m) / parseFloat(c.max_marks)) * 100).toFixed(1) : 0;
                                                    return (
                                                        <td key={c.id}>
                                                            <div className="gm-grade-cell">
                                                                <div className="gm-score-input-group">
                                                                    <input
                                                                        className="gm-score-input"
                                                                        type="number"
                                                                        value={m}
                                                                        onChange={e => updateGrade(enrollment.id, c.id, e.target.value)}
                                                                        placeholder="-"
                                                                    />
                                                                    <span className="gm-score-max">/ {c.max_marks}</span>
                                                                </div>
                                                                <div className="gm-grade-meta">
                                                                    <span className="gm-weighted-badge">{weighted}% Weighted</span>
                                                                </div>
                                                                <div className="gm-grade-progress">
                                                                    <div className="gm-grade-progress-fill" style={{ width: `${weighted}%`, background: 'hsl(var(--gm-primary))' }}></div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td style={{ verticalAlign: 'middle' }}>
                                                    <div className="gm-final-score-wrap">
                                                        <span className={`gm-final-value ${grade.class}`} style={{ color: 'inherit' }}>{total.toFixed(1)}%</span>
                                                        <span className={`gm-final-grade-badge ${grade.class}`} style={{ color: 'inherit' }}>{grade.label}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Import Overlay */}
            {showImport && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 20, width: '100%', maxWidth: '60rem', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <button style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: '#f1f5f9', padding: 8, borderRadius: 10, cursor: 'pointer' }} onClick={() => { setShowImport(false); loadGrades(); }}>
                            <X size={20} />
                        </button>
                        <GradeImport programId={selectedProgram || null} subjectId={selectedSubject || null} />
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            {success && (
                <div style={{ position: 'fixed', bottom: 32, right: 32, background: '#0f172a', color: 'white', padding: '12px 24px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', animation: 'gm-fadeInUp 0.3s ease-out', zIndex: 100 }}>
                    <CheckCircle2 color="#10b981" size={20} />
                    <span style={{ fontWeight: 600 }}>{success}</span>
                </div>
            )}
        </div>
    );
}

export default GradeManagement;
