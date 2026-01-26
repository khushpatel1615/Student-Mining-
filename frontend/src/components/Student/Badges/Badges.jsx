import React, { useState, useEffect } from 'react';
import { Award, Trophy, Star, Target, Zap, Crown } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../config';

const Badges = () => {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ gpa: 0, attendance: 0 });
    const [earnedBadges, setEarnedBadges] = useState([]);

    useEffect(() => {
        fetchBadges();
    }, []);

    const fetchBadges = async () => {
        try {
            const response = await fetch(`${API_BASE}/student_dashboard.php?action=summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setSummary({
                    gpa: data.data.gpa || 0,
                    attendance: data.data.attendance || 0
                });
                calculateBadges(data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const calculateBadges = (data) => {
        const badges = [];
        const gpa = data.gpa || 0;
        const attendance = data.attendance || 0;

        // GPA-based badges
        if (gpa >= 3.8) badges.push({ id: 'gpa-perfect', name: 'Perfect Scholar', icon: <Crown size={48} />, color: '#fbbf24', description: 'Maintained GPA above 3.8' });
        else if (gpa >= 3.5) badges.push({ id: 'gpa-excellent', name: 'Excellent Student', icon: <Trophy size={48} />, color: '#facc15', description: 'Maintained GPA above 3.5' });
        else if (gpa >= 3.0) badges.push({ id: 'gpa-good', name: 'Good Student', icon: <Star size={48} />, color: '#3b82f6', description: 'Maintained GPA above 3.0' });

        // Attendance badges
        if (attendance >= 95) badges.push({ id: 'attendance-perfect', name: 'Perfect Attendance', icon: <Target size={48} />, color: '#10b981', description: '95%+ attendance rate' });
        else if (attendance >= 85) badges.push({ id: 'attendance-excellent', name: 'Excellent Attendance', icon: <Zap size={48} />, color: '#06b6d4', description: '85%+ attendance rate' });
        else if (attendance >= 75) badges.push({ id: 'attendance-good', name: 'Good Attendance', icon: <Award size={48} />, color: '#8b5cf6', description: '75%+ attendance rate' });

        setEarnedBadges(badges);
    };

    const allPossibleBadges = [
        { id: 'gpa-perfect', name: 'Perfect Scholar', icon: <Crown size={48} />, color: '#fbbf24', requirement: 'GPA ≥ 3.8' },
        { id: 'gpa-excellent', name: 'Excellent Student', icon: <Trophy size={48} />, color: '#facc15', requirement: 'GPA ≥ 3.5' },
        { id: 'gpa-good', name: 'Good Student', icon: <Star size={48} />, color: '#3b82f6', requirement: 'GPA ≥ 3.0' },
        { id: 'attendance-perfect', name: 'Perfect Attendance', icon: <Target size={48} />, color: '#10b981', requirement: 'Attendance ≥ 95%' },
        { id: 'attendance-excellent', name: 'Excellent Attendance', icon: <Zap size={48} />, color: '#06b6d4', requirement: 'Attendance ≥ 85%' },
        { id: 'attendance-good', name: 'Good Attendance', icon: <Award size={48} />, color: '#8b5cf6', requirement: 'Attendance ≥ 75%' }
    ];

    const lockedBadges = allPossibleBadges.filter(badge => !earnedBadges.find(eb => eb.id === badge.id));

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner"></div><p>Loading badges...</p></div>;
    }

    return (
        <div style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                    <Award size={24} /> My Badges & Achievements
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Celebrate your academic accomplishments</p>
            </div>

            <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', color: 'white', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', fontWeight: 700 }}>{earnedBadges.length}</div>
                <div style={{ fontSize: '1.1rem', opacity: 0.9 }}>Badges Earned</div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.8 }}>
                    {lockedBadges.length} more to unlock
                </div>
            </div>

            <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>🏆 Earned Badges</h3>
                {earnedBadges.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-secondary)', borderRadius: '12px', marginBottom: '2rem' }}>
                        <Award size={64} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                        <h3>No badges earned yet</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Keep working hard to earn your first badge!</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                        {earnedBadges.map(badge => (
                            <div key={badge.id} style={{ background: `${badge.color}15`, padding: '1.5rem', borderRadius: '12px', border: `2px solid ${badge.color}`, textAlign: 'center', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                                <div style={{ color: badge.color, marginBottom: '0.75rem' }}>{badge.icon}</div>
                                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{badge.name}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{badge.description}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {lockedBadges.length > 0 && (
                <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>🔒 Locked Badges</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
                        {lockedBadges.map(badge => (
                            <div key={badge.id} style={{ background: '#f3f4f6', padding: '1.5rem', borderRadius: '12px', border: '2px dashed #d1d5db', textAlign: 'center', opacity: 0.6 }}>
                                <div style={{ color: '#9ca3af', marginBottom: '0.75rem', filter: 'grayscale(1)' }}>{badge.icon}</div>
                                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', color: '#6b7280' }}>{badge.name}</div>
                                <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>🔐 {badge.requirement}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#ecfdf5', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '1rem', color: '#065f46', margin: '0 0 0.5rem' }}>✨ Keep Going!</h4>
                <p style={{ fontSize: '0.9rem', color: '#047857', margin: 0 }}>
                    Badges are automatically earned based on your academic performance. Keep improving your GPA and attendance to unlock more achievements!
                </p>
            </div>
        </div>
    );
};

export default Badges;
