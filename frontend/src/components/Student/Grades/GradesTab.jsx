import { API_BASE } from '../../../config';
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown, ChevronUp, Calculator, Download, AlertCircle, Target,
    ArrowRight, TrendingUp, TrendingDown, Filter, BookOpen, Award,
    Mail, FileText, Clock
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import './GradesTab.css';

const clampPercentage = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return 0;
    if (num < 0) return 0;
    if (num > 100) return 100;
    return num;
};



const GradesTab = ({ selectedSemester }) => {
    const { user, token } = useAuth();
    const [grades, setGrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedSubject, setExpandedSubject] = useState(null);
    const [showCalculator, setShowCalculator] = useState(false);
    const [sortBy, setSortBy] = useState('name'); // name, grade, credits
    const [filterGrade, setFilterGrade] = useState('all'); // all, A, B, C, F

    // Simulator State
    const [simSubjectId, setSimSubjectId] = useState('');
    const [simScores, setSimScores] = useState({});

    useEffect(() => {
        if (user?.id) fetchGrades();
    }, [user?.id]);

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

    // Filter for Current Semester / Active Subjects with semester prop support
    const currentSubjects = useMemo(() => {
        let filtered = grades;

        // Filter by selected semester if provided
        if (selectedSemester) {
            filtered = filtered.filter(subject => subject.semester == selectedSemester);
        } else if (user?.current_semester) {
            filtered = filtered.filter(subject => subject.semester == user.current_semester);
        } else {
            filtered = filtered.filter(subject => subject.status?.toLowerCase() === 'active');
        }

        // Apply grade filter
        if (filterGrade !== 'all') {
            filtered = filtered.filter(subject => {
                const grade = (subject.final_grade || subject.grade_letter || '').charAt(0).toUpperCase();
                return grade === filterGrade;
            });
        }

        // Apply sorting
        return filtered.sort((a, b) => {
            if (sortBy === 'grade') {
                const gradeA = parseFloat(a.final_percentage || a.overall_grade || 0);
                const gradeB = parseFloat(b.final_percentage || b.overall_grade || 0);
                return gradeB - gradeA; // Descending
            } else if (sortBy === 'credits') {
                return (b.credits || 0) - (a.credits || 0);
            } else {
                // Sort by name
                const nameA = (a.subject_name || a.name || '').toLowerCase();
                const nameB = (b.subject_name || b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            }
        });
    }, [grades, user?.current_semester, selectedSemester, sortBy, filterGrade]);

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

    // Calculate semester stats
    const semesterStats = useMemo(() => {
        if (currentSubjects.length === 0) return { avgGrade: 0, totalCredits: 0, gpa: 0 };

        const totalGrade = currentSubjects.reduce((sum, s) => {
            const grade = parseFloat(s.final_percentage || s.overall_grade || 0);
            return sum + grade;
        }, 0);

        const totalCredits = currentSubjects.reduce((sum, s) => sum + (parseInt(s.credits) || 0), 0);

        return {
            avgGrade: (totalGrade / currentSubjects.length).toFixed(1),
            totalCredits,
            gpa: ((totalGrade / currentSubjects.length) / 25).toFixed(2) // Assuming 100% = 4.0 GPA
        };
    }, [currentSubjects]);

    if (loading) return <div className="loading-state">Loading academic record...</div>;

    return (
        <div className="grades-tab-container-modern">
            {/* Header with Stats Summary */}
            <div className="grades-header-modern">
                <div className="header-title-section">
                    <h2>My Current Subjects</h2>
                    <p className="header-subtitle">
                        {selectedSemester ? `Semester ${selectedSemester}` : 'Current Semester'} {'\u2022'} {currentSubjects.length} Subjects
                    </p>
                </div>
                <div className="header-stats-cards">
                    <div className="mini-stat-card">
                        <Award size={18} className="stat-icon" />
                        <div className="stat-content">
                            <span className="stat-value">{semesterStats.gpa}</span>
                            <span className="stat-label">GPA</span>
                        </div>
                    </div>
                    <div className="mini-stat-card">
                        <TrendingUp size={18} className="stat-icon" />
                        <div className="stat-content">
                            <span className="stat-value">{semesterStats.avgGrade}%</span>
                            <span className="stat-label">Average</span>
                        </div>
                    </div>
                    <div className="mini-stat-card">
                        <BookOpen size={18} className="stat-icon" />
                        <div className="stat-content">
                            <span className="stat-value">{semesterStats.totalCredits}</span>
                            <span className="stat-label">Credits</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter and Action Bar */}
            <div className="filter-action-bar">
                <div className="filter-group">
                    <div className="filter-item">
                        <Filter size={16} />
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
                            <option value="name">Sort by Name</option>
                            <option value="grade">Sort by Grade</option>
                            <option value="credits">Sort by Credits</option>
                        </select>
                    </div>
                    <div className="filter-item">
                        <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="filter-select">
                            <option value="all">All Grades</option>
                            <option value="A">A Grades</option>
                            <option value="B">B Grades</option>
                            <option value="C">C Grades</option>
                            <option value="F">F Grades</option>
                        </select>
                    </div>
                </div>
                <div className="action-group">
                    <button
                        onClick={() => setShowCalculator(!showCalculator)}
                        className={`action-btn-modern ${showCalculator ? 'active' : ''}`}
                    >
                        <Calculator size={16} />
                        <span>What-If Simulator</span>
                    </button>
                    <button className="action-btn-modern secondary">
                        <Download size={16} />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* Simulator Panel */}
            <AnimatePresence>
                {showCalculator && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
                        exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                        className="calculator-panel-modern"
                    >
                        <div className="panel-header-modern">
                            <div className="header-title">
                                <Target size={20} />
                                <h3>Grade Simulator</h3>
                            </div>
                            <select
                                className="sim-select-modern"
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

                        <div className="sim-content-modern">
                            {simData && simData.pendingItems.length > 0 ? (
                                <div className="sim-inputs-grid">
                                    {simData.pendingItems.map((item) => {
                                        const key = item.tempId;
                                        return (
                                            <div className="sim-input-card-modern" key={key}>
                                                <div className="input-label">
                                                    <span>{item.component_name}</span>
                                                    <span className="max-marks">/ {parseFloat(item.max_marks)}</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    className="sim-input-modern"
                                                    placeholder="Enter score"
                                                    min="0"
                                                    max={item.max_marks}
                                                    value={simScores[key] || ''}
                                                    onChange={(e) => handleSimScoreChange(key, e.target.value)}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="empty-sim-modern">
                                    <Clock size={24} />
                                    <span>No pending assessments for this subject.</span>
                                </div>
                            )}

                            {simData && (
                                <div className="sim-results-modern">
                                    <div className="result-card">
                                        <span className="result-label">Projected Grade</span>
                                        <span className="result-value primary">{clampPercentage(simData.projectedFinal).toFixed(1)}%</span>
                                    </div>
                                    <div className="result-card">
                                        <span className="result-label">Semester Average</span>
                                        <div className="result-comparison">
                                            <span className="current">{clampPercentage(simData.currentGlobalAvg).toFixed(1)}%</span>
                                            <ArrowRight size={14} />
                                            <span className="projected">{clampPercentage(simData.projectedGlobalAvg).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    <div className="result-card impact">
                                        <span className={`impact-badge ${simData.shift >= 0 ? 'positive' : 'negative'}`}>
                                            {simData.shift >= 0 ? '+' : ''}{simData.shift.toFixed(1)}% Impact
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Subjects List - Compact Modern Design */}
            <div className="subjects-list-modern">
                {currentSubjects.length > 0 ? (
                    currentSubjects.map(subject => (
                        <SubjectCardModern
                            key={subject.enrollment_id || subject.id}
                            subject={subject}
                            expanded={expandedSubject === (subject.enrollment_id || subject.id)}
                            onToggle={() => setExpandedSubject(expandedSubject === (subject.enrollment_id || subject.id) ? null : (subject.enrollment_id || subject.id))}
                        />
                    ))
                ) : (
                    <div className="empty-state-modern-grades">
                        <AlertCircle size={48} />
                        <h3>No subjects found</h3>
                        <p>No subjects match your current filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const SubjectCardModern = ({ subject, expanded, onToggle }) => {
    const getGradeInfo = (grade) => {
        if (!grade) return { class: 'pending', color: '#94a3b8', label: 'Pending' };
        const letter = grade.charAt(0).toUpperCase();
        if (letter === 'A') return { class: 'grade-a', color: '#3b82f6', label: grade };
        if (letter === 'B') return { class: 'grade-b', color: '#8b5cf6', label: grade };
        if (letter === 'C') return { class: 'grade-c', color: '#f59e0b', label: grade };
        if (letter === 'F') return { class: 'grade-f', color: '#ef4444', label: grade };
        return { class: 'grade-default', color: '#64748b', label: grade };
    };

    const finalGrade = subject.final_grade || subject.grade_letter;
    let finalScore = subject.final_percentage || subject.overall_grade;
    if (finalScore && !isNaN(finalScore)) {
        finalScore = clampPercentage(finalScore);
    } else {
        finalScore = 0;
    }

    const gradeInfo = getGradeInfo(finalGrade);

    // Calculate distance to next grade bracket
    const getNextGradeBracket = (score) => {
        if (score >= 90) return { next: 100, label: 'Perfect', distance: 100 - score };
        if (score >= 80) return { next: 90, label: 'A', distance: 90 - score };
        if (score >= 70) return { next: 80, label: 'B', distance: 80 - score };
        if (score >= 60) return { next: 70, label: 'C', distance: 70 - score };
        return { next: 60, label: 'D', distance: 60 - score };
    };

    const nextBracket = getNextGradeBracket(finalScore);

    return (
        <div className={`subject-card-modern ${expanded ? 'expanded' : ''}`}>
            <div className="subject-card-main" onClick={onToggle}>
                <div className="subject-info-section">
                    <div className="subject-name-row">
                        <h4 className="subject-name">{subject.subject_name || subject.name}</h4>
                        <span className={`grade-badge-modern ${gradeInfo.class}`}>
                            {gradeInfo.label}
                        </span>
                    </div>
                    <div className="subject-meta-row">
                        <span className="subject-code">{subject.subject_code || subject.code}</span>
                        <span className="meta-divider">{'\u2022'}</span>
                        <span className="subject-credits">{subject.credits || 0} Credits</span>
                        <span className="meta-divider">{'\u2022'}</span>
                        <span className="subject-status">
                            {subject.status === 'active' ? 'In Progress' : 'Completed'}
                        </span>
                    </div>
                </div>

                <div className="subject-grade-section">
                    <div className="grade-progress-wrapper">
                        <div className="grade-value-row">
                            <span className="grade-percentage">{finalScore.toFixed(1)}%</span>
                            {nextBracket.distance > 0 && nextBracket.distance <= 10 && (
                                <span className="next-grade-hint">
                                    {nextBracket.distance.toFixed(1)}% to {nextBracket.label}
                                </span>
                            )}
                        </div>
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar-fill"
                                style={{
                                    width: `${finalScore}%`,
                                    backgroundColor: gradeInfo.color
                                }}
                            />
                        </div>
                    </div>
                    <button className="expand-btn-modern">
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
                        className="subject-breakdown-modern"
                    >
                        <div className="breakdown-header">
                            <h5>Assessment Breakdown</h5>
                            <div className="quick-actions">
                                <button className="quick-action-btn" title="Contact Professor">
                                    <Mail size={14} />
                                </button>
                                <button className="quick-action-btn" title="View Syllabus">
                                    <FileText size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="breakdown-table-modern">
                            {subject.grades && subject.grades.length > 0 ? (
                                subject.grades.map((grade, idx) => (
                                    <div key={idx} className="breakdown-row">
                                        <div className="breakdown-component">
                                            <span className="component-name">{grade.component_name}</span>
                                            <span className="component-weight">{parseFloat(grade.weight_percentage)}% weight</span>
                                        </div>
                                        <div className="breakdown-score">
                                            {grade.marks_obtained !== null ? (
                                                <>
                                                    <span className="score-obtained">{parseFloat(grade.marks_obtained)}</span>
                                                    <span className="score-max">/ {parseFloat(grade.max_marks)}</span>
                                                    <span className="score-percentage">
                                                        ({clampPercentage((parseFloat(grade.marks_obtained) / parseFloat(grade.max_marks)) * 100).toFixed(0)}%)
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="score-pending-badge">Pending</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="breakdown-empty">
                                    <AlertCircle size={16} />
                                    <span>No detailed grades available yet.</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GradesTab;



