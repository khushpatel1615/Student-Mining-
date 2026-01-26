import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, Award, Code, Database, Globe, Palette } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../config';

const SkillsMap = () => {
    const { token, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState([]);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const response = await fetch(`${API_BASE}/student_dashboard.php?action=summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setCourses(data.data.courses || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Map courses to skill categories (simple heuristic)
    const getSkillCategory = (courseName) => {
        const name = courseName.toLowerCase();
        if (name.includes('programming') || name.includes('java') || name.includes('python')) return 'Programming';
        if (name.includes('database') || name.includes('sql')) return 'Database';
        if (name.includes('web') || name.includes('html')) return 'Web Development';
        if (name.includes('design') || name.includes('ui')) return 'Design';
        if (name.includes('network') || name.includes('security')) return 'Networking';
        return 'General';
    };

    const getSkillIcon = (category) => {
        switch (category) {
            case 'Programming': return <Code size={24} />;
            case 'Database': return <Database size={24} />;
            case 'Web Development': return <Globe size={24} />;
            case 'Design': return <Palette size={24} />;
            default: return <Award size={24} />;
        }
    };

    const skillsMap = courses.reduce((acc, course) => {
        const category = getSkillCategory(course.name);
        if (!acc[category]) acc[category] = [];
        acc[category].push(course);
        return acc;
    }, {});

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner"></div><p>Loading skills map...</p></div>;
    }

    return (
        <div style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                    <Brain size={24} /> My Skills Map
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Skills developed through your courses</p>
            </div>

            {Object.keys(skillsMap).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                    <Brain size={64} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                    <h3>No skills data available</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Complete some courses to see your skills map</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {Object.entries(skillsMap).map(([category, categoryCourses]) => (
                        <div key={category} style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {getSkillIcon(category)}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{category}</h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{categoryCourses.length} course{categoryCourses.length !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                {categoryCourses.map(course => (
                                    <div key={course.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'white', borderRadius: '8px' }}>
                                        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{course.name}</span>
                                        <span style={{ fontSize: '0.9rem', color: course.grade === 'F' ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                                            {course.grade || 'In Progress'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SkillsMap;
