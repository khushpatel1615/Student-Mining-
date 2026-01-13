import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, ChevronUp, AlertCircle, CheckCircle, XCircle, Clock, Coffee } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import './StudentAttendance.css';

const API_BASE = 'http://localhost/StudentDataMining/backend/api';

const StudentAttendance = () => {
    const { user, token } = useAuth();
    const [attendanceSummary, setAttendanceSummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedSubject, setExpandedSubject] = useState(null);

    useEffect(() => {
        if (user?.id) fetchAttendanceSummary();
    }, [user.id]);

    const fetchAttendanceSummary = async () => {
        try {
            const res = await fetch(`${API_BASE}/attendance.php?user_id=${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setAttendanceSummary(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch attendance", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-state">Loading attendance records...</div>;

    return (
        <div className="attendance-tab-container">
            <div className="attendance-header">
                <h3>My Attendance</h3>
                <span className="subtitle">Track your presence across all subjects</span>
            </div>

            <div className="attendance-list">
                {attendanceSummary.length > 0 ? (
                    attendanceSummary.map(subject => (
                        <AttendanceRow
                            key={subject.enrollment_id}
                            subject={subject}
                            token={token}
                            expanded={expandedSubject === subject.enrollment_id}
                            onToggle={() => setExpandedSubject(expandedSubject === subject.enrollment_id ? null : subject.enrollment_id)}
                        />
                    ))
                ) : (
                    <div className="empty-state">
                        <AlertCircle size={32} />
                        <p>No enrollment records found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const AttendanceRow = ({ subject, token, expanded, onToggle }) => {
    const [details, setDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        if (expanded && !details) {
            fetchDetails();
        }
    }, [expanded]);

    const fetchDetails = async () => {
        setLoadingDetails(true);
        try {
            const res = await fetch(`${API_BASE}/attendance.php?enrollment_id=${subject.enrollment_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setDetails(data.data);
            }
        } catch (err) {
            console.error("Failed to fetch details", err);
        } finally {
            setLoadingDetails(false);
        }
    };

    const getPercentageColor = (pct) => {
        const val = parseFloat(pct);
        if (val >= 90) return 'text-green-500';
        if (val >= 75) return 'text-blue-500';
        if (val >= 60) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'present': return <CheckCircle size={16} className="text-green-500" />;
            case 'absent': return <XCircle size={16} className="text-red-500" />;
            case 'late': return <Clock size={16} className="text-yellow-500" />;
            default: return <Coffee size={16} className="text-gray-400" />;
        }
    };

    return (
        <div className={`attendance-card ${expanded ? 'expanded' : ''}`}>
            <div className="attendance-summary" onClick={onToggle}>
                <div className="subject-info">
                    <h4>{subject.subject_name}</h4>
                    <span className="code">{subject.subject_code}</span>
                </div>

                <div className="stats-group">
                    <div className="stat-pill">
                        <span className="label">Total Classes</span>
                        <span className="value">{subject.total_classes}</span>
                    </div>
                    <div className="stat-pill percentage">
                        <span className={`value ${getPercentageColor(subject.attendance_percentage)}`}>
                            {subject.attendance_percentage}%
                        </span>
                    </div>
                    <div className="toggle-icon">
                        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="attendance-details"
                    >
                        {loadingDetails ? (
                            <div className="loading-mini">Loading history...</div>
                        ) : details ? (
                            <>
                                <div className="stats-grid">
                                    <div className="mini-stat present">
                                        <div className="val">{details.summary.present}</div>
                                        <div className="lbl">Present</div>
                                    </div>
                                    <div className="mini-stat absent">
                                        <div className="val">{details.summary.absent}</div>
                                        <div className="lbl">Absent</div>
                                    </div>
                                    <div className="mini-stat late">
                                        <div className="val">{details.summary.late}</div>
                                        <div className="lbl">Late</div>
                                    </div>
                                </div>

                                <div className="history-list">
                                    <h5>Recent History</h5>
                                    {details.records.length > 0 ? (
                                        details.records.map((record, idx) => (
                                            <div key={idx} className="history-item">
                                                <div className="date-col">
                                                    <span className="day">{record.day_name}</span>
                                                    <span className="date">{record.attendance_date}</span>
                                                </div>
                                                <div className={`status-badge ${record.status}`}>
                                                    {getStatusIcon(record.status)}
                                                    <span>{record.status}</span>
                                                </div>
                                                {record.remarks && (
                                                    <div className="remarks">
                                                        {record.remarks}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="no-history">No records found.</div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="error-mini">Failed to load details.</div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudentAttendance;
