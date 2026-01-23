import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Calendar, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import './StudentAttendance.css';

const API_BASE = 'http://localhost/StudentDataMining/backend/api';

const StudentAttendance = () => {
    const { token } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [attendanceData, setAttendanceData] = useState({}); // subject_id -> []
    const [loading, setLoading] = useState(true);
    const [expandedSubjects, setExpandedSubjects] = useState({});

    // 1. Fetch Student Enrollments (to get subjects)
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch enrollments for current semester (all statuses)
                // Backend defaults to 'active', so we explicitly request 'all' to include completed/failed
                const res = await fetch(`${API_BASE}/enrollments.php?status=all&current_sem_only=true`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();

                if (data.success) {
                    // Deduplicate subjects - keep only most recent enrollment per subject_id
                    const subjectMap = new Map();
                    data.data.forEach(enrollment => {
                        const subId = enrollment.subject_id;
                        // Keep the enrollment with higher enrollment_id (more recent)
                        if (!subjectMap.has(subId) || enrollment.enrollment_id > subjectMap.get(subId).enrollment_id) {
                            subjectMap.set(subId, enrollment);
                        }
                    });

                    const uniqueSubjects = Array.from(subjectMap.values());
                    setSubjects(uniqueSubjects);

                    // 2. Fetch attendance for each unique subject
                    uniqueSubjects.forEach(sub => {
                        fetchSubjectAttendance(sub.subject_id);
                    });
                }
            } catch (err) {
                console.error("Error fetching data", err);
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchData();
        }
    }, [token]);

    const fetchSubjectAttendance = async (subjectId) => {
        try {
            const res = await fetch(`${API_BASE}/attendance.php?action=student_view&subject_id=${subjectId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setAttendanceData(prev => ({
                    ...prev,
                    [subjectId]: data.data
                }));
            }
        } catch (err) {
            console.error(`Error fetching attendance for ${subjectId}`, err);
        }
    };

    const toggleExpand = (subId) => {
        setExpandedSubjects(prev => ({
            ...prev,
            [subId]: !prev[subId]
        }));
    };

    const getStats = (records) => {
        if (!records || records.length === 0) return { present: 0, total: 0, percentage: 0 };
        const total = records.filter(r => r.status && r.status !== '-').length;
        const present = records.filter(r => r.status === 'P').length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        return { present, total, percentage };
    };

    if (loading) return <div className="p-4"><Loader className="animate-spin" /> Loading attendance...</div>;

    return (
        <div className="student-attendance">
            <div className="attendance-header">
                <h2>My Attendance</h2>
                <div className="attendance-view-toggle">
                    {/* Placeholder for future toggle: List / Grid */}
                </div>
            </div>

            {subjects.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon-wrapper">
                        <AlertTriangle size={48} />
                    </div>
                    <h3>No active subjects found</h3>
                    <p>It seems you are not enrolled in any subjects for this semester yet.</p>
                </div>
            ) : (
                <div className="subjects-grid">
                    {subjects.map(sub => {
                        const records = attendanceData[sub.subject_id] || [];
                        const stats = getStats(records);
                        const isExpanded = expandedSubjects[sub.subject_id];

                        return (
                            <div key={sub.subject_id} className={`subject-attendance-card ${isExpanded ? 'expanded' : ''}`}>
                                <div className="subject-header" onClick={() => toggleExpand(sub.subject_id)}>
                                    <div className="subject-info">
                                        <div className="subject-top">
                                            <h3>{sub.subject_name}</h3>
                                            <span className="subject-code">{sub.subject_code}</span>
                                        </div>

                                        <div className="progress-container">
                                            <div className="progress-labels">
                                                <span className="progress-text">Attendance</span>
                                                <span className={`progress-percentage ${stats.percentage < 75 ? 'danger' : 'success'}`}>
                                                    {stats.percentage}%
                                                </span>
                                            </div>
                                            <div className="progress-bar-bg">
                                                <div
                                                    className={`progress-bar-fill ${stats.percentage < 75 ? 'danger' : 'success'}`}
                                                    style={{ width: `${stats.percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="expand-icon">
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="card-content">
                                        <div className="stats-row">
                                            <div className="stat-box">
                                                <div className="stat-icon total"><Calendar size={18} /></div>
                                                <div className="stat-details">
                                                    <span className="stat-label">Total Classes</span>
                                                    <span className="stat-value">{stats.total}</span>
                                                </div>
                                            </div>
                                            <div className="stat-box">
                                                <div className="stat-icon present"><CheckCircle size={18} /></div>
                                                <div className="stat-details">
                                                    <span className="stat-label">Present</span>
                                                    <span className="stat-value success">{stats.present}</span>
                                                </div>
                                            </div>
                                            <div className="stat-box">
                                                <div className="stat-icon absent"><XCircle size={18} /></div>
                                                <div className="stat-details">
                                                    <span className="stat-label">Absent</span>
                                                    <span className="stat-value danger">{stats.total - stats.present}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="history-section">
                                            <h4>Recent History</h4>
                                            {records.length === 0 ? (
                                                <div className="no-history">No attendance records yet.</div>
                                            ) : (
                                                <div className="history-list-scroll">
                                                    {[...records].reverse().map((rec, idx) => (
                                                        <div key={idx} className="history-item">
                                                            <span className="history-date">{rec.date}</span>
                                                            <span className={`status-badge ${rec.status === 'P' ? 'present' :
                                                                    rec.status === 'A' ? 'absent' : 'exception'
                                                                }`}>
                                                                {rec.status === 'P' ? 'Present' :
                                                                    rec.status === 'A' ? 'Absent' : 'Excused'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StudentAttendance;
