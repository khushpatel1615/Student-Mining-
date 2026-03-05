import { useState, useEffect, useCallback, useRef } from 'react'
import {
    BookOpen, ChevronDown, MoreVertical,
    User, Calendar, Hash, Eye, Edit3, UserMinus, Plus, Check, Users
} from 'lucide-react'

import apiClient from '../../utils/apiClient'
import { useAuth } from '../../context/AuthContext'
import SkeletonTable from '../ui/SkeletonTable'
import EmptyState from '../EmptyState/EmptyState'
import './EnrollmentManagement.css'

// ─── Helpers ────────────────────────────────────────────────────────────────

const toSentenceCase = (str) => {
    if (!str) return ''
    return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const getInitials = (name) => {
    if (!name) return '??'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const getAcademicYearFromDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-'
    const year = date.getFullYear()
    const month = date.getMonth()
    const startYear = month >= 5 ? year : year - 1
    return `${startYear}-${startYear + 1}`
}

const formatDate = (dateString) => {
    if (!dateString) return null
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    active: { label: 'Active', accent: '#16a34a', bg: '#16a34a' },
    completed: { label: 'Completed', accent: '#4f46e5', bg: '#4f46e5' },
    dropped: { label: 'Dropped', accent: '#64748b', bg: '#64748b' },
    failed: { label: 'Failed', accent: '#dc2626', bg: '#dc2626' },
}

const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.active

// ─── Action Menu (Kebab) ─────────────────────────────────────────────────────

const ActionMenu = ({ student }) => {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div className="ec-action-menu" ref={ref}>
            <button
                className="ec-kebab-btn"
                onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
                title="Actions"
            >
                <MoreVertical size={15} />
            </button>
            {open && (
                <div className="ec-dropdown" onClick={e => e.stopPropagation()}>
                    <button className="ec-dropdown-item">
                        <Eye size={14} /> View Profile
                    </button>
                    <button className="ec-dropdown-item">
                        <Edit3 size={14} /> Edit
                    </button>
                    <button className="ec-dropdown-item danger">
                        <UserMinus size={14} /> Unenroll
                    </button>
                </div>
            )}
        </div>
    )
}

// ─── Student Enrollment Card ─────────────────────────────────────────────────

