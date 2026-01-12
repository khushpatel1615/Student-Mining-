import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Calculator, Download, AlertCircle, Target, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import './GradesTab.css'; // Importing Vanilla CSS

const API_BASE = 'http://localhost/StudentDataMining/backend/api';

const GradesTab = () => {
    const { user, token } = useAuth();
    const [grades, setGrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedSubject, setExpandedSubject] = useState(null);
    const [showCalculator, setShowCalculator] = useState(false);

    // Simulator State
    const [simSubjectId, setSimSubjectId] = useState('');
    const [simScores, setSimScores] = useState({});

    useEffect(() => {
        if (user?.id) fetchGrades();
    }, [user.id]);

    const fetchGrades = async () => {
        try {
            const res = await fetch(`${API_BASE}/grades.php?user_id=${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setGrades(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch grades", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter for Current Semester / Active Subjects
    const currentSubjects = useMemo(() => grades.filter(subject => {
        // Priority: Match user's current semester if available
        if (user?.current_semester && subject.semester) {
            return subject.semester == user.current_semester;
        }
        // Fallback: Check status
        return subject.status?.toLowerCase() === 'active';
    }), [grades, user?.current_semester]);

    // Initialize simulator subject
    useEffect(() => {
        if (currentSubjects.length > 0 && !simSubjectId) {
            const pending = currentSubjects.find(s => s.grades?.some(g => g.marks_obtained === null));
            const target = pending || currentSubjects[0];
            setSimSubjectId(target.enrollment_id || target.id);
        }
    }, [currentSubjects]);

    const handleSimScoreChange = (id, value) => {
        setSimScores(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const simData = useMemo(() => {
        if (!simSubjectId || !currentSubjects.length) return null;

        const subject = currentSubjects.find(s => (s.enrollment_id || s.id) == simSubjectId);
        if (!subject) return null;

        let accumulatedWeight = 0;
        let currentScore = 0;
        let simulatedAdd = 0;
        const pendingItems = [];

        subject.grades?.forEach((g, idx) => {
            const w = parseFloat(g.weight_percentage);
            const max = parseFloat(g.max_marks);

            if (g.marks_obtained !== null) {
                accumulatedWeight += w;
                currentScore += (parseFloat(g.marks_obtained) / max) * w;
            } else {
                pendingItems.push({ ...g, tempId: g.grade_id || `temp-${idx}` });

                const key = g.grade_id || `temp-${idx}`;
                const inputVal = simScores[key];
                if (inputVal !== undefined && inputVal !== '') {
                    simulatedAdd += (parseFloat(inputVal) / max) * w;
                }
            }
        });

        const projectedFinal = currentScore + simulatedAdd;

        const otherSubjectsSum = currentSubjects
            .filter(s => (s.enrollment_id || s.id) != simSubjectId)
            .reduce((sum, s) => {
                let final = parseFloat(s.final_percentage);
                if (isNaN(final)) final = parseFloat(s.overall_grade) || 0;
                return sum + final;
            }, 0);

        const count = currentSubjects.length;

        let subjectCurrentStanding = parseFloat(subject.final_percentage);
        if (isNaN(subjectCurrentStanding)) subjectCurrentStanding = parseFloat(subject.overall_grade) || 0;

        const currentGlobalAvg = (otherSubjectsSum + subjectCurrentStanding) / count;
        const projectedGlobalAvg = (otherSubjectsSum + projectedFinal) / count;
        const shift = projectedGlobalAvg - currentGlobalAvg;

        return {
            subject,
            pendingItems,
            projectedFinal,
            currentGlobalAvg,
            projectedGlobalAvg,
            shift
        };

    }, [simSubjectId, simScores, currentSubjects]);

    if (loading) return <div className="loading-state">Loading academic record...</div>;

    return (
        <div className="grades-tab-container">
            {/* Simulator Panel */}
            <AnimatePresence>
                {showCalculator && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
                        exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                        className="calculator-panel"
                    >
                        {/* Header with Inline Dropdown */}
                        <div className="panel-header compact-header">
                            <div className="header-title">
                                <Target size={20} />
                                <h3>Grade Simulator</h3>
                            </div>
                            <div className="header-select">
                                <select
                                    className="sim-select-inline"
                                    value={simSubjectId}
                                    onChange={(e) => setSimSubjectId(e.target.value)}
                                >
                                    {currentSubjects.map(s => (
                                        <option key={s.enrollment_id || s.id} value={s.enrollment_id || s.id}>
                                            {s.subject_name || s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="sim-content-wrapper">
                            {/* Inputs Section */}
                            {simData && simData.pendingItems.length > 0 ? (
                                <div className="sim-inputs-section">
                                    <div className="section-label">Potential Scores</div>
                                    <div className="sim-grid-inputs">
                                        {simData.pendingItems.map((item) => {
                                            const key = item.tempId;
                                            return (
                                                <div className="sim-input-card" key={key}>
                                                    <div className="sim-input-header">
                                                        <span className="label-text">{item.component_name}</span>
                                                        <span className="max-badge">/ {parseFloat(item.max_marks)}</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        className="sim-input-glass"
                                                        placeholder="-"
                                                        min="0"
                                                        max={item.max_marks}
                                                        value={simScores[key] || ''}
                                                        onChange={(e) => handleSimScoreChange(key, e.target.value)}
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="empty-sim-state">
                                    <AlertCircle size={16} />
                                    <span>No pending assessments for this subject.</span>
                                </div>
                            )}

                            {/* Results Footer */}
                            {simData && (
                                <div className="sim-results-footer">
                                    <div className="sim-mini-card">
                                        <span className="mini-label">Projected Grade</span>
                                        <div className="mini-value text-glow">
                                            {simData.projectedFinal.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="vertical-divider"></div>
                                    <div className="sim-mini-card">
                                        <span className="mini-label">Semester Average</span>
                                        <div className="mini-value-group">
                                            <span className="curr">{simData.currentGlobalAvg.toFixed(1)}%</span>
                                            <ArrowRight size={14} className="arrow-icon" />
                                            <span className="new">{simData.projectedGlobalAvg.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    <div className="sim-status-badge">
                                        <span className={`delta ${simData.shift >= 0 ? 'positive' : 'negative'}`}>
                                            {simData.shift >= 0 ? '+' : ''}{simData.shift.toFixed(1)}% Impact
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Current Subjects List (Unchanged) */}
            <div className="semester-list">
                <div className="semester-group current-semester">
                    <div className="semester-header">
                        <div className="header-left">
                            <h3>My Current Subjects</h3>
                            <span className="subject-count">{currentSubjects.length} Active</span>
                        </div>
                        <div className="header-actions">
                            <button
                                onClick={() => setShowCalculator(!showCalculator)}
                                className={`action-btn small ${showCalculator ? 'active' : ''}`}
                                title="Grade Simulator"
                            >
                                <Calculator size={16} />
                                <span>Simulator</span>
                            </button>
                            <button className="action-btn small secondary" title="Export PDF">
                                <Download size={16} />
                            </button>
                        </div>
                    </div>
                    <div className="subject-list">
                        {currentSubjects.length > 0 ? (
                            currentSubjects.map(subject => (
                                <SubjectRow
                                    key={subject.enrollment_id || subject.id}
                                    subject={subject}
                                    expanded={expandedSubject === (subject.enrollment_id || subject.id)}
                                    onToggle={() => setExpandedSubject(expandedSubject === (subject.enrollment_id || subject.id) ? null : (subject.enrollment_id || subject.id))}
                                />
                            ))
                        ) : (
                            <div className="empty-state">
                                <AlertCircle size={32} />
                                <p>No active subjects found for this semester.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {grades.length === 0 && !loading && (
                <div className="empty-state">
                    <AlertCircle size={48} />
                    <p>No academic records found.</p>
                </div>
            )}
        </div>
    );
};

const SubjectRow = ({ subject, expanded, onToggle }) => {

    const getGradeClass = (g) => {
        if (!g) return 'pending';
        const letter = g.charAt(0).toUpperCase();
        if (letter === 'A') return 'grade-a';
        if (letter === 'B') return 'grade-b';
        if (letter === 'C') return 'grade-c';
        if (letter === 'F') return 'grade-f';
        return 'grade-default';
    };

    const finalGrade = subject.final_grade || subject.grade_letter;
    let finalScore = subject.final_percentage || subject.overall_grade;
    if (finalScore && !isNaN(finalScore)) {
        finalScore = Math.min(parseFloat(finalScore), 100).toFixed(1);
    }

    return (
        <div className={`subject-row-container ${expanded ? 'expanded' : ''}`}>
            <div className="subject-row-main" onClick={onToggle}>
                <div className="subject-info">
                    <div className="subject-title-wrapper">
                        <span className="subject-name">{subject.subject_name || subject.name}</span>
                        <span className="subject-code">{subject.subject_code || subject.code}</span>
                    </div>
                    <div className="subject-meta">
                        {subject.credits || 0} Credits • {subject.status === 'active' ? 'In Progress' : 'Completed'}
                    </div>
                </div>

                <div className="subject-grades-summary">
                    <div className="score-stack">
                        <span className="score-val">{finalScore ? `${parseFloat(finalScore).toFixed(1)}%` : '--'}</span>
                        <span className="score-label">Total</span>
                    </div>
                    <div className={`grade-circle ${getGradeClass(finalGrade)}`}>
                        {finalGrade || '-'}
                    </div>
                    <button className="toggle-btn">
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
                        className="subject-details-wrapper"
                    >
                        <div className="subject-details-content">
                            <table className="breakdown-table">
                                <thead>
                                    <tr>
                                        <th>Component</th>
                                        <th className="text-center">Weight</th>
                                        <th className="text-right">Score</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subject.grades && subject.grades.length > 0 ? (
                                        subject.grades.map((grade, idx) => (
                                            <tr key={idx}>
                                                <td className="component-name">{grade.component_name}</td>
                                                <td className="text-center highlight">{parseFloat(grade.weight_percentage)}%</td>
                                                <td className="text-right score-cell">
                                                    {grade.marks_obtained !== null ? (
                                                        <>
                                                            <span className="obtained">{parseFloat(grade.marks_obtained)}</span>
                                                            <span className="max"> / {parseFloat(grade.max_marks)}</span>
                                                        </>
                                                    ) : (
                                                        <span className="pending-text">Pending</span>
                                                    )}
                                                </td>
                                                <td className="remarks-cell">{grade.remarks || '-'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="empty-breakdown">No detailed grades available yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GradesTab;
