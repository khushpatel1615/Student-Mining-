import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ArrowLeft,
    User,
    Mail,
    GraduationCap,
    BookOpen,
    Calendar,
    CalendarPlus,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    Clock,
    Award,
    BarChart2,
    X,
    Trash2,
    Zap
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config';
import StudentMiningProfile from '../components/Analytics/StudentMiningProfile'
import './StudentProfilePage.css'



function StudentProfilePage() {
    const { studentId } = useParams()
    const navigate = useNavigate()
    const { token } = useAuth()

    const [student, setStudent] = useState(null)
    const [enrollments, setEnrollments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Meeting State
    const [showMeetingForm, setShowMeetingForm] = useState(false)
    const [sendingMeeting, setSendingMeeting] = useState(false)
    const [meetingData, setMeetingData] = useState({
        title: '',
        date: '',
        time: '',
        duration: '30',
        message: ''
    })

    const [meetings, setMeetings] = useState([])

    const fetchMeetings = async () => {
        if (!student) return
        try {
            const response = await fetch(`${API_BASE}/calendar.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                // Filter for meetings with this student
                const studentMeetings = data.data.filter(event =>
                    (event.title && event.title.toLowerCase().includes(student.full_name.toLowerCase())) ||
                    (event.description && event.description.toLowerCase().includes(student.full_name.toLowerCase()))
                )
                // Filter for future events only
                const futureMeetings = studentMeetings.filter(m => new Date(m.event_date) >= new Date().setHours(0, 0, 0, 0))

                // Sort by date
                futureMeetings.sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
                setMeetings(futureMeetings)
            }
        } catch (err) {
            console.error('Error fetching meetings:', err)
        }
    }

    // Fetch meetings when student is loaded
    useEffect(() => {
        if (student) {
            fetchMeetings()
        }
    }, [student, token])

    const handleCancelMeeting = async (meetingId) => {
        if (!window.confirm('Are you sure you want to cancel this meeting?')) return

        try {
            const response = await fetch(`${API_BASE}/calendar.php?id=${meetingId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()

            if (data.success) {
                // Remove from state
                setMeetings(prev => prev.filter(m => m.id !== meetingId))

                // Notify student
                await fetch(`${API_BASE}/notifications.php`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: student.user_id || student.id,
                        title: 'Meeting Cancelled',
                        message: `The meeting request has been cancelled by the admin.`,
                        type: 'meeting_cancelled'
                    })
                })
                window.alert('Meeting cancelled successfully')
            } else {
                window.alert(data.error || 'Failed to delete meeting')
            }
        } catch (err) {
            console.error('Error cancelling meeting:', err)
            window.alert('Error cancelling meeting')
        }
    }

    const handleScheduleMeeting = async (e) => {
        e.preventDefault()
        if (!student) return

        setSendingMeeting(true)
        try {
            // Try to create calendar event (optional)
            try {
                await fetch(`${API_BASE}/calendar.php`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: meetingData.title,
                        description: meetingData.message || `Meeting scheduled with ${student.full_name}`,
                        event_date: meetingData.date,
                        type: 'event',
                        target_audience: 'program_semester',
                        target_program_id: student.program_id || null,
                        target_semester: student.current_semester || null
                    })
                })
            } catch (calErr) {
                console.log('Calendar event creation optional, continuing...', calErr)
            }

            // Send notification to the student
            const notifResponse = await fetch(`${API_BASE}/notifications.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: student.user_id || student.id,
                    title: 'Meeting Request',
                    message: `Admin has scheduled a meeting: "${meetingData.title}" on ${new Date(meetingData.date).toLocaleDateString()} at ${meetingData.time}. Duration: ${meetingData.duration} mins. ${meetingData.message ? `Note: ${meetingData.message}` : ''} Please confirm.`
                })
            })

            const notifData = await notifResponse.json()

            if (notifData.success) {
                window.alert(`Meeting request sent to ${student.full_name}!`)
                setShowMeetingForm(false)
                setMeetingData({
                    title: '',
                    date: '',
                    time: '',
                    duration: '30',
                    message: ''
                })
                fetchMeetings()
            } else {
                window.alert(notifData.error || 'Failed to send meeting request')
            }
        } catch (err) {
            console.error('Error scheduling meeting:', err)
            window.alert('Failed to schedule meeting. Network error.')
        } finally {
            setSendingMeeting(false)
        }
    }

    useEffect(() => {
        const fetchStudentData = async () => {
            try {
                setLoading(true)

                // Fetch student details
                const studentRes = await fetch(`${API_BASE}/students.php?id=${studentId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const studentData = await studentRes.json()

                if (studentData.success && studentData.data) {
                    setStudent(studentData.data)
                } else {
                    setError('Student not found')
                    return
                }

                // Fetch student enrollments/grades
                const enrollRes = await fetch(`${API_BASE}/grades.php?student_id=${studentId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const enrollData = await enrollRes.json()

                if (enrollData.success) {
                    setEnrollments(enrollData.data?.enrollments || [])
                }

            } catch (err) {
                console.error('Error fetching student:', err)
                setError('Failed to load student data')
            } finally {
                setLoading(false)
            }
        }

        if (studentId) {
            fetchStudentData()
        }
    }, [studentId, token])

    // Calculate overall stats
    const calculateStats = () => {
        if (!enrollments.length) return { gpa: 0, attendance: 0, passed: 0, total: 0 }

        let totalPercentage = 0
        let count = 0
        let passed = 0

        enrollments.forEach(e => {
            if (e.final_percentage) {
                totalPercentage += parseFloat(e.final_percentage)
                count++
                if (parseFloat(e.final_percentage) >= 50) passed++
            }
        })

        const avgPercentage = count > 0 ? totalPercentage / count : 0
        const gpa = (avgPercentage / 100) * 4

        return {
            gpa: gpa.toFixed(2),
            avgPercentage: avgPercentage.toFixed(1),
            passed,
            total: count,
            passRate: count > 0 ? ((passed / count) * 100).toFixed(0) : 0
        }
    }

    const stats = calculateStats()

    const getStatusBadge = (percentage) => {
        const p = parseFloat(percentage) || 0
        if (p >= 85) return { class: 'excellent', text: 'Excellent' }
        if (p >= 75) return { class: 'good', text: 'Good' }
        if (p >= 60) return { class: 'average', text: 'Average' }
        if (p >= 50) return { class: 'pass', text: 'Pass' }
        return { class: 'fail', text: 'At Risk' }
    }

    if (loading) {
        return (
            <div className="student-profile-page">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading student profile...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="student-profile-page">
                <div className="error-container">
                    <AlertTriangle size={48} />
                    <h2>Error</h2>
                    <p>{error}</p>
                    <button onClick={() => navigate(-1)} className="btn-back">
                        <ArrowLeft size={18} />
                        Go Back
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="student-profile-page">
            {/* Header */}
            <div className="profile-page-header">
                <button className="btn-back" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                    Back
                </button>
                <h1>Student Profile</h1>
            </div>

            {/* Student Info Card */}
            <div className="student-info-card">
                <div className="student-avatar">
                    {student?.full_name?.charAt(0).toUpperCase() || 'S'}
                </div>
                <div className="student-details">
                    <h2>{student?.full_name || 'Unknown Student'}</h2>
                    <div className="student-meta">
                        <span><Mail size={16} /> {student?.email || 'No email'}</span>
                        <span><GraduationCap size={16} /> {student?.program_name || 'No Program'}</span>
                        <span><Calendar size={16} /> Semester {student?.current_semester || 'N/A'}</span>
                    </div>
                    <div className="student-badges">
                        <span className={`badge ${parseFloat(stats.gpa) < 2.0 ? 'at-risk' : 'good'}`}>
                            GPA: {stats.gpa}
                        </span>
                        <span className={`badge ${stats.passRate >= 70 ? 'good' : 'warning'}`}>
                            Pass Rate: {stats.passRate}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon gpa">
                        <Award size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.gpa}</span>
                        <span className="stat-label">Current GPA</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon percentage">
                        <BarChart2 size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.avgPercentage}%</span>
                        <span className="stat-label">Avg Percentage</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon subjects">
                        <BookOpen size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{enrollments.length}</span>
                        <span className="stat-label">Enrolled Subjects</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon pass">
                        <CheckCircle size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.passed}/{stats.total}</span>
                        <span className="stat-label">Subjects Passed</span>
                    </div>
                </div>
            </div>

            {/* Scheduled Meetings */}
            {meetings.length > 0 && (
                <div className="enrollments-section">
                    <h3><Calendar size={20} /> Scheduled Meetings</h3>
                    <div className="enrollments-grid">
                        {meetings.map((meeting) => (
                            <div key={meeting.id} className="enrollment-card">
                                <div className="enrollment-header">
                                    <h4>{meeting.title}</h4>
                                    <span className="subject-code">{new Date(meeting.event_date).toLocaleDateString()}</span>
                                </div>
                                <div className="enrollment-body">
                                    <div className="grade-display">
                                        <span className="percentage" style={{ fontSize: '1.25rem' }}>
                                            <Clock size={16} style={{ marginRight: '8px' }} />
                                            {new Date(`${meeting.event_date}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="grade-details">
                                        <p style={{ margin: '0.5rem 0', color: '#6b7280', fontSize: '0.9rem' }}>
                                            {meeting.description.replace(`Meeting scheduled with ${student?.full_name}`, '')}
                                        </p>
                                    </div>
                                    <button
                                        className="btn-cancel"
                                        style={{
                                            width: '100%',
                                            marginTop: '1rem',
                                            background: '#fee2e2',
                                            color: '#ef4444',
                                            border: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem'
                                        }}
                                        onClick={() => handleCancelMeeting(meeting.id)}
                                    >
                                        <Trash2 size={16} /> Cancel Meeting
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Enrollments/Grades */}
            <div className="enrollments-section">
                <h3><BookOpen size={20} /> Academic Performance</h3>
                {enrollments.length === 0 ? (
                    <div className="empty-state">
                        <BookOpen size={48} />
                        <p>No enrollment data available</p>
                    </div>
                ) : (
                    <div className="enrollments-grid">
                        {enrollments.map((enrollment, idx) => {
                            const status = getStatusBadge(enrollment.final_percentage)
                            return (
                                <div key={idx} className="enrollment-card">
                                    <div className="enrollment-header">
                                        <h4>{enrollment.subject_name}</h4>
                                        <span className="subject-code">{enrollment.subject_code}</span>
                                    </div>
                                    <div className="enrollment-body">
                                        <div className="grade-display">
                                            <span className="percentage">{enrollment.final_percentage?.toFixed(1) || '0'}%</span>
                                            <span className={`status-badge ${status.class}`}>{status.text}</span>
                                        </div>
                                        <div className="grade-details">
                                            <span>Credits: {enrollment.credits || 'N/A'}</span>
                                            <span>Semester: {enrollment.semester || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div className="enrollment-progress">
                                        <div
                                            className={`progress-bar ${status.class}`}
                                            style={{ width: `${enrollment.final_percentage || 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Mining Profile Section */}
            <div className="enrollments-section mining-section">
                <h3><Zap size={20} /> Data Mining Profile</h3>
                <StudentMiningProfile studentId={studentId} />
            </div>

            <div className="quick-actions">
                <button
                    className="action-btn primary"
                    onClick={() => {
                        setMeetingData(prev => ({ ...prev, title: `Meeting with ${student.full_name}` }))
                        setShowMeetingForm(true)
                    }}
                >
                    <CalendarPlus size={18} />
                    Schedule Meeting
                </button>
                <button
                    className="action-btn secondary"
                    onClick={() => navigate(`/admin/dashboard?tab=grades&student_name=${encodeURIComponent(student?.full_name || '')}&program_id=${student?.program_id || ''}&semester=&subject=all`)}
                >
                    <GraduationCap size={18} />
                    View/Edit Grades
                </button>
                <button
                    className="action-btn secondary"
                    onClick={() => navigate('/admin/dashboard?tab=students')}
                >
                    <User size={18} />
                    All Students
                </button>
            </div>

            {/* Meeting Modal */}
            {showMeetingForm && (
                <div className="modal-overlay">
                    <div className="modal-content meeting-modal">
                        <div className="modal-header">
                            <h2>Schedule Meeting</h2>
                            <button className="close-btn" onClick={() => setShowMeetingForm(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleScheduleMeeting} className="meeting-form">
                            <div className="form-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    value={meetingData.title}
                                    onChange={(e) => setMeetingData({ ...meetingData, title: e.target.value })}
                                    required
                                    placeholder="e.g., Academic Review"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Date</label>
                                    <input
                                        type="date"
                                        value={meetingData.date}
                                        onChange={(e) => setMeetingData({ ...meetingData, date: e.target.value })}
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Time</label>
                                    <input
                                        type="time"
                                        value={meetingData.time}
                                        onChange={(e) => setMeetingData({ ...meetingData, time: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Duration (minutes)</label>
                                <select
                                    value={meetingData.duration}
                                    onChange={(e) => setMeetingData({ ...meetingData, duration: e.target.value })}
                                >
                                    <option value="15">15 mins</option>
                                    <option value="30">30 mins</option>
                                    <option value="45">45 mins</option>
                                    <option value="60">1 hour</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Message (Optional)</label>
                                <textarea
                                    value={meetingData.message}
                                    onChange={(e) => setMeetingData({ ...meetingData, message: e.target.value })}
                                    placeholder="Add a note for the student..."
                                    rows="3"
                                />
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={() => setShowMeetingForm(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-submit"
                                    disabled={sendingMeeting}
                                >
                                    {sendingMeeting ? 'Sending...' : 'Send Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default StudentProfilePage



