// ==========================================
// GRADEBOOK v2 — GradebookHeader
// Filters row + action buttons
// ==========================================
import { GraduationCap, BookOpen, BarChart3, Search, Upload, Save, RefreshCw, ChevronDown } from 'lucide-react';

export default function GradebookHeader({
    programs, subjects, semesters,
    selectedProgram, setSelectedProgram,
    selectedSemester, setSelectedSemester,
    selectedSubject, setSelectedSubject,
    searchQuery, setSearchQuery,
    canSave, saving, dirty,
    onImport, onSave,
}) {
    return (
        <div className="gmv2-filter-bar">
            {/* Program */}
            <div className="gmv2-select-wrap">
                <GraduationCap size={16} className="gmv2-select-icon" />
                <select
                    className="gmv2-select"
                    value={selectedProgram}
                    onChange={e => setSelectedProgram(e.target.value)}
                >
                    <option value="">Select Program…</option>
                    {programs.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                </select>
                <ChevronDown size={14} className="gmv2-select-chevron" />
            </div>

            {/* Semester */}
            <div className="gmv2-select-wrap gmv2-select-sm">
                <BarChart3 size={16} className="gmv2-select-icon" />
                <select
                    className="gmv2-select"
                    value={selectedSemester}
                    onChange={e => setSelectedSemester(e.target.value)}
                >
                    <option value="">All Semesters</option>
                    {semesters.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                </select>
                <ChevronDown size={14} className="gmv2-select-chevron" />
            </div>

            {/* Subject */}
            <div className="gmv2-select-wrap gmv2-select-lg">
                <BookOpen size={16} className="gmv2-select-icon" />
                <select
                    className="gmv2-select"
                    value={selectedSubject}
                    onChange={e => setSelectedSubject(e.target.value)}
                >
                    <option value="">Select Subject…</option>
                    {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                </select>
                <ChevronDown size={14} className="gmv2-select-chevron" />
            </div>

            {/* Search */}
            <div className="gmv2-search-wrap">
                <Search size={16} className="gmv2-select-icon" />
                <input
                    className="gmv2-search"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search student name or ID…"
                />
            </div>

            {/* Actions */}
            <div className="gmv2-header-actions">
                {selectedSubject && (
                    <button className="gmv2-btn gmv2-btn-ghost" onClick={onImport}>
                        <Upload size={15} /> Import
                    </button>
                )}
                <button
                    className="gmv2-btn gmv2-btn-primary"
                    onClick={onSave}
                    disabled={!canSave}
                >
                    {saving
                        ? <><RefreshCw size={15} className="spin" />Saving…</>
                        : <><Save size={15} />Save{dirty ? ' *' : ''}</>
                    }
                </button>
            </div>
        </div>
    );
}
