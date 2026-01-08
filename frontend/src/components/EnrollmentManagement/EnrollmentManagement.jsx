import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import './EnrollmentManagement.css'

// Icons
const PlusIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
)

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
)

const UsersIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
)

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
)

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

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
    const [selectedStudent, setSelectedStudent] = useState('')

    // Bulk enroll modal
    const [showBulkModal, setShowBulkModal] = useState(false)
    const [bulkProgram, setBulkProgram] = useState('')
    const [bulkSemester, setBulkSemester] = useState('1')
    const [selectedStudents, setSelectedStudents] = useState([])

    // Calculate default academic year
    const getCurrentAcademicYear = () => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-11
        // If June (5) or later, we are in the start of a year (e.g. 2025-2026)
        // If before June, we are in the second half (e.g. 2024-2025)
        const startYear = currentMonth >= 5 ? currentYear : currentYear - 1;
        return `${startYear}-${startYear + 1}`;
    };

    const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear())
    const [saving, setSaving] = useState(false)
    const [expandedStudents, setExpandedStudents] = useState([])
    const [viewStatus, setViewStatus] = useState('active') // 'active' or 'completed'

    const toggleStudentExpand = (studentId) => {
        setExpandedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        )
    }

    // Fetch programs
    useEffect(() => {
        const fetchPrograms = async () => {
            try {
                const response = await fetch(`${API_BASE}/programs.php`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await response.json()
                if (data.success) {
                    setPrograms(data.data)
                    if (data.data.length > 0) {
                        setSelectedProgram(data.data[0].id.toString())
                        setBulkProgram(data.data[0].id.toString())
                    }
                }
            } catch (err) {
                console.error('Failed to fetch programs:', err)
            }
        }
        fetchPrograms()
    }, [token])

    // Fetch students for bulk enrollment when bulkProgram changes
    useEffect(() => {
        const fetchStudents = async () => {
            if (!bulkProgram) return
            try {
                // Fetch students belonging to the selected program
                const response = await fetch(`${API_BASE}/students.php?role=student&program_id=${bulkProgram}&limit=100`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await response.json()
                if (data.success) {
                    setStudents(data.data)
                    // Reset selection when program changes
                    setSelectedStudents([])
                }
            } catch (err) {
                console.error('Failed to fetch students:', err)
            }
        }
        fetchStudents()
    }, [token, bulkProgram]) // Dependency on bulkProgram

    // Fetch enrollments
    const fetchEnrollments = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            let url = `${API_BASE}/enrollments.php?status=${viewStatus}&`
            if (selectedProgram) url += `program_id=${selectedProgram}&`
            if (selectedSemester) url += `semester=${selectedSemester}&`
            if (selectedStudent) url += `user_id=${selectedStudent}&`

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            const data = await response.json()

            if (data.success) {
                setEnrollments(data.data || [])
            } else {
                setError(data.error || 'Failed to fetch enrollments')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [token, selectedProgram, selectedSemester, selectedStudent, viewStatus])

    useEffect(() => {
        if (selectedProgram) {
            fetchEnrollments()
        }
    }, [fetchEnrollments, selectedProgram])

    const toggleStudentSelection = (studentId) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        )
    }

    const selectAllStudents = () => {
        if (selectedStudents.length === students.length) {
            setSelectedStudents([])
        } else {
            setSelectedStudents(students.map(s => s.id))
        }
    }

    const handleBulkEnroll = async () => {
        if (selectedStudents.length === 0) {
            setError('Please select at least one student')
            return
        }

        setSaving(true)
        setError(null)

        try {
            const response = await fetch(`${API_BASE}/enrollments.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    program_id: parseInt(bulkProgram),
                    semester: parseInt(bulkSemester),
                    user_ids: selectedStudents,
                    academic_year: academicYear
                })
            })

            const data = await response.json()

            if (data.success) {
                setShowBulkModal(false)
                setSelectedStudents([])
                fetchEnrollments()
            } else {
                setError(data.error || 'Failed to enroll students')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const updateEnrollmentStatus = async (enrollmentId, newStatus) => {
        try {
            const response = await fetch(`${API_BASE}/enrollments.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    enrollment_id: enrollmentId,
                    status: newStatus
                })
            })

            const data = await response.json()

            if (data.success) {
                fetchEnrollments()
            } else {
                setError(data.error || 'Failed to update enrollment')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        }
    }

    const currentProgram = programs.find(p => p.id.toString() === selectedProgram)
    const semesters = currentProgram ? Array.from({ length: currentProgram.total_semesters }, (_, i) => i + 1) : []

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'status-completed'
            case 'active': return 'status-active'
            case 'dropped': return 'status-dropped'
            case 'failed': return 'status-failed'
            default: return ''
        }
    }

    return (
        <div className="enrollment-management">
            {/* Header */}
            <div className="enrollment-management-header">
                <h2 className="enrollment-management-title">Enrollment Management</h2>
                <div className="view-toggle">
                    {['active', 'completed', 'dropped', 'failed'].map(status => (
                        <button
                            key={status}
                            className={`toggle-btn ${viewStatus === status ? 'active' : ''}`}
                            onClick={() => setViewStatus(status)}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)} Subjects
                        </button>
                    ))}
                </div>
                <button className="btn-add" onClick={() => setShowBulkModal(true)}>
                    <PlusIcon />
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

            {/* Error Message */}
            {error && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid var(--error)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--error)',
                    fontSize: '0.875rem'
                }}>
                    {error}
                </div>
            )}

            {/* Enrollments Table */}
            {/* Enrollments Table */}
            <div className="enrollments-table-container">
                {loading ? (
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                    </div>
                ) : !selectedProgram ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <UsersIcon />
                        </div>
                        <h3>Select a Program</h3>
                        <p>Choose a program to view enrollments.</p>
                    </div>
                ) : enrollments.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <UsersIcon />
                        </div>
                        <h3>No enrollments found</h3>
                        <p>Use "Bulk Enroll" to enroll students in subjects.</p>
                    </div>
                ) : (
                    <table className="enrollments-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Student ID</th>
                                <th>Subjects</th>
                                <th>Academic Year</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.values(enrollments.reduce((acc, curr) => {
                                if (!acc[curr.user_id]) acc[curr.user_id] = { ...curr, subjects: [] }
                                acc[curr.user_id].subjects.push(curr)
                                return acc
                            }, {})).map(student => (
                                <>
                                    <tr
                                        key={student.user_id}
                                        onClick={() => toggleStudentExpand(student.user_id)}
                                        style={{ cursor: 'pointer', background: expandedStudents.includes(student.user_id) ? 'var(--bg-tertiary)' : 'inherit' }}
                                    >
                                        <td>
                                            <div className="student-info">
                                                <span className="student-name">{student.student_name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="student-id">{student.student_id}</span>
                                        </td>
                                        <td>
                                            <span className="badge">
                                                {student.subjects.length} Subjects
                                            </span>
                                        </td>
                                        <td>{student.academic_year || '-'}</td>
                                        <td>
                                            <button className="btn-icon">
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    width="20"
                                                    height="20"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    style={{ transform: expandedStudents.includes(student.user_id) ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                                                >
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedStudents.includes(student.user_id) && (
                                        <tr className="expanded-row">
                                            <td colSpan="5" style={{ padding: 0 }}>
                                                <div style={{ padding: '1rem', background: 'var(--bg-secondary)' }}>
                                                    <table className="sub-table" style={{ width: '100%' }}>
                                                        <thead style={{ background: 'transparent' }}>
                                                            <tr>
                                                                <th style={{ padding: '0.5rem', fontSize: '0.75rem' }}>Subject</th>
                                                                <th style={{ padding: '0.5rem', fontSize: '0.75rem' }}>Code</th>
                                                                <th style={{ padding: '0.5rem', fontSize: '0.75rem' }}>Semester</th>
                                                                <th style={{ padding: '0.5rem', fontSize: '0.75rem' }}>Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {student.subjects.map(subject => (
                                                                <tr key={subject.enrollment_id || subject.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                                    <td style={{ padding: '0.5rem' }}>{subject.subject_name}</td>
                                                                    <td style={{ padding: '0.5rem' }}>{subject.subject_code}</td>
                                                                    <td style={{ padding: '0.5rem' }}>Semester {subject.semester}</td>
                                                                    <td style={{ padding: '0.5rem' }}>
                                                                        <select
                                                                            className={`status-select ${getStatusColor(subject.status)}`}
                                                                            value={subject.status}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onChange={(e) => updateEnrollmentStatus(subject.enrollment_id || subject.id, e.target.value)}
                                                                        >
                                                                            <option value="active">Active</option>
                                                                            <option value="completed">Completed</option>
                                                                            <option value="dropped">Dropped</option>
                                                                            <option value="failed">Failed</option>
                                                                        </select>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Bulk Enroll Modal */}
            {showBulkModal && (
                <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Bulk Enroll Students</h3>
                            <button className="modal-close" onClick={() => setShowBulkModal(false)}>
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Program *</label>
                                    <select
                                        className="form-select"
                                        value={bulkProgram}
                                        onChange={e => setBulkProgram(e.target.value)}
                                    >
                                        {programs.map(p => (
                                            <option key={p.id} value={p.id}>{p.code}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Semester *</label>
                                    <select
                                        className="form-select"
                                        value={bulkSemester}
                                        onChange={e => setBulkSemester(e.target.value)}
                                    >
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
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                                        onClick={selectAllStudents}
                                    >
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
                                                {selectedStudents.includes(student.id) && <CheckIcon />}
                                            </div>
                                            <div className="student-details">
                                                <span className="student-name">{student.full_name}</span>
                                                <span className="student-id">{student.student_id || student.email}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowBulkModal(false)}>
                                Cancel
                            </button>
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
