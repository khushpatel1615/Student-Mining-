import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown, ChevronUp, Calculator, Download, AlertCircle, Target,
    ArrowRight, TrendingUp, TrendingDown, Filter, BookOpen, Award,
    Mail, FileText, Clock, X, AlertTriangle, RefreshCw, Activity
} from 'lucide-react';

import { useAuth } from '../../../context/AuthContext';
import { fetchStudentGrades, fetchCriteria } from '../../../services/gradeService';
import GPATimeline from './GPATimeline';

const clampPercentage = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return 0;
    if (num < 0) return 0;
    if (num > 100) return 100;
    return num;
};

const getGPAPoints = (percentage) => {
    if (percentage === null || percentage === undefined) return null;
    if (percentage >= 90) return 4.0; // A+/A
    if (percentage >= 80) return 4.0; // A
    if (percentage >= 70) return 3.5; // B+
    if (percentage >= 60) return 3.0; // B
    if (percentage >= 50) return 2.0; // C
    if (percentage >= 40) return 1.0; // D
    return 0.0; // F
};

const getGradeLetter = (percentage) => {
    if (percentage === null || percentage === undefined) return 'Pending';
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
};

const getGradeColor = (letter) => {
    if (!letter || letter === 'Pending') return 'bg-gray-400';
    if (letter.includes('A')) return 'bg-emerald-500';
    if (letter.includes('B')) return 'bg-blue-500';
    if (letter.includes('C')) return 'bg-amber-500';
    if (letter.includes('D')) return 'bg-orange-500';
    return 'bg-red-500'; // F
};

const SkeletonCard = () => (
    <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm p-5 animate-pulse">
        <div className="flex justify-between mb-4">
            <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
            <div className="h-6 w-12 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
        </div>
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3 mb-6"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
    </div>
);

