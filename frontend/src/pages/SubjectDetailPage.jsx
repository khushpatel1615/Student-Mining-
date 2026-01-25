import { API_BASE } from '../config';
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import './SubjectDetailPage.css'

// Icons
const BackIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
    </svg>
)

const BookIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
)

const GradesIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
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

const InfoIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
)

const MegaphoneIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l18-5v12L3 13v-2z" />
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
)

const DownloadIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
)

const CheckCircleIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
)



function SubjectDetailPage() {
    const { subjectId } = useParams()
    const navigate = useNavigate()
    const { token } = useAuth()
    const { theme } = useTheme()
    const [data, setData] = useState(null)
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState('announcements')

    useEffect(() => {
        const fetchSubjectDetails = async () => {
            try {
                setLoading(true)
                const response = await fetch(`${API_BASE}/subject_details.php?subject_id=${subjectId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const result = await response.json()

                if (result.success) {
                    setData(result.data)
                } else {
                    setError(result.error || 'Failed to load subject details')
                }
            } catch (err) {
                setError('Network error. Please try again.')
            } finally {
                setLoading(false)
            }
        }

        if (subjectId && token) {
            fetchSubjectDetails()
            fetchAnnouncements()
        }
    }, [subjectId, token])

    const fetchAnnouncements = async () => {
        try {
            const response = await fetch(`${API_BASE}/announcements.php?subject_id=${subjectId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const result = await response.json()
            if (result.success) {
                setAnnouncements(result.data || [])
            }
        } catch (err) {
            console.error('Failed to fetch announcements:', err)
        }
    }

    const getSubjectIcon = (subjectType) => {
        switch (subjectType) {
            case 'Core': return '💻'
            case 'Elective': return '📚'
            default: return '📖'
        }
    }

    const getGradeColor = (percentage) => {
        if (percentage === null) return 'not-graded'
        if (percentage >= 80) return 'excellent'
        if (percentage >= 60) return 'good'
        if (percentage >= 40) return 'pass'
        return 'fail'
    }

    if (loading) {
        return (
            <div className="subject-detail-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading subject details...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="subject-detail-page">
                <div className="error-state">
                    <h2>Error</h2>
                    <p>{error}</p>
                    <button onClick={() => navigate('/student/dashboard')}>Back to Dashboard</button>
                </div>
            </div>
        )
    }

    const { subject, enrollment, grades, attendance } = data

    return (
        <div className={`subject-detail-page ${theme}`}>
            {/* Header */}
            <header className="subject-header">
                <button className="back-button" onClick={() => navigate('/student/dashboard')}>
                    <BackIcon />
                    <span>Back to Courses</span>
                </button>

                <div className="subject-hero">
                    <div className="subject-icon-large">
                        {getSubjectIcon(subject.subject_type)}
                    </div>
                    <div className="subject-info">
                        <h1>{subject.name}</h1>
                        <div className="subject-meta">
                            <span className="code">{subject.code}</span>
                            <span className="divider">•</span>
                            <span>Semester {subject.semester}</span>
                            <span className="divider">•</span>
                            <span>{subject.credits} Credits</span>
                            <span className="divider">•</span>
                            <span className={`type-badge ${subject.subject_type?.toLowerCase()}`}>
                                {subject.subject_type}
                            </span>
                        </div>
                        <p className="program-name">{subject.program_name}</p>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="quick-stats">
                    <div className="stat-card">
                        <GradesIcon />
                        <div className="stat-content">
                            <span className="stat-label">Grade</span>
                            <span className={`stat-value ${getGradeColor(grades?.summary?.overall_percentage)}`}>
                                {grades?.summary?.letter_grade || '-'}
                            </span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <CheckCircleIcon />
                        <div className="stat-content">
                            <span className="stat-label">Score</span>
                            <span className="stat-value">
                                {grades?.summary?.overall_percentage ?? '-'}%
                            </span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <CalendarIcon />
                        <div className="stat-content">
                            <span className="stat-label">Attendance</span>
                            <span className={`stat-value ${attendance?.percentage >= 75 ? 'good' : 'warning'}`}>
                                {attendance?.percentage ?? '-'}%
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <nav className="subject-nav">
                <button
                    className={`nav-tab ${activeTab === 'announcements' ? 'active' : ''}`}
                    onClick={() => setActiveTab('announcements')}
                >
                    <MegaphoneIcon />
                    Announcements
                </button>
                <button
                    className={`nav-tab ${activeTab === 'grades' ? 'active' : ''}`}
                    onClick={() => setActiveTab('grades')}
                >
                    <GradesIcon />
                    Grades
                </button>
                <button
                    className={`nav-tab ${activeTab === 'attendance' ? 'active' : ''}`}
                    onClick={() => setActiveTab('attendance')}
                >
                    <CalendarIcon />
                    Attendance
                </button>
                <button
                    className={`nav-tab ${activeTab === 'info' ? 'active' : ''}`}
                    onClick={() => setActiveTab('info')}
                >
                    <InfoIcon />
                    Course Info
                </button>
            </nav>

            {/* Content Area */}
            <main className="subject-content">
                {activeTab === 'announcements' && (
                    <div className="announcements-section">
                        {announcements.length === 0 ? (
                            <div className="empty-announcements">
                                <MegaphoneIcon />
                                <p>No announcements yet for this course.</p>
                            </div>
                        ) : (
                            <div className="announcements-list">
                                {announcements.map(announcement => (
                                    <div key={announcement.id} className={`announcement-card ${announcement.is_pinned ? 'pinned' : ''}`}>
                                        <div className="announcement-header">
                                            <div className="megaphone-icon">
                                                <MegaphoneIcon />
                                            </div>
                                            <div className="announcement-meta">
                                                <h4>{announcement.title}</h4>
                                                <span className="date">
                                                    {new Date(announcement.created_at).toLocaleDateString('en-US', {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: 'numeric',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                                <span className="teacher-name">Posted by {announcement.teacher_name}</span>
                                            </div>
                                        </div>
                                        <div className="announcement-content">
                                            {announcement.content.split('\n').map((para, i) => (
                                                <p key={i}>{para}</p>
                                            ))}
                                            {announcement.attachment_url && (
                                                <a
                                                    href={`http://localhost/StudentDataMining/${announcement.attachment_url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="attachment-link"
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        marginTop: '1rem',
                                                        padding: '0.5rem 1rem',
                                                        background: '#f0f0f0',
                                                        borderRadius: '8px',
                                                        textDecoration: 'none',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '0.9rem',
                                                        border: '1px solid #ddd'
                                                    }}
                                                >
                                                    <DownloadIcon width={16} height={16} />
                                                    Download PDF Attachment
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'grades' && (
                    <div className="grades-section">
                        {/* Final Grade Summary */}
                        <div className="final-grade-card">
                            <h2>Final Calculated Grade</h2>
                            <div className="grade-summary-grid">
                                <div className="summary-item">
                                    <span className="label">Weight Achieved</span>
                                    <span className="value">
                                        {grades?.summary?.weight_achieved ?? 0} / {grades?.summary?.total_weight ?? 100}
                                    </span>
                                </div>
                                <div className="summary-item highlight">
                                    <span className="label">Grade</span>
                                    <span className={`value large ${getGradeColor(grades?.summary?.overall_percentage)}`}>
                                        {grades?.summary?.overall_percentage ?? 0}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Grades Table */}
                        <div className="grades-table-wrapper">
                            <table className="grades-detail-table">
                                <thead>
                                    <tr>
                                        <th>Assessment</th>
                                        <th>Weight</th>
                                        <th>Max Marks</th>
                                        <th>Obtained</th>
                                        <th>Status</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {grades?.items?.map((item, index) => (
                                        <tr key={index} className="grade-row">
                                            <td className="item-name">
                                                <strong>{item.component_name}</strong>
                                            </td>
                                            <td className="weight">
                                                {item.weight_percentage}%
                                            </td>
                                            <td className="max-marks">
                                                {item.max_marks}
                                            </td>
                                            <td className="points">
                                                {item.marks_obtained !== null ? (
                                                    <span className="font-medium">{item.marks_obtained}</span>
                                                ) : (
                                                    <span className="text-muted">-</span>
                                                )}
                                            </td>
                                            <td className="status">
                                                {item.marks_obtained !== null ? (
                                                    <span className="status-badge status-completed">Graded</span>
                                                ) : (
                                                    <span className="status-badge status-pending">Pending</span>
                                                )}
                                            </td>
                                            <td className="remarks-cell">
                                                {item.remarks ? (
                                                    <div className="feedback-content">
                                                        <p className="remark-text">{item.remarks}</p>
                                                    </div>
                                                ) : (
                                                    <span className="no-feedback">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="attendance-section">
                        <div className="attendance-overview">
                            <div className="attendance-circle">
                                <svg viewBox="0 0 36 36" className="circular-chart">
                                    <path
                                        className="circle-bg"
                                        d="M18 2.0845
                                            a 15.9155 15.9155 0 0 1 0 31.831
                                            a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className={`circle ${attendance?.percentage >= 75 ? 'good' : 'warning'}`}
                                        strokeDasharray={`${attendance?.percentage || 0}, 100`}
                                        d="M18 2.0845
                                            a 15.9155 15.9155 0 0 1 0 31.831
                                            a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <text x="18" y="20.35" className="percentage-text">
                                        {attendance?.percentage ?? 0}%
                                    </text>
                                </svg>
                                <p className="attendance-label">Attendance Rate</p>
                            </div>

                            <div className="attendance-breakdown">
                                <div className="breakdown-item present">
                                    <span className="count">{attendance?.present || 0}</span>
                                    <span className="label">Present</span>
                                </div>
                                <div className="breakdown-item absent">
                                    <span className="count">{attendance?.absent || 0}</span>
                                    <span className="label">Absent</span>
                                </div>
                                <div className="breakdown-item late">
                                    <span className="count">{attendance?.late || 0}</span>
                                    <span className="label">Late</span>
                                </div>
                                <div className="breakdown-item excused">
                                    <span className="count">{attendance?.excused || 0}</span>
                                    <span className="label">Excused</span>
                                </div>
                            </div>
                        </div>

                        {attendance?.percentage < 75 && (
                            <div className="warning-banner">
                                ⚠️ Your attendance is below 75%. Please improve to avoid academic penalties.
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'info' && (
                    <div className="info-section">
                        <div className="info-card">
                            <h3>Course Information</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="label">Subject Code</span>
                                    <span className="value">{subject.code}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Credits</span>
                                    <span className="value">{subject.credits}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Type</span>
                                    <span className="value">{subject.subject_type}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Semester</span>
                                    <span className="value">{subject.semester}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Program</span>
                                    <span className="value">{subject.program_name}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Academic Year</span>
                                    <span className="value">{enrollment?.academic_year || 'N/A'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Enrollment Status</span>
                                    <span className={`value status-${enrollment?.status}`}>
                                        {enrollment?.status?.toUpperCase()}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Enrolled On</span>
                                    <span className="value">
                                        {enrollment?.enrolled_at
                                            ? new Date(enrollment.enrolled_at).toLocaleDateString()
                                            : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {subject.description && (
                            <div className="info-card">
                                <h3>Description</h3>
                                <p className="description-text">{subject.description}</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}

export default SubjectDetailPage



