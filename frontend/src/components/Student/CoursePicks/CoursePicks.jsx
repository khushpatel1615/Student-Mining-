import React, { useState, useEffect } from 'react';
import { BookOpen, Star, TrendingUp, CheckCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../config';

const CoursePicks = () => {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [enrolledSubjects, setEnrolledSubjects] = useState([]);
    const [availableSubjects, setAvailableSubjects] = useState([]);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            // Fetch enrolled courses
            const dashResponse = await fetch(`${API_BASE}/student_dashboard.php?action=summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dashData = await dashResponse.json();
            if (dashData.success) {
                setEnrolledSubjects(dashData.data.courses || []);
            }

            // Fetch all available subjects
            const subjectsResponse = await fetch(`${API_BASE}/subjects.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const subjectsData = await subjectsResponse.json();
            if (subjectsData.success) {
                const enrolledIds = dashData.data.courses?.map(c => c.id) || [];
                const available = subjectsData.data.filter(s => !enrolledIds.includes(s.id)).slice(0, 6);
                setAvailableSubjects(available);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner"></div><p>Loading course recommendations...</p></div>;
    }

    return (
        <div style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                    <BookOpen size={24} /> Course Recommendations
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Suggested courses to enhance your learning path</p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={20} style={{ color: '#16a34a' }} /> Your Current Courses ({enrolledSubjects.length})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {enrolledSubjects.map(course => (
                        <div key={course.id} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>{course.name}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Grade: <span style={{ fontWeight: 600, color: course.grade === 'F' ? '#dc2626' : '#16a34a' }}>{course.grade || 'In Progress'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Star size={20} style={{ color: '#f59e0b' }} /> Recommended for You
                </h3>
                {availableSubjects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                        <BookOpen size={64} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                        <h3>No new recommendations</h3>
                        <p style={{ color: 'var(--text-muted)' }}>You're enrolled in all available courses!</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                        {availableSubjects.map(subject => (
                            <div key={subject.id} style={{ background: '#fef3c7', padding: '1.25rem', borderRadius: '10px', border: '2px dashed #f59e0b', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: '#f59e0b', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600 }}>
                                    RECOMMENDED
                                </div>
                                <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem', color: '#78350f' }}>{subject.name}</div>
                                <div style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: '0.75rem' }}>{subject.code}</div>
                                <div style={{ fontSize: '0.8rem', color: '#a16207' }}>Credits: {subject.credits || 3}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #86efac' }}>
                <h4 style={{ fontSize: '1rem', color: '#15803d', margin: '0 0 0.5rem' }}>📚 Pro Tip</h4>
                <p style={{ fontSize: '0.9rem', color: '#166534', margin: 0 }}>
                    Course recommendations are based on your current program, semester level, and academic performance. Contact your advisor to enroll in new courses!
                </p>
            </div>
        </div>
    );
};

export default CoursePicks;
