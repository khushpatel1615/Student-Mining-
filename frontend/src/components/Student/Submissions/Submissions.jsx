import React, { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../config';

const Submissions = () => {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState([]);

    useEffect(() => {
        fetchSubmissions();
    }, []);

    const fetchSubmissions = async () => {
        try {
            const response = await fetch(`${API_BASE}/assignments.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setAssignments(data.data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (assignment) => {
        const dueDate = new Date(assignment.due_date);
        const now = new Date();
        const hasSubmission = assignment.submission_id;

        if (hasSubmission) {
            return {
                status: 'Submitted',
                color: '#16a34a',
                icon: <CheckCircle size={20} />,
                bgColor: '#dcfce7'
            };
        } else if (now > dueDate) {
            return {
                status: 'Missed',
                color: '#dc2626',
                icon: <XCircle size={20} />,
                bgColor: '#fee2e2'
            };
        } else {
            return {
                status: 'Pending',
                color: '#f59e0b',
                icon: <Clock size={20} />,
                bgColor: '#fef3c7'
            };
        }
    };

    const submittedCount = assignments.filter(a => a.submission_id).length;
    const pendingCount = assignments.filter(a => !a.submission_id && new Date(a.due_date) > new Date()).length;
    const missedCount = assignments.filter(a => !a.submission_id && new Date(a.due_date) <= new Date()).length;

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner"></div><p>Loading submissions...</p></div>;
    }

    return (
        <div style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                    <ClipboardList size={24} /> My Submissions
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Track all your assignment submissions in one place</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div style={{ background: '#dcfce7', padding: '1.25rem', borderRadius: '10px', border: '2px solid #86efac' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#15803d' }}>{submittedCount}</div>
                    <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 500 }}>✅ Submitted</div>
                </div>
                <div style={{ background: '#fef3c7', padding: '1.25rem', borderRadius: '10px', border: '2px solid #fcd34d' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#92400e' }}>{pendingCount}</div>
                    <div style={{ fontSize: '0.85rem', color: '#78350f', fontWeight: 500 }}>⏳ Pending</div>
                </div>
                <div style={{ background: '#fee2e2', padding: '1.25rem', borderRadius: '10px', border: '2px solid #fca5a5' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#991b1b' }}>{missedCount}</div>
                    <div style={{ fontSize: '0.85rem', color: '#7f1d1d', fontWeight: 500 }}>❌ Missed</div>
                </div>
            </div>

            <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>📝 All Assignments</h3>
                {assignments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                        <FileText size={64} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                        <h3>No assignments</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Assignments will appear here when they are posted</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {assignments.map(assignment => {
                            const statusInfo = getStatusInfo(assignment);
                            return (
                                <div key={assignment.id} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem' }}>{assignment.title}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {assignment.subject_name} • Due: {new Date(assignment.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        {assignment.submission_id && assignment.grade && (
                                            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
                                                Grade: {assignment.grade}/{assignment.total_marks}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: statusInfo.bgColor, borderRadius: '8px', color: statusInfo.color, fontWeight: 600, fontSize: '0.85rem' }}>
                                        {statusInfo.icon}
                                        {statusInfo.status}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#eff6ff', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '1rem', color: '#1e40af', margin: '0 0 0.5rem' }}>💡 Submission Tips</h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#1e3a8a', fontSize: '0.9rem' }}>
                    <li>Submit assignments at least 24 hours before the deadline</li>
                    <li>Double-check file formats and size requirements</li>
                    <li>Keep backup copies of all your submissions</li>
                </ul>
            </div>
        </div>
    );
};

export default Submissions;
