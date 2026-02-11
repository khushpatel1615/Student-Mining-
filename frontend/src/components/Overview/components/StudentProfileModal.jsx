import React, { useState } from 'react'
import {
    Calendar,
    AlertCircle,
    Users,
    GraduationCap,
    X
} from 'lucide-react'
import { API_BASE } from '../../../config'
import { useAuth } from '../../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const StudentProfileModal = ({ student, onClose }) => {
    const { token } = useAuth()
    const navigate = useNavigate()
    const [showMeetingForm, setShowMeetingForm] = useState(false)
    const [sendingMeeting, setSendingMeeting] = useState(false)
    const [meetingData, setMeetingData] = useState({
        title: `Meeting with ${student.name}`,
        date: '',
        time: '',
        duration: '30',
        message: ''
    })

    const handleScheduleMeeting = async (e) => {
        e.preventDefault()
        setSendingMeeting(true)
        try {
            // Optional Calendar Event
            try {
                await fetch(`${API_BASE}/calendar.php`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: meetingData.title,
                        description: meetingData.message || `Meeting scheduled with ${student.name}`,
                        event_date: meetingData.date,
                        type: 'event',
                        target_audience: 'students'
                    })
                })
            } catch (calErr) {
                console.log('Calendar event creation optional, continuing...', calErr)
            }

            // Send notification
            const notifResponse = await fetch(`${API_BASE}/notifications.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: student.user_id || student.id,
                    title: 'Meeting Request',
                    message: `Admin has scheduled a meeting: "${meetingData.title}" on ${new Date(meetingData.date).toLocaleDateString()} at ${meetingData.time}. Duration: ${meetingData.duration} mins. ${meetingData.message ? `Note: ${meetingData.message}` : ''}`,
                    type: 'meeting_request'
                })
            })

            const notifData = await notifResponse.json()

            if (notifData.success) {
                window.alert(`Meeting request sent to ${student.name}!`)
                setShowMeetingForm(false)
            } else {
                window.alert(notifData.error || 'Failed to send meeting request.')
            }
        } catch (err) {
            console.error('Error scheduling meeting:', err)
            window.alert('Failed to schedule meeting. Network error.')
        } finally {
            setSendingMeeting(false)
        }
    }

    const handleViewGrades = () => {
        onClose()
        let url = `/admin/dashboard?tab=grades&student_name=${encodeURIComponent(student.name || student.full_name)}`
        if (student.program_id) url += `&program_id=${student.program_id}`
        url += '&semester=&subject=all'
        navigate(url)
    }

    const handleViewProfile = () => {
        onClose()
        navigate('/admin/dashboard?tab=students')
    }

    return (
        <div className="detail-modal-overlay" onClick={onClose}>
            <div className="detail-modal student-profile-modal" onClick={(e) => e.stopPropagation()}>
                <div className="detail-modal-header">
                    <h2>Student Profile</h2>
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="detail-modal-body">
                    {/* Student Info */}
                    <div className="student-profile-header">
                        <div className="student-avatar-large">
                            {student.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="student-info-main">
                            <h3>{student.name}</h3>
                            <p className="student-email">{student.email || 'No email available'}</p>
                            <div className="student-badges">
                                <span className={`status-badge ${student.gpa < 1.5 ? 'critical' : student.gpa < 2.0 ? 'at-risk' : 'good'}`}>
                                    GPA: {student.gpa?.toFixed(2) || 'N/A'}
                                </span>
                                <span className={`status-badge ${student.tier?.replace('_', '-')}`}>
                                    {student.tier?.replace('_', ' ') || 'Student'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Academic Summary */}
                    <div className="profile-section">
                        <h4>Academic Summary</h4>
                        <div className="profile-stats-grid">
                            <div className="profile-stat">
                                <span className="stat-value">{student.gpa?.toFixed(2) || 'N/A'}</span>
                                <span className="stat-label">Current GPA</span>
                            </div>
                            <div className="profile-stat">
                                <span className="stat-value">{student.tier?.replace('_', ' ') || 'N/A'}</span>
                                <span className="stat-label">Performance Tier</span>
                            </div>
                            <div className="profile-stat">
                                <span className="stat-value warning">{student.gpa < 2.0 ? 'Yes' : 'No'}</span>
                                <span className="stat-label">Needs Attention</span>
                            </div>
                        </div>
                    </div>

                    {/* Schedule Meeting Section */}
                    <div className="profile-section meeting-section">
                        <div className="section-header">
                            <h4><Calendar size={18} /> Schedule a Meeting</h4>
                            {!showMeetingForm && (
                                <button
                                    className="btn-schedule-meeting"
                                    onClick={() => setShowMeetingForm(true)}
                                >
                                    <Calendar size={16} />
                                    Schedule Meeting
                                </button>
                            )}
                        </div>

                        {showMeetingForm && (
                            <form className="meeting-form" onSubmit={handleScheduleMeeting}>
                                <div className="form-group">
                                    <label>Meeting Title</label>
                                    <input
                                        type="text"
                                        value={meetingData.title}
                                        onChange={(e) => setMeetingData({ ...meetingData, title: e.target.value })}
                                        placeholder="e.g., Academic Performance Review"
                                        required
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Date</label>
                                        <input
                                            type="date"
                                            value={meetingData.date}
                                            onChange={(e) => setMeetingData({ ...meetingData, date: e.target.value })}
                                            min={new Date().toISOString().split('T')[0]}
                                            required
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
                                    <div className="form-group">
                                        <label>Duration</label>
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
                                </div>
                                <div className="form-group">
                                    <label>Message (Optional)</label>
                                    <textarea
                                        value={meetingData.message}
                                        onChange={(e) => setMeetingData({ ...meetingData, message: e.target.value })}
                                        placeholder="Add a note about the meeting purpose..."
                                        rows={3}
                                    />
                                </div>
                                <div className="meeting-actions">
                                    <button
                                        type="button"
                                        className="btn-cancel"
                                        onClick={() => setShowMeetingForm(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-send-meeting"
                                        disabled={sendingMeeting}
                                    >
                                        {sendingMeeting ? 'Sending...' : 'Send Meeting Request'}
                                    </button>
                                </div>
                                <p className="meeting-note">
                                    <AlertCircle size={14} />
                                    The student will receive a notification.
                                </p>
                            </form>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="profile-actions">
                        <button className="btn-primary-action" onClick={handleViewProfile}>
                            <Users size={16} />
                            View Full Profile
                        </button>
                        <button className="btn-secondary-action" onClick={handleViewGrades}>
                            <GraduationCap size={16} />
                            View Grades
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default StudentProfileModal
