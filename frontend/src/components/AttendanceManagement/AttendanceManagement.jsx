import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import './AttendanceManagement.css'

// Icons
const SaveIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
    </svg>
)

const CalendarIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
)

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
)

const XIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
)

const ClockIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
)

const CoffeeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
)

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

function AttendanceManagement() {
    const { token } = useAuth()
    const [programs, setPrograms] = useState([])
    const [subjects, setSubjects] = useState([])
    const [enrollments, setEnrollments] = useState([])
    const [attendance, setAttendance] = useState({})
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)

    // Filters
    const [selectedProgram, setSelectedProgram] = useState('')
    const [selectedSemester, setSelectedSemester] = useState('')
    const [selectedSubject, setSelectedSubject] = useState('')
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

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
                    }
                }
            } catch (err) {
                console.error('Failed to fetch programs:', err)
            }
        }
        fetchPrograms()
    }, [token])

    // Fetch subjects
    useEffect(() => {
        const fetchSubjects = async () => {
            if (!selectedProgram) return

            try {
                let url = `${API_BASE}/subjects.php?program_id=${selectedProgram}`
                if (selectedSemester) url += `&semester=${selectedSemester}`

                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await response.json()
                if (data.success) {
                    setSubjects(data.data)
                    setSelectedSubject('')
                }
            } catch (err) {
                console.error('Failed to fetch subjects:', err)
            }
        }
        fetchSubjects()
    }, [token, selectedProgram, selectedSemester])

    // Fetch attendance
    const fetchAttendance = useCallback(async () => {
        if (!selectedSubject || !selectedDate) return

        try {
            setLoading(true)
            setError(null)

            const response = await fetch(
                `${API_BASE}/attendance.php?subject_id=${selectedSubject}&date=${selectedDate}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            const data = await response.json()

            if (data.success) {
                setEnrollments(data.data.enrollments || [])

                // Initialize attendance object
                const attendanceObj = {}
                data.data.enrollments?.forEach(enrollment => {
                    const existing = enrollment.attendance_status
                    attendanceObj[enrollment.id] = existing || 'present'
                })
                setAttendance(attendanceObj)
            } else {
                setError(data.error || 'Failed to fetch attendance')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [token, selectedSubject, selectedDate])

    useEffect(() => {
        fetchAttendance()
    }, [fetchAttendance])

    const updateAttendance = (enrollmentId, status) => {
        setAttendance(prev => ({
            ...prev,
            [enrollmentId]: status
        }))
    }

    const markAllAs = (status) => {
        const updated = {}
        enrollments.forEach(e => {
            updated[e.id] = status
        })
        setAttendance(updated)
    }

    const handleSaveAttendance = async () => {
        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const attendanceData = Object.entries(attendance).map(([enrollmentId, status]) => ({
                enrollment_id: parseInt(enrollmentId),
                attendance_date: selectedDate,
                status: status
            }))

            const response = await fetch(`${API_BASE}/attendance.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ attendance: attendanceData })
            })

            const data = await response.json()

            if (data.success) {
                setSuccess('Attendance saved successfully!')
                setTimeout(() => setSuccess(null), 3000)
            } else {
                setError(data.error || 'Failed to save attendance')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const getAttendanceStats = () => {
        const total = enrollments.length
        const present = Object.values(attendance).filter(s => s === 'present').length
        const absent = Object.values(attendance).filter(s => s === 'absent').length
        const late = Object.values(attendance).filter(s => s === 'late').length
        const optional = Object.values(attendance).filter(s => s === 'optional').length
        return { total, present, absent, late, optional }
    }

    const stats = getAttendanceStats()
    const currentProgram = programs.find(p => p.id.toString() === selectedProgram)
    const semesters = currentProgram ? Array.from({ length: currentProgram.total_semesters }, (_, i) => i + 1) : []

    return (
        <div className="attendance-management">
            {/* Header */}
            <div className="attendance-management-header">
                <h2 className="attendance-management-title">Attendance Management</h2>
                {selectedSubject && enrollments.length > 0 && (
                    <button className="btn-add" onClick={handleSaveAttendance} disabled={saving}>
                        <SaveIcon />
                        {saving ? 'Saving...' : 'Save Attendance'}
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="attendance-filters">
                <select
                    className="filter-select"
                    value={selectedProgram}
                    onChange={(e) => { setSelectedProgram(e.target.value); setSelectedSemester(''); setSelectedSubject('') }}
                >
                    <option value="">Select Program</option>
                    {programs.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                </select>
                <select
                    className="filter-select"
                    value={selectedSemester}
                    onChange={(e) => { setSelectedSemester(e.target.value); setSelectedSubject('') }}
                    disabled={!selectedProgram}
                >
                    <option value="">All Semesters</option>
                    {semesters.map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                    ))}
                </select>
                <select
                    className="filter-select"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    disabled={!selectedProgram}
                >
                    <option value="">Select Subject</option>
                    {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                <input
                    type="date"
                    className="filter-select date-input"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                />
            </div>

            {/* Messages */}
            {error && <div className="message error">{error}</div>}
            {success && <div className="message success">{success}</div>}

            {/* Stats */}
            {selectedSubject && enrollments.length > 0 && (
                <div className="attendance-stats">
                    <div className="stat present">
                        <CheckIcon />
                        <span>{stats.present}</span>
                        <small>Present</small>
                    </div>
                    <div className="stat absent">
                        <XIcon />
                        <span>{stats.absent}</span>
                        <small>Absent</small>
                    </div>
                    <div className="stat late">
                        <ClockIcon />
                        <span>{stats.late}</span>
                        <small>Late</small>
                    </div>
                    <div className="stat optional">
                        <CoffeeIcon />
                        <span>{stats.optional}</span>
                        <small>Optional</small>
                    </div>
                </div>
            )}

            {/* Bulk Actions */}
            {selectedSubject && enrollments.length > 0 && (
                <div className="bulk-actions">
                    <span>Mark All:</span>
                    <button className="bulk-btn present" onClick={() => markAllAs('present')}>Present</button>
                    <button className="bulk-btn absent" onClick={() => markAllAs('absent')}>Absent</button>
                    <button className="bulk-btn optional" onClick={() => markAllAs('optional')}>
                        Optional / No Class
                    </button>
                </div>
            )}

            {/* Attendance List */}
            <div className="attendance-list-container">
                {loading ? (
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                    </div>
                ) : !selectedSubject ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <CalendarIcon />
                        </div>
                        <h3>Select a Subject</h3>
                        <p>Choose a subject to mark attendance.</p>
                    </div>
                ) : enrollments.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <CalendarIcon />
                        </div>
                        <h3>No students enrolled</h3>
                        <p>No students are enrolled in this subject yet.</p>
                    </div>
                ) : (
                    <div className="attendance-list">
                        {enrollments.map(enrollment => (
                            <div key={enrollment.id} className="attendance-item">
                                <div className="student-info">
                                    <div className="student-avatar">
                                        {enrollment.student_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="student-details">
                                        <span className="student-name">{enrollment.student_name}</span>
                                        <span className="student-id">{enrollment.student_id}</span>
                                    </div>
                                </div>
                                <div className="attendance-buttons">
                                    <button
                                        className={`att-btn present ${attendance[enrollment.id] === 'present' ? 'active' : ''}`}
                                        onClick={() => updateAttendance(enrollment.id, 'present')}
                                        title="Present"
                                    >
                                        <CheckIcon />
                                    </button>
                                    <button
                                        className={`att-btn absent ${attendance[enrollment.id] === 'absent' ? 'active' : ''}`}
                                        onClick={() => updateAttendance(enrollment.id, 'absent')}
                                        title="Absent"
                                    >
                                        <XIcon />
                                    </button>
                                    <button
                                        className={`att-btn late ${attendance[enrollment.id] === 'late' ? 'active' : ''}`}
                                        onClick={() => updateAttendance(enrollment.id, 'late')}
                                        title="Late"
                                    >
                                        <ClockIcon />
                                    </button>
                                    <button
                                        className={`att-btn optional ${attendance[enrollment.id] === 'optional' ? 'active' : ''}`}
                                        onClick={() => updateAttendance(enrollment.id, 'optional')}
                                        title="Optional / Excused"
                                    >
                                        <CoffeeIcon />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default AttendanceManagement
