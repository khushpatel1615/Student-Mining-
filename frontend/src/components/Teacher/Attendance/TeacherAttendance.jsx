import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import './TeacherAttendance.css'
import toast from 'react-hot-toast'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

// Icons
const CheckIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
const XIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
const ClockIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
const InfoIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
const CalendarIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
const SaveIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>

function TeacherAttendance() {
    const { token } = useAuth()
    const [subjects, setSubjects] = useState([])
    const [selectedSubject, setSelectedSubject] = useState(null)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0 })

    useEffect(() => {
        fetchSubjects()
    }, [])

    useEffect(() => {
        if (selectedSubject && selectedDate) {
            fetchAttendance()
        }
    }, [selectedSubject, selectedDate])

    // Calculate stats whenever students change
    useEffect(() => {
        const newStats = { present: 0, absent: 0, late: 0, excused: 0 }
        let total = 0
        students.forEach(s => {
            const status = s.status || 'present'
            if (newStats[status] !== undefined) {
                newStats[status]++
                total++
            }
        })
        newStats.total = total
        setStats(newStats)
    }, [students])

    const fetchSubjects = async () => {
        try {
            const response = await fetch(`${API_BASE}/teachers.php?action=my_subjects`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success && data.data.length > 0) {
                setSubjects(data.data)
                setSelectedSubject(data.data[0])
            }
        } catch (err) {
            console.error('Failed to fetch subjects:', err)
        }
    }

    const fetchAttendance = async () => {
        setLoading(true)
        try {
            const response = await fetch(
                `${API_BASE}/attendance.php?subject_id=${selectedSubject.id}&date=${selectedDate}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            const data = await response.json()

            if (data.success && data.data && data.data.enrollments) {
                const formattedStudents = data.data.enrollments.map(item => ({
                    id: item.id, // enrollment_id
                    user_id: item.user_id, // student user_id
                    name: item.student_name,
                    code: item.student_code,
                    status: item.attendance_status || 'present', // Default to present
                    remarks: item.remarks || '',
                    isNew: !item.attendance_status
                }))
                setStudents(formattedStudents)
            } else {
                setStudents([])
            }
        } catch (err) {
            console.error('Failed to fetch attendance:', err)
            toast.error('Failed to load attendance list')
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = (enrollmentId, newStatus) => {
        setStudents(prev => prev.map(s =>
            s.id === enrollmentId ? { ...s, status: newStatus } : s
        ))
    }

    const handleRemarksChange = (enrollmentId, newRemarks) => {
        setStudents(prev => prev.map(s =>
            s.id === enrollmentId ? { ...s, remarks: newRemarks } : s
        ))
    }

    const markAllAs = (status) => {
        setStudents(prev => prev.map(s => ({ ...s, status })))
    }

    const saveAttendance = async () => {
        if (!selectedSubject || students.length === 0) return

        setSaving(true)
        const payload = {
            subject_id: selectedSubject.id,
            date: selectedDate,
            students: students.map(s => ({
                user_id: s.user_id, // Important: use user_id here as per API
                status: s.status,
                remarks: s.remarks
            }))
        }

        try {
            const response = await fetch(`${API_BASE}/attendance.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })
            const data = await response.json()

            if (data.success) {
                toast.success('Attendance saved successfully')
                // Optionally refresh to confirm
                // fetchAttendance() 
            } else {
                toast.error(data.error || 'Failed to save attendance')
            }
        } catch (err) {
            console.error('Error saving attendance:', err)
            toast.error('Error connecting to server')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="teacher-attendance">
            <div className="attendance-header">
                <div>
                    <h2>Attendance Management</h2>
                    <p className="subtitle">Track daily student attendance</p>
                </div>

                <div className="header-controls">
                    <div className="control-group">
                        <label>Subject</label>
                        <select
                            className="form-select"
                            value={selectedSubject?.id || ''}
                            onChange={(e) => {
                                const sub = subjects.find(s => s.id == e.target.value)
                                setSelectedSubject(sub)
                            }}
                        >
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="control-group">
                        <label>Date</label>
                        <div className="date-input-wrapper">
                            <CalendarIcon />
                            <input
                                type="date"
                                className="form-input"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                    </div>

                    <button
                        className="btn-save"
                        onClick={saveAttendance}
                        disabled={saving || loading || students.length === 0}
                    >
                        {saving ? 'Saving...' : <><SaveIcon /> Save Attendance</>}
                    </button>
                </div>
            </div>

            <div className="attendance-stats-bar">
                <div className="stat-pill present">
                    <div className="pill-dot"></div>
                    <span>Present: {stats.present}</span>
                </div>
                <div className="stat-pill absent">
                    <div className="pill-dot"></div>
                    <span>Absent: {stats.absent}</span>
                </div>
                <div className="stat-pill late">
                    <div className="pill-dot"></div>
                    <span>Late: {stats.late}</span>
                </div>
                <div className="stat-pill excused">
                    <div className="pill-dot"></div>
                    <span>Excused: {stats.excused}</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-summary">
                    Total: {stats.total} | Rate: {stats.total ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0}%
                </div>
            </div>

            <div className="quick-actions-bar">
                <span>Quick Actions:</span>
                <button className="btn-quick-action" onClick={() => markAllAs('present')}>Mark All Present</button>
                <button className="btn-quick-action" onClick={() => markAllAs('absent')}>Mark All Absent</button>
            </div>

            <div className="attendance-table-container">
                {loading ? (
                    <div className="loading-state">Loading student list...</div>
                ) : students.length > 0 ? (
                    <table className="attendance-table">
                        <thead>
                            <tr>
                                <th>Student ID</th>
                                <th>Name</th>
                                <th align="center">Status</th>
                                <th align="center">Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(student => (
                                <tr key={student.id} className={student.status === 'absent' ? 'row-absent' : ''}>
                                    <td className="col-id">{student.code}</td>
                                    <td className="col-name">
                                        <div className="student-name">{student.name}</div>
                                    </td>
                                    <td className="col-status">
                                        <div className="status-toggles">
                                            <button
                                                className={`status-btn present ${student.status === 'present' ? 'active' : ''}`}
                                                onClick={() => handleStatusChange(student.id, 'present')}
                                                title="Present"
                                            >
                                                <CheckIcon /> P
                                            </button>
                                            <button
                                                className={`status-btn absent ${student.status === 'absent' ? 'active' : ''}`}
                                                onClick={() => handleStatusChange(student.id, 'absent')}
                                                title="Absent"
                                            >
                                                <XIcon /> A
                                            </button>
                                            <button
                                                className={`status-btn late ${student.status === 'late' ? 'active' : ''}`}
                                                onClick={() => handleStatusChange(student.id, 'late')}
                                                title="Late"
                                            >
                                                <ClockIcon /> L
                                            </button>
                                            <button
                                                className={`status-btn excused ${student.status === 'excused' ? 'active' : ''}`}
                                                onClick={() => handleStatusChange(student.id, 'excused')}
                                                title="Excused"
                                            >
                                                <InfoIcon /> E
                                            </button>
                                        </div>
                                    </td>
                                    <td className="col-remarks">
                                        <input
                                            type="text"
                                            className="remarks-input"
                                            placeholder="Optional remarks..."
                                            value={student.remarks}
                                            onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">
                        <p>No students enrolled in this subject.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default TeacherAttendance
