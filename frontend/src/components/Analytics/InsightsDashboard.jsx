import { API_BASE } from '../../config';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    BarChart3,
    TrendingUp,
    Users,
    PieChart,
    RefreshCw,
    ChevronRight,
    Home,
    AlertTriangle,
    Star,
    Shield
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Bar, Scatter, Doughnut } from 'react-chartjs-2';
import './InsightsDashboard.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);



const InsightsDashboard = () => {
    const { token } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `${API_BASE}/analytics/features.php?action=stats`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Chart: Risk Distribution (Doughnut)
    const riskDistributionData = {
        labels: ['At Risk', 'Safe', 'Star Performers'],
        datasets: [{
            data: [
                stats?.risk_distribution?.['At Risk'] || 0,
                stats?.risk_distribution?.['Safe'] || 0,
                stats?.risk_distribution?.['Star'] || 0
            ],
            backgroundColor: [
                'rgba(239, 68, 68, 0.85)',
                'rgba(59, 130, 246, 0.85)',
                'rgba(34, 197, 94, 0.85)'
            ],
            borderColor: [
                '#ef4444',
                '#3b82f6',
                '#22c55e'
            ],
            borderWidth: 2,
            hoverOffset: 8
        }]
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: '#64748b',
                    padding: 20,
                    font: { size: 12, weight: '500' },
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                padding: 14,
                titleFont: { size: 13, weight: '600' },
                bodyFont: { size: 12 },
                cornerRadius: 10,
                displayColors: true,
                boxPadding: 6
            }
        }
    };

    // Chart: Attendance vs Grade Correlation (Scatter) - FIXED
    const correlationPoints = (stats?.correlation_att_grade || []).map(p => ({
        x: parseFloat(p.x) || 0,
        y: parseFloat(p.y) || 0
    }));

    const correlationData = {
        datasets: [{
            label: 'Students',
            data: correlationPoints,
            backgroundColor: 'rgba(99, 102, 241, 0.6)',
            borderColor: 'rgba(99, 102, 241, 1)',
            pointRadius: 10,
            pointHoverRadius: 14,
            pointBorderWidth: 2,
            pointHoverBorderWidth: 3
        }]
    };

    const scatterOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false // Hide legend completely
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                padding: 14,
                cornerRadius: 10,
                titleFont: { size: 13, weight: '600' },
                bodyFont: { size: 12 },
                displayColors: false,
                callbacks: {
                    title: () => 'Student Data Point',
                    label: (context) => {
                        return [
                            `Attendance: ${context.parsed.x.toFixed(1)}%`,
                            `Grade: ${context.parsed.y.toFixed(1)}%`
                        ];
                    }
                }
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Attendance %',
                    color: '#64748b',
                    font: { size: 12, weight: '600' },
                    padding: { top: 10 }
                },
                min: 0,
                max: 100,
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)',
                    drawBorder: false
                },
                ticks: {
                    color: '#64748b',
                    font: { size: 11 },
                    stepSize: 20
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Grade %',
                    color: '#64748b',
                    font: { size: 12, weight: '600' },
                    padding: { bottom: 10 }
                },
                min: 0,
                max: 100,
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)',
                    drawBorder: false
                },
                ticks: {
                    color: '#64748b',
                    font: { size: 11 },
                    stepSize: 20
                }
            }
        },
        interaction: {
            mode: 'nearest',
            intersect: true
        }
    };

    // Chart: Cohort Grades (Bar)
    const cohortData = {
        labels: (stats?.cohort_grades || []).map(c => `Semester ${c.current_semester || '?'}`),
        datasets: [{
            label: 'Average Grade %',
            data: (stats?.cohort_grades || []).map(c => parseFloat(c.avg_grade) || 0),
            backgroundColor: 'rgba(99, 102, 241, 0.75)',
            borderColor: '#6366f1',
            borderWidth: 2,
            borderRadius: 10,
            barThickness: 50
        }]
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                padding: 14,
                cornerRadius: 10,
                titleFont: { size: 13, weight: '600' },
                bodyFont: { size: 12 },
                callbacks: {
                    label: (context) => `Average: ${context.parsed.y.toFixed(1)}%`
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: '#64748b',
                    font: { weight: '500', size: 12 }
                }
            },
            y: {
                beginAtZero: true,
                max: 100,
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)',
                    drawBorder: false
                },
                ticks: {
                    color: '#64748b',
                    font: { size: 11 },
                    callback: (value) => `${value}%`,
                    stepSize: 25
                }
            }
        }
    };

    if (loading) {
        return (
            <div className="insights-loading">
                <RefreshCw className="spin" size={32} />
                <p>Loading analytics insights...</p>
            </div>
        );
    }

    const totalStudents = (stats?.risk_distribution?.['At Risk'] || 0) +
        (stats?.risk_distribution?.['Safe'] || 0) +
        (stats?.risk_distribution?.['Star'] || 0);

    return (
        <div className="insights-dashboard">
            {/* Breadcrumbs */}
            <nav className="insights-breadcrumbs">
                <a href="/admin/dashboard?tab=overview"><Home size={14} /> Dashboard</a>
                <ChevronRight size={14} />
                <span className="current">Analytics Insights</span>
            </nav>

            {/* Header */}
            <div className="insights-header">
                <div className="insights-title">
                    <div className="insights-icon">
                        <BarChart3 size={22} />
                    </div>
                    <div>
                        <h2>Analytics Insights</h2>
                        <p>Phase B: Descriptive Mining - Patterns & Distributions</p>
                    </div>
                </div>
                <button className="refresh-btn" onClick={fetchStats}>
                    <RefreshCw size={16} /> Refresh Data
                </button>
            </div>

            {/* Modern Summary Stats Row */}
            <div className="insights-stats-row">
                <div className="insights-stat-card critical">
                    <div className="stat-icon-circle">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats?.risk_distribution?.['At Risk'] || 0}</span>
                        <span className="stat-label">At Risk Students</span>
                    </div>
                </div>
                <div className="insights-stat-card safe">
                    <div className="stat-icon-circle">
                        <Shield size={20} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats?.risk_distribution?.['Safe'] || 0}</span>
                        <span className="stat-label">Safe Students</span>
                    </div>
                </div>
                <div className="insights-stat-card star">
                    <div className="stat-icon-circle">
                        <Star size={20} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats?.risk_distribution?.['Star'] || 0}</span>
                        <span className="stat-label">Star Performers</span>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="insights-grid">
                {/* Risk Distribution */}
                <div className="insight-card">
                    <div className="card-header">
                        <PieChart size={20} />
                        <h3>Risk Distribution</h3>
                    </div>
                    <div className="chart-container doughnut">
                        <Doughnut data={riskDistributionData} options={doughnutOptions} />
                    </div>
                    <p className="chart-insight">
                        {totalStudents} total students analyzed
                    </p>
                </div>

                {/* Correlation: Attendance vs Grade */}
                <div className="insight-card">
                    <div className="card-header">
                        <TrendingUp size={20} />
                        <h3>Correlation: Attendance vs Grade</h3>
                        <span className="chart-badge">{correlationPoints.length} points</span>
                    </div>
                    <div className="chart-container scatter">
                        <Scatter data={correlationData} options={scatterOptions} />
                    </div>
                    <p className="chart-insight">
                        Each point represents a student. Higher clustering in top-right indicates positive correlation.
                    </p>
                </div>

                {/* Cohort Analysis */}
                <div className="insight-card">
                    <div className="card-header">
                        <Users size={20} />
                        <h3>Cohort Analysis - Average Grade by Semester</h3>
                    </div>
                    <div className="chart-container bar">
                        <Bar data={cohortData} options={barOptions} />
                    </div>
                    <p className="chart-insight">
                        Performance comparison across student cohorts by semester level.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default InsightsDashboard;



