import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, Award, Code, Database, Globe, Palette } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../config';
import './SkillsMap.css';

const SkillsMap = () => {
    const { token, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState([]);

    useEffect(() => {
        if (user && token) {
            fetchCourses();
        }
    }, [user, token]);

    const fetchCourses = async () => {
        try {
            const response = await fetch(`${API_BASE}/student_dashboard.php?action=summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setCourses(data.data.subjects || []);
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
        if (name.includes('programming') || name.includes('java') || name.includes('python') || name.includes('c ')) return 'Programming';
        if (name.includes('database') || name.includes('sql') || name.includes('data')) return 'Database';
        if (name.includes('web') || name.includes('html') || name.includes('design')) return 'Web Development';
        if (name.includes('algorithm') || name.includes('math') || name.includes('calculus')) return 'Computer Science Core';
        if (name.includes('network') || name.includes('security')) return 'Networking & Security';
        return 'General Skills';
    };

    const getSkillIcon = (category) => {
        switch (category) {
            case 'Programming': return <Code size={28} strokeWidth={1.5} />;
            case 'Database': return <Database size={28} strokeWidth={1.5} />;
            case 'Web Development': return <Globe size={28} strokeWidth={1.5} />;
            case 'Design': return <Palette size={28} strokeWidth={1.5} />;
            case 'Computer Science Core': return <Brain size={28} strokeWidth={1.5} />;
            default: return <Award size={28} strokeWidth={1.5} />;
        }
    };

    // Helper to get grade badge class
    const getGradeClass = (grade) => {
        if (!grade) return 'in-progress';
        const g = grade.charAt(0).toLowerCase(); // 'a', 'b', 'c', etc.
        return `grade-${g}`;
    };

    const skillsMap = courses.reduce((acc, course) => {
        const subjectName = course.subject?.name || course.subject_name || 'Unknown Course';
        const category = getSkillCategory(subjectName);
        if (!acc[category]) acc[category] = [];

        acc[category].push({
            id: course.subject?.id || Math.random(),
            name: subjectName,
            grade: course.grade_letter,
            status: course.status || (course.grade_letter ? 'Completed' : 'In Progress')
        });
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="skills-map-container" style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="skills-map-container">
            <div className="skills-header">
                <h2>
                    <Brain size={28} strokeWidth={1.5} className="text-indigo-600" />
                    My Skills Map
                </h2>
                <p>Track your technical competency growth across specialized domains.</p>
            </div>

            {Object.keys(skillsMap).length === 0 ? (
                <div className="empty-state">
                    <Brain size={64} strokeWidth={1} style={{ marginBottom: '1rem', color: '#cbd5e1' }} />
                    <h3>No skills data yet</h3>
                    <p>Enrolled courses will appear here categorized by skill set.</p>
                </div>
            ) : (
                <div className="skills-grid">
                    {Object.entries(skillsMap).map(([category, categoryCourses]) => (
                        <div key={category} className="skill-category-card">
                            <div className="category-header">
                                <div className="category-icon">
                                    {getSkillIcon(category)}
                                </div>
                                <div className="category-info">
                                    <h3>{category}</h3>
                                    <p>{categoryCourses.length} Course{categoryCourses.length !== 1 ? 's' : ''} Tracked</p>
                                </div>
                            </div>

                            <div className="course-list">
                                {categoryCourses.map((course, idx) => (
                                    <div key={idx} className="course-item">
                                        <span className="course-name">{course.name}</span>

                                        <div className="course-status-group">
                                            {/* Progress Bar Visual */}
                                            <div className="progress-bar-container" title={course.status}>
                                                <div
                                                    className={`progress-bar ${!course.grade ? 'in-progress' : 'completed'}`}
                                                ></div>
                                            </div>

                                            {/* Status Badge */}
                                            <span className={`status-badge ${getGradeClass(course.grade)}`}>
                                                {course.grade || 'In Progress'}
                                            </span>
                                        </div>
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
