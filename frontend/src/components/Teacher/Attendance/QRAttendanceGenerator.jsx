import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import toast from 'react-hot-toast'
import './QRAttendanceGenerator.css'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

function QRAttendanceGenerator() {
    const { token } = useAuth()
    const [subjects, setSubjects] = useState([])
    const [selectedSubject, setSelectedSubject] = useState(null)
    const [duration, setDuration] = useState(15)
    const [activeSession, setActiveSession] = useState(null)
    const [activeSessions, setActiveSessions] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchSubjects()
        fetchActiveSessions()
        const interval = setInterval(fetchActiveSessions, 10000) // Update every 10 seconds
        return () => clearInterval(interval)
    }, [])

    const fetchSubjects = async () => {
        try {
            const response = await fetch(`${API_BASE}/teachers.php?action=subjects`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setSubjects(data.data)
            }
        } catch (err) {
            console.error('Error fetching subjects:', err)
        }
    }

    const fetchActiveSessions = async () => {
        try {
            const response = await fetch(`${API_BASE}/qr_attendance.php?action=list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setActiveSessions(data.data)
            }
        } catch (err) {
            console.error('Error fetching sessions:', err)
        }
    }

    const generateQRCode = async () => {
        if (!selectedSubject) {
            toast.error('Please select a subject')
            return
        }

        setLoading(true)
        try {
            const response = await fetch(
                `${API_BASE}/qr_attendance.php?action=generate&subject_id=${selectedSubject}&duration=${duration}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            const data = await response.json()

            if (data.success) {
                setActiveSession(data.data)
                fetchActiveSessions()
                toast.success('QR Code generated successfully!')
            } else {
                toast.error(data.error || 'Failed to generate QR code')
            }
        } catch (err) {
            console.error('Error generating QR:', err)
            toast.error('Error generating QR code')
        } finally {
            setLoading(false)
        }
    }

    const endSession = async (sessionId) => {
        try {
            await fetch(`${API_BASE}/qr_attendance.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'end_session',
                    session_id: sessionId
                })
            })
            toast.success('Session ended')
            setActiveSession(null)
            fetchActiveSessions()
        } catch (err) {
            toast.error('Error ending session')
        }
    }

    const getTimeRemaining = (expiresAt) => {
        const now = new Date()
        const expires = new Date(expiresAt)
        const diff = expires - now

        if (diff <= 0) return 'Expired'

        const minutes = Math.floor(diff / 60000)
        const seconds = Math.floor((diff % 60000) / 1000)
        return `${minutes}m ${seconds}s`
    }

    return (
        <div className="qr-attendance-generator">
            <div className="generator-header">
                <h2>QR Attendance Generator</h2>
                <p>Generate QR codes for students to scan and mark attendance</p>
            </div>

            <div className="generator-form">
                <div className="form-group">
                    <label>Select Subject</label>
                    <select
                        value={selectedSubject || ''}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="form-select"
                    >
                        <option value="">Choose a subject...</option>
                        {subjects.map(subject => (
                            <option key={subject.id} value={subject.id}>
                                {subject.code} - {subject.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Session Duration (minutes)</label>
                    <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="form-select"
                    >
                        <option value="5">5 minutes</option>
                        <option value="10">10 minutes</option>
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                    </select>
                </div>

                <button
                    className="btn-generate"
                    onClick={generateQRCode}
                    disabled={loading || !selectedSubject}
                >
                    {loading ? 'Generating...' : '🎯 Generate QR Code'}
                </button>
            </div>

            {activeSession && (
                <div className="qr-display">
                    <div className="qr-header">
                        <h3>{activeSession.subject.code} - {activeSession.subject.name}</h3>
                        <span className="expires-badge">
                            Expires: {new Date(activeSession.expires_at).toLocaleTimeString()}
                        </span>
                    </div>

                    <div className="qr-code-container">
                        {/* QR Code will be generated using a library like qrcode.react */}
                        <div className="qr-placeholder">
                            <div className="qr-code-text">
                                <div className="session-code">{activeSession.session_code}</div>
                                <div className="scan-instruction">Students scan this code to mark attendance</div>
                            </div>
                        </div>

                        {/* Alternative: Show QR data for manual QR generation */}
                        <div className="qr-data">
                            <strong>Session Code:</strong> {activeSession.session_code}
                        </div>
                    </div>

                    <button
                        className="btn-end-session"
                        onClick={() => endSession(activeSession.session_id)}
                    >
                        End Session
                    </button>
                </div>
            )}

            {/* Active Sessions List */}
            {activeSessions.length > 0 && (
                <div className="active-sessions">
                    <h3>Active Sessions</h3>
                    <div className="sessions-list">
                        {activeSessions.map(session => (
                            <div key={session.id} className="session-card">
                                <div className="session-info">
                                    <div className="session-subject">{session.subject_code}</div>
                                    <div className="session-meta">
                                        <span>👥 {session.scanned_count} scanned</span>
                                        <span>⏱️ {getTimeRemaining(session.expires_at)}</span>
                                    </div>
                                </div>
                                <button
                                    className="btn-end-small"
                                    onClick={() => endSession(session.id)}
                                >
                                    End
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default QRAttendanceGenerator
