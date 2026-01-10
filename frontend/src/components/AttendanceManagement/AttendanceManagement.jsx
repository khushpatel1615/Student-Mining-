import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { QRCodeSVG } from 'qrcode.react'
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

const QrCodeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <line x1="7" y1="7" x2="7" y2="7" />
        <line x1="17" y1="7" x2="17" y2="7" />
        <line x1="17" y1="17" x2="17" y2="17" />
        <line x1="7" y1="17" x2="7" y2="17" />
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

    // Smart Attendance State
    const [activeSession, setActiveSession] = useState(null)
    const [showQR, setShowQR] = useState(false)
    const [startingSession, setStartingSession] = useState(false)
    const [serverIp, setServerIp] = useState(window.location.hostname === 'localhost' ? '' : window.location.hostname)
    const [showIpConfig, setShowIpConfig] = useState(false)


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

    // Auto-refresh when session is active
    useEffect(() => {
        let interval;
        if (activeSession) {
            interval = setInterval(() => {
                fetchAttendance();
            }, 5000); // Refresh every 5 seconds
        }
        return () => clearInterval(interval);
    }, [activeSession, fetchAttendance]);


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

    const handleStartSmartAttendance = async () => {
        if (!selectedSubject) return;
        setStartingSession(true)
        setError(null)
        try {
            const response = await fetch(`${API_BASE}/attendance.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'start_session',
                    subject_id: selectedSubject
                })
            })
            const data = await response.json()
            if (data.success) {
                setActiveSession(data.data)
                setShowQR(true)
                setSuccess(`Smart Session Active! Share QR or Code: ${data.data.session_code}`)
            } else {
                setError(data.error || 'Failed to start smart attendance')
            }
        } catch (err) {
            setError('Network error')
        } finally {
            setStartingSession(false)
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

    // QR Code URL Generation
    const qrValue = activeSession
        ? `${window.location.protocol}//${serverIp || window.location.hostname}:${window.location.port}/student/dashboard?attendance_code=${activeSession.session_code}`
        : '';

    return (
        <div className="attendance-management">
            {/* QR Modal */}
            {showQR && activeSession && (
                <div className="qr-modal-overlay" onClick={() => setShowQR(false)}>
                    <div className="qr-modal" onClick={e => e.stopPropagation()}>
                        <div className="qr-header">
                            <h3>Classroom Attendance</h3>
                            <p>Scanning verifies you are on the class WiFi</p>
                        </div>

                        <div className="pulse-indicator">
                            <span className="dot"></span> LIVE ATTENDANCE SESSION
                        </div>

                        <div className="qr-container">
                            <QRCodeSVG
                                value={qrValue}
                                size={256}
                                level="H"
                                includeMargin={true}
                            />

                            {window.location.hostname === 'localhost' && !serverIp && (
                                <div className="ip-warning" style={{ marginTop: '1.5rem', padding: '1rem', background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '12px', fontSize: '0.85rem' }}>
                                    <p style={{ color: '#9a3412', margin: '0 0 10px 0' }}>💡 <strong>Testing on Phone?</strong></p>
                                    <p style={{ color: '#666', margin: '0 0 10px 0' }}>Students cannot scan "localhost". Enter your computer's LAN IP to update the QR.</p>
                                    <input
                                        type="text"
                                        placeholder="e.g. 192.168.1.10"
                                        className="filter-select"
                                        style={{ width: '100%' }}
                                        value={serverIp}
                                        onChange={(e) => setServerIp(e.target.value)}
                                    />
                                </div>
                            )}

                            <div style={{ marginTop: '10px' }}>
                                <button
                                    onClick={() => setShowIpConfig(!showIpConfig)}
                                    style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    {showIpConfig ? 'Hide Settings' : 'Advanced: Server Settings'}
                                </button>
                                {showIpConfig && (
                                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '0.7rem', color: '#666', textAlign: 'left' }}>Override Host IP:</label>
                                        <input
                                            type="text"
                                            placeholder="Server IP"
                                            className="filter-select"
                                            style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                                            value={serverIp}
                                            onChange={(e) => setServerIp(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="session-details">
                            <div className="code-badge">{activeSession.session_code}</div>
                            <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>
                                Expires: {new Date(activeSession.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </small>
                        </div>

                        <button className="btn-close-modal" onClick={() => setShowQR(false)}>
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="attendance-management-header">
                <h2 className="attendance-management-title">Attendance Management</h2>
                <div className="header-actions">
                    {selectedSubject && (
                        <button
                            className="btn-qr-trigger"
                            onClick={() => fetchAttendance()}
                            disabled={loading}
                            title="Refresh List"
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
                            </svg>
                        </button>
                    )}
                    {selectedSubject && (

                        <button
                            className={`btn-qr-trigger ${activeSession ? 'active' : ''}`}
                            onClick={() => activeSession ? setShowQR(true) : handleStartSmartAttendance()}
                            disabled={startingSession}
                        >
                            <QrCodeIcon />
                            {startingSession ? 'Initializing...' : activeSession ? 'View QR Code' : 'Start QR Session'}
                        </button>
                    )}
                    {selectedSubject && enrollments.length > 0 && (
                        <button className="btn-add" onClick={handleSaveAttendance} disabled={saving}>
                            <SaveIcon />
                            {saving ? 'Saving...' : 'Save Attendance'}
                        </button>
                    )}
                </div>
            </div>

            {/* Active Session Banner */}
            {activeSession && (
                <div className="active-session-banner">
                    <div className="session-info">
                        <div className="pulse-indicator" style={{ margin: 0 }}>
                            <span className="dot"></span> ACTIVE QR SESSION
                        </div>
                        <div className="code-badge">{activeSession.session_code}</div>
                        <span style={{ fontSize: '0.9rem', color: '#666' }}>
                            Students can scan to mark presence
                        </span>
                    </div>
                    <button className="btn-qr-trigger" onClick={() => setShowQR(true)}>
                        Show QR
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="attendance-filters">
                {/* ... existing filters ... */}
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
                        <CheckIcon /> <span>{stats.present}</span> <small>Present</small>
                    </div>
                    <div className="stat absent">
                        <XIcon /> <span>{stats.absent}</span> <small>Absent</small>
                    </div>
                    <div className="stat late">
                        <ClockIcon /> <span>{stats.late}</span> <small>Late</small>
                    </div>
                    <div className="stat optional">
                        <CoffeeIcon /> <span>{stats.optional}</span> <small>Optional</small>
                    </div>
                </div>
            )}

            {/* Bulk Actions */}
            {selectedSubject && enrollments.length > 0 && (
                <div className="bulk-actions">
                    <span>Mark All:</span>
                    <button className="bulk-btn present" onClick={() => markAllAs('present')}>Present</button>
                    <button className="bulk-btn absent" onClick={() => markAllAs('absent')}>Absent</button>
                    <button className="bulk-btn optional" onClick={() => markAllAs('optional')}>Optional</button>
                </div>
            )}

            {/* Attendance List */}
            <div className="attendance-list-container">
                {loading ? (
                    <div className="loading-overlay"><div className="spinner"></div></div>
                ) : !selectedSubject ? (
                    <div className="empty-state">
                        <div className="empty-state-icon"><CalendarIcon /></div>
                        <h3>Select a Subject</h3>
                        <p>Choose a subject to mark attendance.</p>
                    </div>
                ) : enrollments.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon"><CalendarIcon /></div>
                        <h3>No students enrolled</h3>
                        <p>No students are enrolled in this subject yet.</p>
                    </div>
                ) : (
                    <div className="attendance-list">
                        {enrollments.map(enrollment => (
                            <div key={enrollment.id} className="attendance-item">
                                <div className="student-info">
                                    <div className="student-avatar">{enrollment.student_name?.charAt(0).toUpperCase()}</div>
                                    <div className="student-details">
                                        <span className="student-name">{enrollment.student_name}</span>
                                        <span className="student-id">{enrollment.student_id}</span>
                                    </div>
                                </div>
                                <div className="attendance-buttons">
                                    <button className={`att-btn present ${attendance[enrollment.id] === 'present' ? 'active' : ''}`} onClick={() => updateAttendance(enrollment.id, 'present')}><CheckIcon /></button>
                                    <button className={`att-btn absent ${attendance[enrollment.id] === 'absent' ? 'active' : ''}`} onClick={() => updateAttendance(enrollment.id, 'absent')}><XIcon /></button>
                                    <button className={`att-btn late ${attendance[enrollment.id] === 'late' ? 'active' : ''}`} onClick={() => updateAttendance(enrollment.id, 'late')}><ClockIcon /></button>
                                    <button className={`att-btn optional ${attendance[enrollment.id] === 'optional' ? 'active' : ''}`} onClick={() => updateAttendance(enrollment.id, 'optional')}><CoffeeIcon /></button>
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