const GradesTab = ({ selectedSemester }) => {
    const { user } = useAuth();
    const [grades, setGrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedSubject, setExpandedSubject] = useState(null);
    const [showCalculator, setShowCalculator] = useState(false);

    // Simulator State
    const [simSubjectId, setSimSubjectId] = useState('');
    const [simCriteria, setSimCriteria] = useState([]);
    const [simScores, setSimScores] = useState({});
    const [loadingCriteria, setLoadingCriteria] = useState(false);

    useEffect(() => {
        if (user?.id) loadGrades();
    }, [user?.id]);

    const loadGrades = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchStudentGrades(user.id);
            setGrades(data);
        } catch (err) {
            console.error("Failed to fetch grades", err);
            setError("Failed to load your grades. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const currentSubjects = useMemo(() => {
        let filtered = grades || [];
        if (selectedSemester) {
            filtered = filtered.filter(subject => subject.semester == selectedSemester);
        } else if (user?.current_semester) {
            filtered = filtered.filter(subject => subject.semester == user.current_semester);
        } else {
            filtered = filtered.filter(subject => subject.status?.toLowerCase() === 'active');
        }
        return filtered.sort((a, b) => (a.subject_name || a.name || '').localeCompare(b.subject_name || b.name || ''));
    }, [grades, user?.current_semester, selectedSemester]);

    // Derived Statistics
    const stats = useMemo(() => {
        let cumGpaPoints = 0;
        let cumCredits = 0;
        let semGpaPoints = 0;
        let semCredits = 0;
        let passed = 0;
        const enrolled = grades?.length || 0;

        grades?.forEach(s => {
            const finalScore = parseFloat(s.final_percentage);
            const pts = getGPAPoints(finalScore);
            const cr = parseInt(s.credits) || (!isNaN(pts) ? 3 : 0); // fallback to 3 credits if unknown

            if (!isNaN(pts) && pts !== null) {
                cumGpaPoints += pts * cr;
                cumCredits += cr;

                // If it's in the current view
                if (currentSubjects.find(cs => cs.enrollment_id === s.enrollment_id)) {
                    semGpaPoints += pts * cr;
                    semCredits += cr;
                }

                if (pts > 0) passed++;
            }
        });

        const cumGPA = cumCredits > 0 ? (cumGpaPoints / cumCredits) : 'N/A';
        const semGPA = semCredits > 0 ? (semGpaPoints / semCredits) : 'N/A';

        let tier = 'Average';
        let tierColor = 'amber';
        if (cumGPA >= 3.5) { tier = 'Excellent'; tierColor = 'emerald'; }
        else if (cumGPA >= 3.0) { tier = 'Good'; tierColor = 'blue'; }
        else if (cumGPA < 2.0 && cumCredits > 0) { tier = 'At Risk'; tierColor = 'red'; }
        else if (cumGPA < 2.5 && cumCredits > 0) { tier = 'Below Average'; tierColor = 'orange'; }

        return { cumGPA, semGPA, passed, enrolled, tier, tierColor };
    }, [grades, currentSubjects]);

    // Simulator Effects
    useEffect(() => {
        if (showCalculator && currentSubjects.length > 0 && !simSubjectId) {
            setSimSubjectId(currentSubjects[0].subject_id);
        }
    }, [showCalculator, currentSubjects]);

    useEffect(() => {
        if (!simSubjectId || !showCalculator) return;
        const loadCrit = async () => {
            setLoadingCriteria(true);
            try {
                const crits = await fetchCriteria(simSubjectId);
                setSimCriteria(crits || []);
                const initialScores = {};
                const sub = currentSubjects.find(s => s.subject_id === simSubjectId);
                (crits || []).forEach(c => {
                    const exG = sub?.grades?.find(g => String(g.criteria_id) === String(c.id));
                    initialScores[c.id] = (exG && exG.marks_obtained !== null) ? exG.marks_obtained : 0;
                });
                setSimScores(initialScores);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingCriteria(false);
            }
        };
        loadCrit();
    }, [simSubjectId, showCalculator]);

    const simProjectedFinal = useMemo(() => {
        if (!simCriteria || simCriteria.length === 0) return 0;

        let total = 0;
        simCriteria.forEach(c => {
            const w = parseFloat(c.weight_percentage);
            const max = parseFloat(c.max_marks);
            const simScore = parseFloat(simScores[c.id]);

            if (!isNaN(simScore) && simScore !== null && max > 0) {
                const weighted = (simScore / max) * w;
                total += weighted;
            } else {
                // Determine if we have real actual grades for it
                const sub = currentSubjects.find(s => s.subject_id === simSubjectId);
                const exG = sub?.grades?.find(g => String(g.criteria_id) === String(c.id));
                if (exG && exG.marks_obtained !== null) {
                    total += (parseFloat(exG.marks_obtained) / max) * w;
                }
            }
        });
        return total;
    }, [simCriteria, simScores, simSubjectId, currentSubjects]);

    const simProjectedLetter = getGradeLetter(simProjectedFinal);

    return (
        <div className="relative p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
            {/* Error State */}
            {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-500 rounded-xl p-4 flex items-start gap-4 shadow-sm">
                    <AlertTriangle className="text-red-500 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                        <h4 className="text-red-800 dark:text-red-300 font-semibold mb-1">Failed to Load</h4>
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                    <button onClick={loadGrades} className="bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm flex items-center">
                        <RefreshCw size={14} className="mr-2" />
                        Retry
                    </button>
                </div>
            )}

            {/* Top Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Cumulative GPA</span>
                        <Award className="text-indigo-500 w-5 h-5" />
                    </div>
                    <div className="text-3xl font-mono font-bold text-gray-900 dark:text-white">
                        {stats.cumGPA === 'N/A' ? 'N/A' : stats.cumGPA.toFixed(2)}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Semester GPA</span>
                        <TrendingUp className="text-emerald-500 w-5 h-5" />
                    </div>
                    <div className="text-3xl font-mono font-bold text-gray-900 dark:text-white">
                        {stats.semGPA === 'N/A' ? 'N/A' : stats.semGPA.toFixed(2)}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Passed / Enrolled</span>
                        <BookOpen className="text-blue-500 w-5 h-5" />
                    </div>
                    <div className="text-3xl font-mono font-bold text-gray-900 dark:text-white">
                        {stats.passed} <span className="text-lg text-gray-400">/ {stats.enrolled}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Performance</span>
                        <Activity className={`text-${stats.tierColor}-500 w-5 h-5`} />
                    </div>
                    <div className="mt-auto">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-${stats.tierColor}-100 text-${stats.tierColor}-700 dark:bg-${stats.tierColor}-900/30 dark:text-${stats.tierColor}-400`}>
                            {stats.tier === 'At Risk' && <span className={`absolute top-0 right-0 w-full h-full border-2 border-${stats.tierColor}-500 opacity-20 rounded-xl animate-ping pointer-events-none`} />}
                            {stats.tier}
                        </span>
                    </div>
                </div>
            </div>

            <GPATimeline />

            {/* Filter and Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {selectedSemester ? `Semester ${selectedSemester} Subjects` : 'Current Subjects'}
                </h3>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowCalculator(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center shadow-sm"
                    >
                        <Calculator size={18} className="mr-2" />
                        What-If Simulator
                    </button>
                    <button className="border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center shadow-sm">
                        <Download size={18} className="mr-2" />
                        Export
                    </button>
                </div>
            </div>

            {/* Subjects List */}
            <div className="space-y-4">
                {loading ? (
                    <>
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </>
                ) : currentSubjects.length > 0 ? (
                    currentSubjects.map(subject => (
                        <SubjectCardModern
                            key={subject.enrollment_id}
                            subject={subject}
                            expanded={expandedSubject === subject.enrollment_id}
                            onToggle={() => setExpandedSubject(expandedSubject === subject.enrollment_id ? null : subject.enrollment_id)}
                        />
                    ))
                ) : (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center text-gray-500 shadow-sm">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <h4 className="text-xl font-bold mb-2">No active subjects</h4>
                        <p>You aren't enrolled in any subjects for this semester view.</p>
                    </div>
                )}
            </div>

            {/* Slide-over Simulator Panel */}
            <AnimatePresence>
                {showCalculator && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black z-40"
                            onClick={() => setShowCalculator(false)}
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-full md:w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-y-auto border-l border-gray-200 dark:border-gray-800"
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-8 border-b border-gray-100 dark:border-gray-800 pb-4">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                                        <Target className="mr-2 text-indigo-500" /> Grade Simulator
                                    </h3>
                                    <button onClick={() => setShowCalculator(false)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Select Subject</label>
                                    <select
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white shadow-sm"
                                        value={simSubjectId}
                                        onChange={(e) => { setSimSubjectId(e.target.value); setSimScores({}); }}
                                    >
                                        {currentSubjects.map(s => (
                                            <option key={s.subject_id} value={s.subject_id}>
                                                {s.subject_name || s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {loadingCriteria ? (
                                    <div className="py-12 text-center text-gray-500 pointer-events-none">Loading criteria...</div>
                                ) : simCriteria.length > 0 ? (
                                    <div className="space-y-4 mb-8">
                                        {simCriteria.map(c => {
                                            const exG = currentSubjects.find(s => s.subject_id === simSubjectId)?.grades?.find(g => String(g.criteria_id) === String(c.id));
                                            const hasActual = exG && exG.marks_obtained !== null;

                                            return (
                                                <div key={c.id} className={`p-4 rounded-xl border ${hasActual ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-800' : 'bg-white dark:bg-gray-900 border-indigo-200 dark:border-indigo-800/50 shadow-sm'}`}>
                                                    <div className="flex justify-between items-end mb-2">
                                                        <div>
                                                            <span className="block font-semibold text-gray-800 dark:text-gray-200">{c.component_name}</span>
                                                            <span className="text-xs text-gray-500 font-mono mt-1 block">Weight: {parseFloat(c.weight_percentage)}%</span>
                                                        </div>
                                                        <span className="text-sm text-gray-400">/ {parseFloat(c.max_marks)}</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        placeholder={hasActual ? `Actual: ${exG.marks_obtained}` : "Ungraded — enter hypothetical score"}
                                                        value={simScores[c.id] ?? ''}
                                                        onChange={(e) => setSimScores(p => ({ ...p, [c.id]: e.target.value }))}
                                                        min={0}
                                                        max={parseFloat(c.max_marks)}
                                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-gray-500">No criteria found.</div>
                                )}

                                <div className="bg-gray-50 dark:bg-gray-800/80 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-inner mt-auto sticky bottom-0">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">Simulated Final</span>
                                        <span className={`font-bold px-3 py-1 rounded-full text-white text-xs ${getGradeColor(simProjectedLetter)}`}>
                                            {simProjectedLetter}
                                        </span>
                                    </div>
                                    <div className="text-4xl font-mono font-black text-gray-900 dark:text-white">
                                        {clampPercentage(simProjectedFinal).toFixed(2)}%
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

const SubjectCardModern = ({ subject, expanded, onToggle }) => {
    const finalScore = clampPercentage(subject.final_percentage);
    const letter = getGradeLetter(finalScore);
    const pts = getGPAPoints(finalScore);
    const isPending = subject.final_percentage === null;

    const badgeColorClass = getGradeColor(isPending ? 'Pending' : letter);

    let finalWeighted = 0;
    const gradesWithWeights = subject.grades?.filter(g => g.marks_obtained !== null) || [];
    gradesWithWeights.forEach(g => {
        const componentWeight = parseFloat(g.weight_percentage || 0);
        const marks = parseFloat(g.marks_obtained);
        const max = parseFloat(g.max_marks);
        if (max > 0) {
            finalWeighted += (marks / max) * componentWeight;
        }
    });

    const activeFinalScore = isPending ? clampPercentage(finalWeighted) : finalScore;

    return (
        <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${expanded ? 'ring-2 ring-indigo-500/20' : 'hover:border-indigo-300 dark:hover:border-indigo-700'}`}>
            <div className="p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4" onClick={onToggle}>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">{subject.subject_name || subject.name}</h4>
                        <span className={`text-xs font-bold text-white px-2.5 py-1 rounded-full ${badgeColorClass} shadow-sm`}>
                            {isPending ? 'Pending' : letter}
                        </span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full font-mono border border-gray-200 dark:border-gray-700">
                            {subject.subject_code || subject.code}
                        </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-2">
                        <span>Final: <strong className="font-mono text-gray-700 dark:text-gray-300">{(isPending ? clampPercentage(finalWeighted) : finalScore).toFixed(2)}%</strong></span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                        <span>GPA Points: <strong className="font-mono text-gray-700 dark:text-gray-300">{pts !== null ? pts.toFixed(1) : '-'}</strong></span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                        <span>Credits: <strong className="font-mono text-gray-700 dark:text-gray-300">{subject.credits || 0}</strong></span>
                    </div>
                </div>

                <div className="flex items-center gap-6 sm:w-1/3">
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner">
                        <div
                            className={`h-full rounded-full ${badgeColorClass} transition-all duration-1000 ease-out`}
                            style={{ width: `${activeFinalScore}%` }}
                        />
                    </div>
                    <button className="p-2 text-gray-400 hover:text-indigo-500 transition-colors bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm">
                        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50"
                    >
                        <div className="p-5">
                            <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Component</th>
                                            <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs border-l border-gray-200 dark:border-gray-800 text-center">Weight %</th>
                                            <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs border-l border-gray-200 dark:border-gray-800 text-center">Max</th>
                                            <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs border-l border-gray-200 dark:border-gray-800 text-center">Obtained</th>
                                            <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs border-l border-gray-200 dark:border-gray-800 text-center">Weighted Score</th>
                                            <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs border-l border-gray-200 dark:border-gray-800 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {subject.grades && subject.grades.length > 0 ? (
                                            subject.grades.map((grade, idx) => {
                                                const w = parseFloat(grade.weight_percentage);
                                                const m = parseFloat(grade.max_marks);
                                                const o = grade.marks_obtained !== null ? parseFloat(grade.marks_obtained) : null;
                                                const weighted = o !== null ? ((o / m) * w).toFixed(2) : '-';

                                                return (
                                                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{grade.component_name}</td>
                                                        <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400 text-center border-l border-gray-100 dark:border-gray-800">{w}%</td>
                                                        <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400 text-center border-l border-gray-100 dark:border-gray-800">{m}</td>
                                                        <td className="px-4 py-3 font-mono font-bold text-gray-800 dark:text-white text-center border-l border-gray-100 dark:border-gray-800">{o !== null ? o : '-'}</td>
                                                        <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-center border-l border-gray-100 dark:border-gray-800">{weighted}</td>
                                                        <td className="px-4 py-3 text-center border-l border-gray-100 dark:border-gray-800">
                                                            {grade.marks_obtained !== null ? (
                                                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Graded</span>
                                                            ) : (
                                                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Pending</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                                    <AlertCircle size={20} className="mx-auto mb-2 text-gray-400" />
                                                    No assessment data available.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="sm:hidden space-y-3">
                                {subject.grades && subject.grades.length > 0 ? (
                                    subject.grades.map((grade, idx) => {
                                        const w = parseFloat(grade.weight_percentage);
                                        const m = parseFloat(grade.max_marks);
                                        const o = grade.marks_obtained !== null ? parseFloat(grade.marks_obtained) : null;
                                        const weighted = o !== null ? ((o / m) * w).toFixed(2) : '-';

                                        return (
                                            <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm text-sm">
                                                <div className="flex justify-between items-start mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                                                    <span className="font-semibold text-gray-900 dark:text-white">{grade.component_name}</span>
                                                    {grade.marks_obtained !== null ? (
                                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Graded</span>
                                                    ) : (
                                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Pending</span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400">
                                                    <div className="flex justify-between"><span>Weight:</span> <span className="font-mono text-gray-800 dark:text-gray-200">{w}%</span></div>
                                                    <div className="flex justify-between"><span>Max:</span> <span className="font-mono text-gray-800 dark:text-gray-200">{m}</span></div>
                                                    <div className="flex justify-between"><span>Obtained:</span> <span className="font-mono font-bold text-gray-900 dark:text-white">{o !== null ? o : '-'}</span></div>
                                                    <div className="flex justify-between"><span>Score:</span> <span className="font-mono font-bold text-indigo-500">{weighted}</span></div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-6 text-center text-gray-500">
                                        <AlertCircle size={20} className="mx-auto mb-2 text-gray-400" />
                                        No assessment data available.
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GradesTab;