const StudentEnrollmentCard = ({
    student,
    expanded,
    onToggle,
    selected,
    onSelect,
    getStatusColor,
    updateEnrollmentStatus
}) => {
    const sc = getStatusConfig(student.status || student.subjects?.[0]?.status || 'active')
    const enrolledOn = formatDate(student.enrolled_at)
    const academicYear = student.academic_year || getAcademicYearFromDate(student.enrolled_at)

    // Derive overall card status from subjects if not on student
    const cardStatus = student.status || student.subjects?.[0]?.status || 'active'
    const accentColor = getStatusConfig(cardStatus).accent

    return (
        <div
            className={`ec-card ${expanded ? 'ec-card--expanded' : ''} ${selected ? 'ec-card--selected' : ''}`}
            style={{ '--accent-color': accentColor }}
        >
            {/* Main Row */}
            <div className="ec-card-main" onClick={onToggle}>

                {/* Checkbox */}
                <div className="ec-checkbox-wrap" onClick={e => { e.stopPropagation(); onSelect() }}>
                    <div className={`ec-checkbox ${selected ? 'ec-checkbox--checked' : ''}`}>
                        {selected && <Check size={11} strokeWidth={3} />}
                    </div>
                </div>

                {/* Avatar + Name */}
                <div className="ec-identity">
                    <div className="ec-avatar">
                        {student.avatar_url
                            ? <img src={student.avatar_url} alt={student.student_name} />
                            : getInitials(student.student_name)
                        }
                    </div>
                    <div className="ec-identity-info">
                        <span className="ec-name">{toSentenceCase(student.student_name)}</span>
                        {student.program_code && (
                            <span className="ec-dept">{student.program_code}</span>
                        )}
                    </div>
                </div>

                {/* Meta: Enrollment ID */}
                <div className="ec-meta-block">
                    <span className="ec-meta-label">
                        <Hash size={11} /> Enrollment ID
                    </span>
                    <span className="ec-meta-value mono">{student.student_id || '—'}</span>
                </div>

                {/* Meta: Subjects */}
                <div className="ec-meta-block">
                    <span className="ec-meta-label">
                        <BookOpen size={11} /> Subjects
                    </span>
                    <span className="ec-subjects-pill">
                        <BookOpen size={12} />
                        {student.subjects.length}
                    </span>
                </div>

                {/* Meta: Academic Year */}
                <div className="ec-meta-block">
                    <span className="ec-meta-label">
                        <Calendar size={11} /> Academic Year
                    </span>
                    <span className="ec-meta-value">{academicYear}</span>
                </div>

                {/* Status Badge */}
                <div className="ec-status-wrap">
                    <span
                        className="ec-status-badge"
                        style={{ background: accentColor }}
                    >
                        {toSentenceCase(cardStatus)}
                    </span>
                </div>

                {/* Actions */}
                <div className="ec-actions-wrap" onClick={e => e.stopPropagation()}>
                    <ActionMenu student={student} />
                    <button
                        className={`ec-chevron ${expanded ? 'ec-chevron--open' : ''}`}
                        onClick={onToggle}
                        title="Toggle Details"
                    >
                        <ChevronDown size={16} />
                    </button>
                </div>
            </div>

            {/* Expanded: Subject Chips */}
            {expanded && (
                <div className="ec-subjects-panel">
                    <div className="ec-subjects-header">
                        <span>Enrolled Subjects</span>
                        {enrolledOn && (
                            <span className="ec-enrolled-date">Enrolled {enrolledOn}</span>
                        )}
                    </div>
                    <div className="ec-subjects-grid">
                        {student.subjects.map(subject => (
                            <div key={subject.enrollment_id || subject.id} className="ec-subject-chip">
                                <div className="ec-chip-left">
                                    <span className="ec-chip-code">{subject.subject_code}</span>
                                    <span className="ec-chip-name">{subject.subject_name}</span>
                                    <span className="ec-chip-sem">Sem {subject.semester}</span>
                                </div>
                                <select
                                    className={`status-select ${getStatusColor(subject.status)}`}
                                    value={subject.status}
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => updateEnrollmentStatus(subject.enrollment_id || subject.id, e.target.value)}
                                >
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                    <option value="dropped">Dropped</option>
                                    <option value="failed">Failed</option>
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Main Component ──────────────────────────────────────────────────────────

function EnrollmentManagement() {
    const { token } = useAuth()
    const [enrollments, setEnrollments] = useState([])
    const [programs, setPrograms] = useState([])
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Filters
    const [selectedProgram, setSelectedProgram] = useState('')
    const [selectedSemester, setSelectedSemester] = useState('')

    // Bulk enroll modal
    const [showBulkModal, setShowBulkModal] = useState(false)
    const [bulkProgram, setBulkProgram] = useState('')
    const [bulkSemester, setBulkSemester] = useState('1')
    const [selectedStudents, setSelectedStudents] = useState([])

    // Bulk card selection
    const [selectedCards, setSelectedCards] = useState([])

    const getCurrentAcademicYear = () => {
        const now = new Date()
        const y = now.getFullYear()
        const m = now.getMonth()
        const s = m >= 5 ? y : y - 1
        return `${s}-${s + 1}`
    }

    const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear())
    const [saving, setSaving] = useState(false)
    const [expandedStudents, setExpandedStudents] = useState([])
    const [viewStatus, setViewStatus] = useState('all')

    const toggleStudentExpand = (id) => {
        setExpandedStudents(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const toggleCardSelect = (id) => {
        setSelectedCards(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    // Fetch programs
    useEffect(() => {
        const fetchPrograms = async () => {
            try {
                const data = await apiClient.get('/programs.php');
                if (data.success) {
                    setPrograms(data.data)
                    if (data.data.length > 0) {
                        setSelectedProgram(data.data[0].id.toString())
                        setBulkProgram(data.data[0].id.toString())
                    }
                }
            } catch {
                // Failed to fetch programs
            }
        }
        fetchPrograms()
    }, [])

    // Fetch students for bulk enrollment
    useEffect(() => {
        const fetchStudents = async () => {
            if (!bulkProgram) return
            try {
                const data = await apiClient.get('/students.php', { role: 'student', program_id: bulkProgram, limit: 100 });
                if (data.success) {
                    setStudents(data.data)
                    setSelectedStudents([])
                }
            } catch {
                // Failed to fetch students
            }
        }
        fetchStudents()
    }, [bulkProgram])

    // Fetch enrollments
    const fetchEnrollments = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = { status: viewStatus }
            if (selectedProgram) params.program_id = selectedProgram
            if (selectedSemester) params.semester = selectedSemester
            const data = await apiClient.get('/enrollments.php', params);
            if (data.success) {
                setEnrollments(data.data || [])
            } else {
                setError(data.error || 'Failed to fetch enrollments')
            }
        } catch {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [selectedProgram, selectedSemester, viewStatus])

    useEffect(() => {
        if (selectedProgram) fetchEnrollments()
    }, [fetchEnrollments, selectedProgram])

    const toggleStudentSelection = (id) => {
        setSelectedStudents(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const selectAllStudents = () => {
        setSelectedStudents(prev =>
            prev.length === students.length ? [] : students.map(s => s.id)
        )
    }

    const handleBulkEnroll = async () => {
        if (selectedStudents.length === 0) { setError('Please select at least one student'); return }
        setSaving(true)
        setError(null)
        try {
            const data = await apiClient.post('/enrollments.php', {
                program_id: parseInt(bulkProgram),
                semester: parseInt(bulkSemester),
                user_ids: selectedStudents,
                academic_year: academicYear
            });
            if (data.success) {
                setShowBulkModal(false)
                setSelectedStudents([])
                fetchEnrollments()
            } else {
                setError(data.error || 'Failed to enroll students')
            }
        } catch {
            setError('Network error. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const updateEnrollmentStatus = async (enrollmentId, newStatus) => {
        const snapshot = [...enrollments]
        setEnrollments(current =>
            current.map(item =>
                (item.enrollment_id || item.id) === enrollmentId
                    ? { ...item, status: newStatus }
                    : item
            )
        )
        try {
            const data = await apiClient.put('/enrollments.php', { enrollment_id: enrollmentId, status: newStatus });
            if (!data.success) {
                setError(data.error || 'Failed to update enrollment')
                setEnrollments(snapshot)
            }
        } catch {
            setError('Network error. Please try again.')
            setEnrollments(snapshot)
        }
    }

    const getStatusColor = (status) => {
        const map = { 'completed': 'status-completed', 'active': 'status-active', 'dropped': 'status-dropped', 'failed': 'status-failed' }
        return map[status] || ''
    }

    const currentProgram = programs.find(p => p.id.toString() === selectedProgram)
    const semesters = currentProgram
        ? Array.from({ length: currentProgram.total_semesters }, (_, i) => i + 1)
        : []

    // Group enrollments by student
    const studentList = Object.values(
        enrollments.reduce((acc, curr) => {
            if (!acc[curr.user_id]) acc[curr.user_id] = { ...curr, subjects: [] }
            acc[curr.user_id].subjects.push(curr)
            return acc
        }, {})
    )

    const allSelected = selectedCards.length === studentList.length && studentList.length > 0

    return (
        <div className="enrollment-management">
            {/* Header */}
            <div className="enrollment-management-header">
                <h2 className="enrollment-management-title">Enrollment Management</h2>
                <div className="view-toggle">
                    {['all', 'active', 'completed', 'dropped', 'failed'].map(status => (
                        <button
                            key={status}
                            className={`toggle-btn ${viewStatus === status ? 'active' : ''}`}
                            onClick={() => setViewStatus(status)}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
                <button className="btn-add" onClick={() => setShowBulkModal(true)}>
                    <Plus size={16} />
                    Bulk Enroll
                </button>
            </div>

            {/* Filters */}
            <div className="enrollment-filters">
                <select
                    className="filter-select"
                    value={selectedProgram}
                    onChange={(e) => { setSelectedProgram(e.target.value); setSelectedSemester('') }}
                >
                    <option value="">Select Program</option>
                    {programs.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                </select>
                <select
                    className="filter-select"
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    disabled={!selectedProgram}
                >
                    <option value="">All Semesters</option>
                    {semesters.map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                    ))}
                </select>
            </div>

            {/* Error */}
            {error && (
                <div className="ec-error-msg">{error}</div>
            )}

            {/* Cards List */}
            <div className="enrollments-table-container">
                {loading ? (
                    <SkeletonTable rows={8} columns={5} />
                ) : !selectedProgram ? (
                    <EmptyState
                        icon={Users}
                        title="Select a Program"
                        description="Choose a program from the filters above to view and manage student enrollments."
                    />
                ) : studentList.length === 0 ? (
                    <EmptyState
                        icon={Check}
                        title="No Enrollments Found"
                        description="No students are enrolled. Use 'Bulk Enroll' to get started."
                        actionText="Bulk Enroll"
                        onAction={() => setShowBulkModal(true)}
                    />
                ) : (
                    <>
                        {/* Bulk selection bar */}
                        {selectedCards.length > 0 && (
                            <div className="ec-bulk-bar">
                                <span>{selectedCards.length} student{selectedCards.length > 1 ? 's' : ''} selected</span>
                                <button className="ec-bulk-btn danger" onClick={() => setSelectedCards([])}>
                                    Clear selection
                                </button>
                            </div>
                        )}

                        {/* Column header */}
                        <div className="ec-list-header">
                            <div
                                className={`ec-checkbox ${allSelected ? 'ec-checkbox--checked' : ''}`}
                                onClick={() => setSelectedCards(allSelected ? [] : studentList.map(s => s.user_id))}
                            >
                                {allSelected && <Check size={11} strokeWidth={3} />}
                            </div>
                            <span>Student</span>
                            <span>Enrollment ID</span>
                            <span>Subjects</span>
                            <span>Academic Year</span>
                            <span>Status</span>
                            <span></span>
                        </div>

                        <div className="ec-cards-list">
                            {studentList.map(student => (
                                <StudentEnrollmentCard
                                    key={student.user_id}
                                    student={student}
                                    expanded={expandedStudents.includes(student.user_id)}
                                    onToggle={() => toggleStudentExpand(student.user_id)}
                                    selected={selectedCards.includes(student.user_id)}
                                    onSelect={() => toggleCardSelect(student.user_id)}
                                    getStatusColor={getStatusColor}
                                    updateEnrollmentStatus={updateEnrollmentStatus}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Bulk Enroll Modal */}
            {showBulkModal && (
                <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Bulk Enroll Students</h3>
                            <button className="modal-close" onClick={() => setShowBulkModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Program *</label>
                                    <select className="form-select" value={bulkProgram} onChange={e => setBulkProgram(e.target.value)}>
                                        {programs.map(p => (
                                            <option key={p.id} value={p.id}>{p.code}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Semester *</label>
                                    <select className="form-select" value={bulkSemester} onChange={e => setBulkSemester(e.target.value)}>
                                        {[1, 2, 3, 4, 5, 6].map(s => (
                                            <option key={s} value={s}>Semester {s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Academic Year</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={academicYear}
                                        onChange={e => setAcademicYear(e.target.value)}
                                        placeholder="2024-2025"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <label className="form-label" style={{ margin: 0 }}>
                                        Select Students ({selectedStudents.length} selected)
                                    </label>
                                    <button type="button" className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }} onClick={selectAllStudents}>
                                        {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>
                                <div className="student-selection-list">
                                    {students.map(student => (
                                        <div
                                            key={student.id}
                                            className={`student-selection-item ${selectedStudents.includes(student.id) ? 'selected' : ''}`}
                                            onClick={() => toggleStudentSelection(student.id)}
                                        >
                                            <div className="student-checkbox">
                                                {selectedStudents.includes(student.id) && <Check size={12} />}
                                            </div>
                                            <div className="student-details">
                                                <span className="student-name">{toSentenceCase(student.full_name)}</span>
                                                <span className="student-id tabular-nums">{student.student_id || student.email}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowBulkModal(false)}>Cancel</button>
                            <button
                                className="btn-primary"
                                onClick={handleBulkEnroll}
                                disabled={saving || selectedStudents.length === 0}
                            >
                                {saving ? 'Enrolling...' : `Enroll ${selectedStudents.length} Students`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default EnrollmentManagement
