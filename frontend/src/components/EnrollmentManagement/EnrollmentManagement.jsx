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
    const [academicYear, setAcademicYear] = useState(new Date().getFullYear() + '-' + (new Date().getFullYear() + 1))
    const [saving, setSaving] = useState(false)

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

    // Fetch students for bulk enrollment
    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const response = await fetch(`${API_BASE}/students.php?role=student&limit=100`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await response.json()
                if (data.success) {
                    setStudents(data.data)
                }
            } catch (err) {
                console.error('Failed to fetch students:', err)
            }
        }
        fetchStudents()
    }, [token])

    // Fetch enrollments
    const fetchEnrollments = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            let url = `${API_BASE}/enrollments.php?`
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
    }, [token, selectedProgram, selectedSemester, selectedStudent])

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
                    id: enrollmentId,
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
            case 'completed': return 'active'
            case 'active': return 'active'
            case 'dropped': return 'inactive'
            case 'failed': return 'inactive'
            default: return ''
        }
    }

    return (
        <div className="enrollment-management">
            {/* Header */}
            <div className="enrollment-management-header">
                <h2 className="enrollment-management-title">Enrollment Management</h2>
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
                                <th>Subject</th>
                                <th>Semester</th>
                                <th>Academic Year</th>
                                <th>Status</th>
                                <th>Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enrollments.map(enrollment => (
                                <tr key={enrollment.id}>
                                    <td>
                                        <div className="student-info">
                                            <span className="student-name">{enrollment.student_name}</span>
                                            <span className="student-id">{enrollment.student_id}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="subject-info">
                                            <span className="subject-name">{enrollment.subject_name}</span>
                                            <span className="subject-code">{enrollment.subject_code}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="semester-badge">{enrollment.semester}</span>
                                    </td>
                                    <td>{enrollment.academic_year || '-'}</td>
                                    <td>
                                        <select
                                            className={`status-select ${getStatusColor(enrollment.status)}`}
                                            value={enrollment.status}
                                            onChange={(e) => updateEnrollmentStatus(enrollment.id, e.target.value)}
                                        >
                                            <option value="active">Active</option>
                                            <option value="completed">Completed</option>
                                            <option value="dropped">Dropped</option>
                                            <option value="failed">Failed</option>
                                        </select>
                                    </td>
                                    <td>
                                        <span className="grade-display">
                                            {enrollment.final_percentage ? `${enrollment.final_percentage}%` : '-'}
                                        </span>
                                    </td>
                                </tr>
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
