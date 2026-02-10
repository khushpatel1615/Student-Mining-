import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Award, BarChart3, Target, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../config';

const Performance = () => {
    const { token, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [grades, setGrades] = useState([]);
    const [summary, setSummary] = useState({ gpa: 0, attendance: 0 });

    useEffect(() => {
        if (token) {
            fetchPerformance();
        }
    }, [token]);

    const fetchPerformance = async () => {
        try {
            // Fetch grades
            const gradesResponse = await fetch(`${API_BASE}/grades.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const gradesData = await gradesResponse.json();
            if (gradesData.success) {
                setGrades(gradesData.data || []);
            }

            // Fetch dashboard summary
            const summaryResponse = await fetch(`${API_BASE}/student_dashboard.php?action=summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const summaryData = await summaryResponse.json();
            if (summaryData.success && summaryData.data.summary) {
                setSummary({
                    gpa: summaryData.data.summary.gpa_4 || summaryData.data.summary.gpa || 0,
                    attendance: summaryData.data.summary.overall_attendance || 0
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getGradeColor = (grade) => {
        if (!grade) return '#6b7280';
        if (grade === 'A+' || grade === 'A') return '#16a34a';
        if (grade === 'B+' || grade === 'B') return '#3b82f6';
        if (grade === 'C+' || grade === 'C') return '#f59e0b';
        return '#dc2626';
    };

    const getPerformanceTrend = () => {
        if (summary.gpa >= 3.5) return { label: 'Excellent', color: '#16a34a', icon: <Award size={24} /> };
        if (summary.gpa >= 3.0) return { label: 'Good', color: '#3b82f6', icon: <TrendingUp size={24} /> };
        if (summary.gpa >= 2.5) return { label: 'Average', color: '#f59e0b', icon: <Target size={24} /> };
        return { label: 'Needs Improvement', color: '#dc2626', icon: <AlertTriangle size={24} /> };
    };

    const trend = getPerformanceTrend();

    const clampPercentage = (value) => {
        const num = parseFloat(value);
        if (isNaN(num)) return null;
        if (num < 0) return 0;
        if (num > 100) return 100;
        return num;
    };

    const currentSemesterGrades = useMemo(() => {
        if (!user?.current_semester) return grades;
        return grades.filter(g => g.semester == user.current_semester);
    }, [grades, user?.current_semester]);

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner"></div><p>Loading performance data...</p></div>;
    }

    return (
        <div style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                    <BarChart3 size={24} /> Academic Performance
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Track your academic progress and achievements</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Cumulative GPA</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{summary.gpa.toFixed(2)}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Out of 4.0</div>
                </div>

                <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Attendance Rate</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{summary.attendance.toFixed(0)}%</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{summary.attendance >= 75 ? 'Good' : 'Below threshold'}</div>
                </div>

                <div style={{ background: `linear-gradient(135deg, ${trend.color} 0%, ${trend.color}dd 100%)`, padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Performance</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {trend.icon} {trend.label}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Current status</div>
                </div>
            </div>

            <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>📊 Subject-wise Performance</h3>
                {currentSemesterGrades.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                        <BarChart3 size={64} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                        <h3>No grades available</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Grades will appear here once they are published</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {currentSemesterGrades.map(grade => (
                            <div key={grade.id} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>{grade.subject_name}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{grade.subject_code}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Score</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                                            {clampPercentage(grade.final_percentage) ?? '-'} / 100
                                        </div>
                                    </div>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: getGradeColor(grade.final_grade), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700 }}>
                                        {grade.final_grade || 'N/A'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#ecfdf5', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '1rem', color: '#065f46', margin: '0 0 0.5rem' }}>🎯 Performance Insights</h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#047857', fontSize: '0.9rem' }}>
                    <li>Maintain a GPA above 3.0 for academic honors</li>
                    <li>Keep attendance above 75% to remain eligible for exams</li>
                    <li>Focus on subjects with grades below B to improve overall performance</li>
                </ul>
            </div>
        </div>
    );
};

export default Performance;
