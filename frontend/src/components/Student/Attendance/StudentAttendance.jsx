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
                // Fetch enrollments to get active subjects
                // We can use enrollments.php?status=active&current_sem_only=true
                const res = await fetch(`${API_BASE}/enrollments.php?status=active&current_sem_only=true`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();

                if (data.success) {
                    setSubjects(data.data);
                    // 2. Fetch attendance for each subject
                    data.data.forEach(sub => {
                        fetchSubjectAttendance(sub.subject_id);
                    });
                }
            } catch (err) {
                console.error("Error fetching data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

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
            <h2>My Attendance</h2>

            {subjects.length === 0 ? (
                <div className="empty-state">No active subjects found.</div>
            ) : subjects.map(sub => {
                const records = attendanceData[sub.subject_id] || [];
                const stats = getStats(records);
                const isExpanded = expandedSubjects[sub.subject_id];

                return (
                    <div key={sub.subject_id} className="subject-attendance-card">
                        <div className="subject-header" onClick={() => toggleExpand(sub.subject_id)} style={{ cursor: 'pointer' }}>
                            <div className="subject-title">
                                <h3>
                                    {sub.subject_name}
                                    <span className="subject-code">{sub.subject_code}</span>
                                </h3>
                                <div style={{ fontSize: '0.85rem', color: 'gray', marginTop: '0.25rem' }}>
                                    Attendance: <span style={{
                                        fontWeight: 'bold',
                                        color: stats.percentage < 75 ? 'red' : 'green'
                                    }}>{stats.percentage}%</span>
                                </div>
                            </div>
                            <div>
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </div>

                        {isExpanded && (
                            <>
                                <div className="attendance-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Total Classes</span>
                                        <span className="stat-value">{stats.total}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Present</span>
                                        <span className="stat-value high">{stats.present}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Absent</span>
                                        <span className="stat-value low">{stats.total - stats.present}</span>
                                    </div>
                                </div>

                                <div className="history-list">
                                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'gray' }}>History</h4>
                                    {records.length === 0 ? (
                                        <div style={{ fontStyle: 'italic', color: 'gray' }}>No records yet.</div>
                                    ) : (
                                        [...records].reverse().map((rec, idx) => (
                                            <div key={idx} className="history-item">
                                                <span>{rec.date}</span>
                                                <span className={`attendance-badge ${rec.status === 'P' ? 'present' :
                                                    rec.status === 'A' ? 'absent' :
                                                        rec.status === 'E' ? 'exception' : ''
                                                    }`}>
                                                    {rec.status === 'P' ? 'Present' :
                                                        rec.status === 'A' ? 'Absent' :
                                                            rec.status === 'E' ? 'Exception' : '-'}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default StudentAttendance;
