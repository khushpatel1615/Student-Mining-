import { useState, useEffect } from 'react';
import {
    BookOpen, Save, Download, Users, AlertTriangle, CheckCircle2,
    ChevronDown, GraduationCap, BarChart3, TrendingUp, RefreshCw, X
} from 'lucide-react';

import apiClient from '../../../utils/apiClient';
import { useAuth } from '../../../context/AuthContext';

const toSentenceCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const getGradeLevel = (pct) => {
    if (pct >= 90) return { label: 'A+', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    if (pct >= 85) return { label: 'A', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    if (pct >= 80) return { label: 'A−', color: 'text-teal-600 bg-teal-50 border-teal-200' };
    if (pct >= 75) return { label: 'B+', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
    if (pct >= 70) return { label: 'B', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
    if (pct >= 65) return { label: 'B−', color: 'text-sky-600 bg-sky-50 border-sky-200' };
    if (pct >= 55) return { label: 'C', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    if (pct >= 45) return { label: 'D', color: 'text-orange-600 bg-orange-50 border-orange-200' };
    return { label: 'F', color: 'text-rose-600 bg-rose-50 border-rose-200' };
};

function ScoreBar({ pct }) {
    const color = pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
    return (
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
            <div
                className={`h-full rounded-full transition-all duration-500 ${color}`}
                style={{ width: `${Math.min(100, pct)}%` }}
            />
        </div>
    );
}

function TeacherGrades() {
    const { token } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [students, setStudents] = useState([]);
    const [gradeComponents, setGradeComponents] = useState([]);
    const [grades, setGrades] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => { fetchSubjectsList(); }, []);
    useEffect(() => { if (selectedSubject) fetchStudentsAndGrades(); }, [selectedSubject]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchSubjectsList = async () => {
        try {
            setLoading(true);
            const data = await apiClient.get('/teachers.php', { action: 'my_subjects' });
            if (data.success && data.data.length > 0) {
                setSubjects(data.data);
                setSelectedSubject(data.data[0]);
            }
        } catch {
            // Subject fetch failed
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentsAndGrades = async () => {
        try {
            setLoading(true);
            const [studentsData, gradesData] = await Promise.all([
                apiClient.get('/teachers.php', { action: 'subject_students', subject_id: selectedSubject.id }),
                apiClient.get('/grades.php', { subject_id: selectedSubject.id }),
            ]);

            if (studentsData.success) setStudents(studentsData.data);

            if (gradesData.success && gradesData.data) {
                const responseData = gradesData.data;

                // grades.php returns { criteria: [...], enrollments: [...], pagination }
                // Extract grade components from criteria
                if (responseData.criteria) {
                    setGradeComponents(responseData.criteria.map(c => ({
                        id: c.id,
                        name: c.component_name,
                        max_marks: parseInt(c.max_marks),
                        weightage: parseFloat(c.weight_percentage),
                    })));
                }

                // Build grades map from enrollments' nested grades
                if (responseData.enrollments) {
                    const gradesMap = {};
                    responseData.enrollments.forEach(enrollment => {
                        const studentId = enrollment.user_id;
                        if (enrollment.grades) {
                            enrollment.grades.forEach(g => {
                                const key = `${studentId}_${g.criteria_id}`;
                                gradesMap[key] = {
                                    id: g.grade_id || g.id,
                                    marks: g.marks_obtained,
                                    remarks: g.remarks || '',
                                    enrollment_id: enrollment.id,
                                };
                            });
                        }
                    });
                    setGrades(gradesMap);
                }
            }
        } catch {
            // Grade data fetch failed
        } finally {
            setLoading(false);
        }
    };


    const handleGradeChange = (studentId, componentId, field, value) => {
        const key = `${studentId}_${componentId}`;
        setGrades(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    };

    const saveGrade = async (studentId, componentId) => {
        const key = `${studentId}_${componentId}`;
        const gradeData = grades[key];
        if (!gradeData || gradeData.marks === undefined || gradeData.marks === '') return;

        try {
            // Find enrollment_id for this student+subject combination
            let enrollmentId = gradeData.enrollment_id;
            if (!enrollmentId) {
                // Look it up from students list (they come from subject_students endpoint)
                const student = students.find(s => s.id === studentId || s.user_id === studentId);
                if (student) {
                    enrollmentId = student.enrollment_id;
                }
            }

            const gradeEntry = {
                enrollment_id: enrollmentId,
                criteria_id: componentId,
                marks_obtained: parseFloat(gradeData.marks),
                remarks: gradeData.remarks || '',
            };
            if (gradeData.id) {
                gradeEntry.grade_id = gradeData.id;
            }

            const data = await apiClient.put('/grades.php', {
                action: 'update_enrollment',
                grades: [gradeEntry]
            });
            if (data.success && !gradeData.id && data.id) {
                setGrades(prev => ({ ...prev, [key]: { ...prev[key], id: data.id } }));
            }
        } catch {
            // Save failed
        }
    };


    const saveAllGrades = async () => {
        setSaving(true);
        const promises = [];
        students.forEach(s => {
            gradeComponents.forEach(c => {
                const key = `${s.id}_${c.id}`;
                if (grades[key]?.marks !== undefined && grades[key]?.marks !== '') {
                    promises.push(saveGrade(s.id, c.id));
                }
            });
        });
        await Promise.all(promises);
        setSaving(false);
        showToast('All grades saved successfully!', 'success');
    };

    const calculateTotal = (studentId) => {
        let total = 0;
        gradeComponents.forEach(c => {
            const g = grades[`${studentId}_${c.id}`];
            if (g?.marks) total += parseFloat(g.marks);
        });
        return total;
    };

    const calculatePercentage = (studentId) => {
        const total = calculateTotal(studentId);
        const maxMarks = gradeComponents.reduce((s, c) => s + c.max_marks, 0);
        if (maxMarks === 0) return 0;
        return (total / maxMarks) * 100;
    };

    const exportToCSV = () => {
        if (!selectedSubject || students.length === 0) return;
        const headers = [
            'Student ID', 'Student Name',
            ...gradeComponents.map(c => `${c.name} (${c.max_marks})`),
            'Total', 'Percentage', 'Grade'
        ];
        const rows = students.map(student => {
            const marks = gradeComponents.map(c => grades[`${student.id}_${c.id}`]?.marks || 'N/A');
            const pct = calculatePercentage(student.id);
            const grade = getGradeLevel(pct);
            return [student.student_id, student.full_name, ...marks, calculateTotal(student.id).toFixed(2), pct.toFixed(2) + '%', grade.label];
        });
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedSubject.code}_grades.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const filteredStudents = students.filter(s => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return s.full_name?.toLowerCase().includes(q) || String(s.student_id).toLowerCase().includes(q);
    });

    const maxMarksTotal = gradeComponents.reduce((s, c) => s + c.max_marks, 0);
    const classAvg = filteredStudents.length > 0
        ? filteredStudents.reduce((s, st) => s + calculatePercentage(st.id), 0) / filteredStudents.length
        : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 font-sans pb-24">
            <div className="mx-auto max-w-[1680px] px-6 py-6 space-y-5">

                {/* ── Header ── */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-200">
                                <GraduationCap className="text-white" size={22} />
                            </div>
                            <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-400 rounded-full border-2 border-white" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold tracking-[0.15em] text-violet-500 uppercase mb-0.5">Grade Entry</div>
                            <h1 className="text-2xl font-bold text-slate-900 leading-none">Grade Management</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={exportToCSV}
                            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 font-semibold text-sm flex items-center gap-2
                                       hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all shadow-sm"
                        >
                            <Download size={15} />
                            Export CSV
                        </button>
                        <button
                            onClick={saveAllGrades}
                            disabled={saving || students.length === 0}
                            className={`h-10 px-5 font-semibold rounded-xl text-sm flex items-center gap-2 transition-all shadow-sm
                                ${(saving || students.length === 0)
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                    : 'bg-gradient-to-r from-violet-600 to-purple-700 text-white hover:from-violet-700 hover:to-purple-800 hover:shadow-md hover:shadow-violet-200 active:scale-[0.98]'
                                }`}
                        >
                            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
                            {saving ? 'Saving…' : 'Save All'}
                        </button>
                    </div>
                </div>

                {/* ── Toolbar (subject picker + search + stats) ── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5 shrink-0">
                            <div className="h-6 w-6 rounded-lg bg-violet-50 flex items-center justify-center">
                                <BookOpen size={12} className="text-violet-500" />
                            </div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</span>
                        </div>
                        <div className="h-5 w-px bg-slate-200 shrink-0" />

                        <div className="relative flex-1 min-w-[200px] max-w-xs">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                                <BookOpen size={13} />
                            </div>
                            <select
                                className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-8 pr-8 text-sm font-semibold text-slate-700 appearance-none
                                           focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-sm cursor-pointer
                                           hover:border-violet-300 transition-all"
                                value={selectedSubject?.id || ''}
                                onChange={(e) => {
                                    const sub = subjects.find(s => s.id === parseInt(e.target.value));
                                    setSelectedSubject(sub);
                                }}
                            >
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.code} – {s.name}</option>)}
                            </select>
                            <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-slate-400">
                                <ChevronDown size={13} />
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative flex-1 min-w-[160px]">
                            <input
                                type="text"
                                placeholder="Student search…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-4 pr-8 text-sm text-slate-700 placeholder:text-slate-400
                                           focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-sm hover:border-violet-300 transition-all"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600">
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Stats pills */}
                        {filteredStudents.length > 0 && (
                            <div className="flex items-center gap-2 ml-auto shrink-0 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold bg-slate-100 text-slate-600 border-slate-200">
                                    <Users size={11} />
                                    {filteredStudents.length} Students
                                </span>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold
                                    ${classAvg >= 60 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                    <TrendingUp size={11} />
                                    Avg {classAvg.toFixed(1)}%
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Content Area ── */}
                {loading ? (
                    /* Skeleton */
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="px-5 py-4 border-b border-slate-50 animate-pulse flex gap-4 items-center">
                                <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-slate-200 rounded-full w-2/5" />
                                    <div className="h-2 bg-slate-100 rounded-full w-1/5" />
                                </div>
                                <div className="h-9 bg-slate-100 rounded-xl w-24" />
                            </div>
                        ))}
                    </div>
                ) : subjects.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
                            <BookOpen className="text-slate-400" size={32} />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-800 mb-2">No subjects assigned</h2>
                        <p className="text-sm text-slate-500 max-w-xs">You haven't been assigned any subjects yet. Contact an administrator.</p>
                    </div>
                ) : gradeComponents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-5">
                            <AlertTriangle className="text-amber-500" size={32} />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-800 mb-2">No grade components</h2>
                        <p className="text-sm text-slate-500 max-w-xs">No evaluation components are defined for this subject. Contact an administrator to set them up.</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
                            <Users className="text-slate-400" size={32} />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-800 mb-2">No students found</h2>
                        <p className="text-sm text-slate-500 max-w-xs">
                            {searchQuery ? `No students matching "${searchQuery}".` : 'No students are enrolled in this subject.'}
                        </p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        {/* Table toolbar */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Roster</span>
                                <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold">
                                    {filteredStudents.length}
                                </span>
                                <span className="text-xs text-slate-400">{gradeComponents.length} components · Max {maxMarksTotal}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />≥ 70%</span>
                                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-amber-400" />≥ 50%</span>
                                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-rose-400" />&lt; 50%</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto tg-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-5 py-3.5 sticky left-0 z-20 bg-slate-50 border-r border-slate-200 min-w-[220px]">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Student</span>
                                        </th>
                                        {gradeComponents.map(c => (
                                            <th key={c.id} className="px-4 py-3.5 border-r border-slate-200 min-w-[160px] align-top">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-800">{c.name}</div>
                                                        <div className="text-[11px] text-slate-500 mt-0.5">Max: <strong className="text-slate-700">{c.max_marks}</strong></div>
                                                    </div>
                                                    {c.weightage && (
                                                        <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-violet-50 border border-violet-100 text-[10px] font-bold text-violet-600">
                                                            {c.weightage}%
                                                        </span>
                                                    )}
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-5 py-3.5 min-w-[100px] text-center border-r border-slate-200">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total</span>
                                        </th>
                                        <th className="px-5 py-3.5 min-w-[130px] text-right">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Score</span>
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {filteredStudents.map(student => {
                                        const pct = calculatePercentage(student.id);
                                        const total = calculateTotal(student.id);
                                        const grade = getGradeLevel(pct);

                                        return (
                                            <tr key={student.id} className="group hover:bg-slate-50/70 transition-colors duration-100">
                                                {/* Student cell */}
                                                <td className="px-5 py-3.5 sticky left-0 z-10 bg-white group-hover:bg-slate-50/70 border-r border-slate-100 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                                            {toSentenceCase(student.full_name).charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-semibold text-slate-800 text-sm truncate leading-tight">
                                                                {toSentenceCase(student.full_name)}
                                                            </div>
                                                            <div className="text-xs text-slate-400 mt-0.5 font-mono">#{student.student_id}</div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Grade components */}
                                                {gradeComponents.map(c => {
                                                    const key = `${student.id}_${c.id}`;
                                                    const gData = grades[key] || {};
                                                    const markPct = gData.marks && !isNaN(gData.marks)
                                                        ? (parseFloat(gData.marks) / c.max_marks) * 100 : 0;

                                                    return (
                                                        <td key={c.id} className="px-4 py-3.5 border-r border-slate-100 align-top">
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-semibold text-center tabular-nums
                                                                                   text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400
                                                                                   hover:border-violet-300 transition-all
                                                                                   [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                        value={gData.marks || ''}
                                                                        onChange={(e) => handleGradeChange(student.id, c.id, 'marks', e.target.value)}
                                                                        onBlur={() => saveGrade(student.id, c.id)}
                                                                        max={c.max_marks}
                                                                        min={0}
                                                                        step={0.5}
                                                                        placeholder="—"
                                                                    />
                                                                    <span className="text-xs text-slate-400 shrink-0">/ {c.max_marks}</span>
                                                                </div>
                                                                {gData.marks && <ScoreBar pct={markPct} />}
                                                            </div>
                                                        </td>
                                                    );
                                                })}

                                                {/* Total */}
                                                <td className="px-5 py-3.5 border-r border-slate-100 text-center align-middle">
                                                    <div className="font-bold text-slate-800 tabular-nums text-sm">{total.toFixed(1)}</div>
                                                    <div className="text-[10px] text-slate-400">/ {maxMarksTotal}</div>
                                                </td>

                                                {/* Score */}
                                                <td className="px-5 py-3.5 bg-slate-50/40 group-hover:bg-slate-100/50 transition-colors align-middle">
                                                    <div className="flex flex-col items-end gap-1.5">
                                                        <span className={`text-xl font-bold tabular-nums ${pct >= 70 ? 'text-emerald-600' :
                                                            pct >= 50 ? 'text-amber-600' : 'text-rose-600'
                                                            }`}>{pct.toFixed(1)}%</span>
                                                        <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${grade.color}`}>
                                                            {grade.label}
                                                        </span>
                                                        <ScoreBar pct={pct} />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>

                                <tfoot className="sticky bottom-0 z-20">
                                    <tr className="bg-white border-t border-slate-200">
                                        <td colSpan={gradeComponents.length + 3} className="px-5 py-3">
                                            <div className="flex items-center justify-between gap-4 text-sm">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-slate-500">
                                                        Class average:
                                                        <strong className={`ml-1.5 ${classAvg >= 60 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {classAvg.toFixed(1)}%
                                                        </strong>
                                                    </span>
                                                    {classAvg >= 60 && (
                                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                                    )}
                                                </div>
                                                <span className="text-xs text-slate-400">Auto-saved on focus loss</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Toast ── */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300 border border-white/10
                    ${toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-rose-900 text-white'}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${toast.type === 'success' ? 'bg-emerald-500/20 ring-1 ring-emerald-400/30' : 'bg-rose-400/20'}`}>
                        {toast.type === 'success'
                            ? <CheckCircle2 size={16} className="text-emerald-400" />
                            : <AlertTriangle size={16} className="text-rose-300" />
                        }
                    </div>
                    <div>
                        <div className="font-semibold text-sm">{toast.type === 'success' ? 'Saved' : 'Error'}</div>
                        <div className="text-xs text-slate-400">{toast.message}</div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .tg-scrollbar::-webkit-scrollbar { height: 8px; }
                .tg-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .tg-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; border: 2px solid #f8fafc; }
                .tg-scrollbar:hover::-webkit-scrollbar-thumb { background: #94a3b8; }
                .tg-scrollbar { scrollbar-width: thin; scrollbar-color: #cbd5e1 #f8fafc; }
            `}} />
        </div>
    );
}

export default TeacherGrades;
