import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle2, BookOpen } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../config';

const StudyPlanner = () => {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState([]);
    const [exams, setExams] = useState([]);
    const [recommendation, setRecommendation] = useState('');
    const [recommendations, setRecommendations] = useState([]);

    useEffect(() => {
        if (token) {
            fetchPlannerData();
        }
    }, [token]);

    const fetchPlannerData = async () => {
        try {
            // Fetch assignments
            const assignmentResponse = await fetch(`${API_BASE}/assignments.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const assignmentData = await assignmentResponse.json();
            if (assignmentData.success) {
                setAssignments(assignmentData.data || []);
            }

            // Fetch exams
            const examResponse = await fetch(`${API_BASE}/exams.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const examData = await examResponse.json();
            if (examData.success) {
                setExams(examData.data || []);
            }

            const recommendationResponse = await fetch(`${API_BASE}/study_planner.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const recommendationData = await recommendationResponse.json();
            if (recommendationData.success) {
                setRecommendation(recommendationData.recommendation || '');
                setRecommendations(recommendationData.recommendations || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getDaysUntil = (dateString) => {
        if (!dateString) return 0;
        const now = new Date();
        const due = new Date(dateString);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
        const diff = dueDay - today;
        return Math.round(diff / (1000 * 60 * 60 * 24));
    };

    const getUrgencyColor = (days) => {
        if (days < 0) return '#dc2626'; // Overdue
        if (days === 0) return '#ea580c'; // Today
        if (days <= 3) return '#f59e0b'; // Soon
        if (days <= 7) return '#3b82f6'; // This week
        return '#6b7280'; // Future
    };

    const upcomingItems = [
        ...assignments.map(a => ({ ...a, type: 'assignment', date: a.due_date })),
        ...exams.map(e => ({ ...e, type: 'exam', date: e.start_datetime }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 10);

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner"></div><p>Loading study planner...</p></div>;
    }

    return (
        <div style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                    <Calendar size={24} /> Study Planner
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Plan your study sessions around upcoming deadlines</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ background: '#dbeafe', padding: '1.5rem', borderRadius: '12px' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#1e40af' }}>{assignments.length}</div>
                    <div style={{ fontSize: '0.9rem', color: '#1e3a8a', fontWeight: 500 }}>Active Assignments</div>
                </div>
                <div style={{ background: '#fef3c7', padding: '1.5rem', borderRadius: '12px' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#92400e' }}>{exams.length}</div>
                    <div style={{ fontSize: '0.9rem', color: '#78350f', fontWeight: 500 }}>Upcoming Exams</div>
                </div>
                <div style={{ background: '#f3e8ff', padding: '1.5rem', borderRadius: '12px' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#7c3aed' }}>{upcomingItems.filter(i => getDaysUntil(i.date) <= 7).length}</div>
                    <div style={{ fontSize: '0.9rem', color: '#6b21a8', fontWeight: 500 }}>Due This Week</div>
                </div>
            </div>

            <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Upcoming Deadlines</h3>
                {upcomingItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                        <CheckCircle2 size={64} style={{ color: '#16a34a', marginBottom: '1rem' }} />
                        <h3>All Clear!</h3>
                        <p style={{ color: 'var(--text-muted)' }}>No upcoming deadlines at the moment</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {upcomingItems.map((item, index) => {
                            const daysUntil = getDaysUntil(item.date);
                            const urgencyColor = getUrgencyColor(daysUntil);
                            return (
                                <div key={index} style={{ background: 'var(--bg-secondary)', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: item.type === 'exam' ? '#fef3c7' : '#dbeafe', color: item.type === 'exam' ? '#92400e' : '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                                            {item.type === 'exam' ? 'EX' : 'AS'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.title || item.subject_name}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                                <Clock size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                                {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: urgencyColor }}>
                                            {daysUntil < 0 ? 'OVERDUE' : daysUntil === 0 ? 'TODAY' : `${daysUntil}d`}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                            {item.type}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                <h4 style={{ fontSize: '1rem', color: '#991b1b', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={18} /> Study Tip
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#7f1d1d', margin: 0 }}>
                    {recommendations.length > 0
                        ? recommendations.map((text, idx) => (
                            <span key={idx} style={{ display: 'block', marginBottom: idx === recommendations.length - 1 ? 0 : '0.5rem' }}>
                                {text}
                            </span>
                        ))
                        : (recommendation || 'No recommendation available yet.')}
                </p>
            </div>
        </div>
    );
};

export default StudyPlanner;
