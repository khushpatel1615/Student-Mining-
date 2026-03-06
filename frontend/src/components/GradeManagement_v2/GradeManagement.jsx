// ==========================================
// GRADEBOOK v2 — Main Orchestrator Component
// Drop-in replacement for GradeManagement.jsx
// ==========================================
import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, ClipboardList, RefreshCw, AlertTriangle, CheckCircle2, BarChart2, TableIcon } from 'lucide-react';

// Hooks
import { useGradeFilter } from './hooks/useGradeFilter';
import { useGradeData } from './hooks/useGradeData';
import { useGradeEdits } from './hooks/useGradeEdits';

// Components
import GradebookHeader from './components/GradebookHeader';
import GradeStatisticsPanel from './components/GradeStatisticsPanel';
import StudentGradeTable from './components/StudentGradeTable';
import GradeAnalyticsPanel from './components/GradeAnalyticsPanel';
import GradeImportModal from './components/GradeImportModal';

// Utils
import {
    calcClassStats, calcTotalWeight, calcDataCompletion,
} from './utils/gradeCalculations';
import { SEMESTERS } from './utils/constants';

import './GradeManagement.css';

export default function GradeManagementV2() {
    const [searchParams] = useSearchParams();

    // ── Filters ──────────────────────────────────
    const filter = useGradeFilter({
        program: searchParams.get('program_id') || '',
        semester: searchParams.get('semester') || '',
        subject: searchParams.get('subject') || '',
    });

    // ── Grade Data ───────────────────────────────
    const {
        enrollments, criteria, dataQuality,
        loading, error, refetch,
    } = useGradeData(filter.selectedSubject);

    // ── Grade Edits ──────────────────────────────
    const {
        grades, errors, dirty, saving,
        saveError, saveSuccess,
        updateGrade, saveAll, hasErrors,
    } = useGradeEdits(enrollments, criteria, refetch);

    // ── Local UI State ───────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'analytics'
    const [showImport, setShowImport] = useState(false);

    // ── Derived Stats ─────────────────────────────
    const stats = useMemo(() => calcClassStats(enrollments, grades, criteria), [enrollments, grades, criteria]);
    const totalWeight = useMemo(() => calcTotalWeight(criteria), [criteria]);
    const completion = useMemo(() => calcDataCompletion(enrollments, grades, criteria), [enrollments, grades, criteria]);

    const canSave = filter.isValid && filter.selectedSubject !== 'all'
        && enrollments.length > 0 && !saving && !hasErrors();

    const handleSave = useCallback(() => saveAll(filter.selectedSubject), [saveAll, filter.selectedSubject]);
    const handleImportClose = useCallback(() => { setShowImport(false); refetch(); }, [refetch]);

    // ── Render ────────────────────────────────────
    return (
        <div className="gmv2-root">
            <div className="gmv2-container">

                {/* ── Page Header ── */}
                <div className="gmv2-page-header">
                    <div className="gmv2-page-header-left">
                        <div className="gmv2-icon-wrap">
                            <BookOpen size={24} color="#fff" />
                        </div>
                        <div className="gmv2-page-title-group">
                            <span className="gmv2-page-eyebrow">Academic Records</span>
                            <h1 className="gmv2-page-title">Gradebook</h1>
                        </div>
                    </div>
                </div>

                {/* ── Filter Bar ── */}
                <GradebookHeader
                    programs={filter.programs}
                    subjects={filter.subjects}
                    semesters={SEMESTERS}
                    selectedProgram={filter.selectedProgram}
                    setSelectedProgram={filter.setSelectedProgram}
                    selectedSemester={filter.selectedSemester}
                    setSelectedSemester={filter.setSelectedSemester}
                    selectedSubject={filter.selectedSubject}
                    setSelectedSubject={filter.setSelectedSubject}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    canSave={canSave}
                    saving={saving}
                    dirty={dirty}
                    onImport={() => setShowImport(true)}
                    onSave={handleSave}
                />

                {/* ── API Error ── */}
                {error && (
                    <div className="gmv2-error-card">
                        <AlertTriangle size={18} />
                        {error}
                    </div>
                )}

                {/* ── Save Error / Success Banner ── */}
                {saveError && (
                    <div className="gmv2-error-card">
                        <AlertTriangle size={18} />
                        {saveError}
                    </div>
                )}

                {/* ── Unsaved Changes Banner ── */}
                {dirty && !saving && (
                    <div className="gmv2-unsaved-banner">
                        <AlertTriangle size={16} />
                        You have unsaved changes — click Save to persist them.
                    </div>
                )}

                {/* ── Loading ── */}
                {loading && (
                    <div className="gmv2-empty">
                        <RefreshCw size={48} color="#6366f1" className="spin" />
                        <h2 className="gmv2-empty-title">Loading Gradebook…</h2>
                    </div>
                )}

                {/* ── No subject selected ── */}
                {!loading && !filter.selectedSubject && (
                    <div className="gmv2-empty">
                        <div className="gmv2-empty-icon">
                            <ClipboardList size={36} />
                        </div>
                        <h2 className="gmv2-empty-title">Ready to Start Grading?</h2>
                        <p className="gmv2-empty-desc">
                            Select a program, semester, and subject from the filters above
                            to retrieve the student roster and begin managing grades.
                        </p>
                    </div>
                )}

                {/* ── Main content (when subject selected) ── */}
                {!loading && filter.selectedSubject && (
                    <>
                        {/* Stats panel */}
                        <GradeStatisticsPanel
                            stats={stats}
                            dataQuality={dataQuality}
                            totalWeight={totalWeight}
                            dataCompletion={completion}
                        />

                        {/* Tab switcher */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="gmv2-tabs">
                                <button
                                    className={`gmv2-tab ${activeTab === 'roster' ? 'gmv2-tab-active' : ''}`}
                                    onClick={() => setActiveTab('roster')}
                                >
                                    <TableIcon size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                                    Roster
                                </button>
                                <button
                                    className={`gmv2-tab ${activeTab === 'analytics' ? 'gmv2-tab-active' : ''}`}
                                    onClick={() => setActiveTab('analytics')}
                                >
                                    <BarChart2 size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                                    Analytics
                                </button>
                            </div>
                            <span style={{ fontSize: '.72rem', color: '#94a3b8' }}>
                                {enrollments.length} student{enrollments.length !== 1 ? 's' : ''} enrolled
                            </span>
                        </div>

                        {/* Roster Tab */}
                        {activeTab === 'roster' && (
                            <StudentGradeTable
                                enrollments={enrollments}
                                criteria={criteria}
                                grades={grades}
                                errors={errors}
                                searchQuery={searchQuery}
                                updateGrade={updateGrade}
                            />
                        )}

                        {/* Analytics Tab */}
                        {activeTab === 'analytics' && (
                            <GradeAnalyticsPanel
                                enrollments={enrollments}
                                grades={grades}
                                criteria={criteria}
                            />
                        )}
                    </>
                )}
            </div>

            {/* ── Import Overlay ── */}
            {showImport && (
                <GradeImportModal
                    programId={filter.selectedProgram}
                    subjectId={filter.selectedSubject}
                    onClose={handleImportClose}
                />
            )}

            {/* ── Success Toast ── */}
            {saveSuccess && (
                <div className="gmv2-toast gmv2-toast-success">
                    <CheckCircle2 color="#10b981" size={20} />
                    {saveSuccess}
                </div>
            )}
        </div>
    );
}
