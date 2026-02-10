import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Activity,
    BookOpen,
    Users,
    Zap,
    ChevronDown,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    MoreHorizontal,
    BarChart2
} from 'lucide-react';

import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../config';

// Widgets
import {
    StatCard,
    ChartCard,
    AreaChartWidget,
    GaugeWidget
} from '../../ui/DashboardWidgets';

import './StudentAnalyticsDashboard.css';

const StudentAnalyticsDashboard = () => {
    const { user, token } = useAuth();
    // 1. Stateful Tracking
    const [timeRange, setTimeRange] = useState('30d');
    const [attendanceTimeRange, setAttendanceTimeRange] = useState('30d'); // Separate state for attendance
    const [selectedCourse, setSelectedCourse] = useState('all');
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [gradeTrends, setGradeTrends] = useState([]);
    const [attendanceTrends, setAttendanceTrends] = useState([]);
    const [riskTrends, setRiskTrends] = useState([]);
    const [insights, setInsights] = useState([]);
    const [updatedAt, setUpdatedAt] = useState(null);

    useEffect(() => {
        if (!token) return;

        let gradesSource = null;
        let attendanceSource = null;
        let aborted = false;

        const fetchAnalyticsOnce = async (range) => {
            const params = new URLSearchParams({
                action: 'analytics',
                range,
                semester: String(user?.current_semester || 1)
            });
            const res = await fetch(`${API_BASE}/student_dashboard.php?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (!data?.success) throw new Error(data?.error || 'Failed to load analytics');
            return data.data;
        };

        const setupEventSource = (range, onData) => {
            const params = new URLSearchParams({
                action: 'analytics_stream',
                range,
                semester: String(user?.current_semester || 1),
                token
            });
            const url = `${API_BASE}/student_dashboard.php?${params.toString()}`;
            const source = new window.EventSource(url);
            source.addEventListener('analytics', (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (payload?.success && payload?.data) {
                        onData(payload.data);
                    }
                } catch (e) {
                    console.error('Failed to parse analytics stream:', e);
                }
            });
            source.onerror = () => {
                // Let browser retry; if it keeps failing we will keep last known data
            };
            return source;
        };

        const init = async () => {
            setLoading(true);
            try {
                const [gradesPayload, attendancePayload] = await Promise.all([
                    fetchAnalyticsOnce(timeRange),
                    fetchAnalyticsOnce(attendanceTimeRange)
                ]);
                if (aborted) return;
                setSummary(gradesPayload.summary || null);
                setGradeTrends(gradesPayload.trends?.grades || []);
                setRiskTrends(gradesPayload.trends?.risk || []);
                setInsights(gradesPayload.insights || []);
                setAttendanceTrends(attendancePayload.trends?.attendance || []);
                setUpdatedAt(gradesPayload.summary?.updated_at || null);
            } catch (err) {
                if (!aborted) {
                    console.error('Failed to load analytics:', err);
                }
            } finally {
                if (!aborted) setLoading(false);
            }

            if (typeof EventSource !== 'undefined') {
                gradesSource = setupEventSource(timeRange, (data) => {
                    setSummary(data.summary || null);
                    setGradeTrends(data.trends?.grades || []);
                    setRiskTrends(data.trends?.risk || []);
                    setInsights(data.insights || []);
                    setUpdatedAt(data.summary?.updated_at || null);
                });
                attendanceSource = setupEventSource(attendanceTimeRange, (data) => {
                    setAttendanceTrends(data.trends?.attendance || []);
                });
            }
        };

        init();

        return () => {
            aborted = true;
            if (gradesSource) gradesSource.close();
            if (attendanceSource) attendanceSource.close();
        };
    }, [token, timeRange, attendanceTimeRange, user?.current_semester]);

    // 2. Dynamic Data Mapping & Logic
    const attendanceData = useMemo(() => attendanceTrends || [], [attendanceTrends]);

    // Apply course filter logic (simple modifier for demo)
    const getFilteredGrades = () => {
        const baseData = [...(gradeTrends || [])];
        return baseData;
    };

    const displayGrades = getFilteredGrades();
    const displayAttendance = attendanceData;

    const getTrendValue = (series) => {
        if (!series || series.length < 2) return null;
        const last = series[series.length - 1]?.value ?? 0;
        const prev = series[series.length - 2]?.value ?? 0;
        if (prev === 0) return null;
        const deltaPct = ((last - prev) / prev) * 100;
        return Math.round(deltaPct * 10) / 10;
    };

    const gradeTrendValue = getTrendValue(displayGrades);
    const attendanceTrendValue = getTrendValue(displayAttendance);
    const riskTrendValue = getTrendValue(riskTrends);
    // 4. Functional Branching (Actions)
    const handleChartAction = (action, context) => {
        console.log(`Action triggered: ${action} for ${context}`);
        if (action === 'export') {
            window.alert(`Exporting CSV for ${context}...`);
        } else if (action === 'details') {
            window.alert(`Opening details view for ${context}...`);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 50 } }
    };

    // --- New Simple Toggle Dropdown Component ---
    const SimpleDropdown = ({ value, onChange, options, placeholder, icon: Icon = ChevronDown }) => {
        const [isOpen, setIsOpen] = useState(false);
        const dropdownRef = useRef(null);

        // Close on click outside
        useEffect(() => {
            function handleClickOutside(event) {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                    setIsOpen(false);
                }
            }
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [dropdownRef]);

        const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

        return (
            <div className="dropdown-container" ref={dropdownRef}>
                <button
                    className="custom-select-trigger"
                    onClick={() => setIsOpen(!isOpen)}
                    type="button"
                >
                    <span style={{ marginRight: '8px' }}>{selectedLabel}</span>
                    <Icon size={14} className="text-gray-500" />
                </button>

                {isOpen && (
                    <div className="dropdown-menu">
                        {options.map(opt => (
                            <button
                                key={opt.value}
                                className={`dropdown-item ${opt.value === value ? 'active' : ''}`}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                            >
                                {opt.value === value && (
                                    <span className="dropdown-icon-wrapper">
                                        <CheckCircle size={14} />
                                    </span>
                                )}
                                <span style={{ paddingLeft: opt.value === value ? '0' : '28px' }}>
                                    {opt.label}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Generic Action Menu (Simple Context Menu)
    const ActionMenu = ({ onAction }) => {
        const [isOpen, setIsOpen] = useState(false);
        const ref = useRef(null);

        useEffect(() => {
            const clickOut = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
            document.addEventListener('mousedown', clickOut);
            return () => document.removeEventListener('mousedown', clickOut);
        }, []);

        const handleSelect = (action) => {
            if (onAction) onAction(action);
            setIsOpen(false);
        };

        return (
            <div className="dropdown-container" ref={ref}>
                <button
                    className="chart-select"
                    onClick={() => setIsOpen(!isOpen)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <MoreHorizontal size={16} />
                </button>
                {isOpen && (
                    <div className="dropdown-menu" style={{ width: '160px' }}>
                        <button className="dropdown-item" onClick={() => handleSelect('details')}>View Details</button>
                        <button className="dropdown-item" onClick={() => handleSelect('export')}>Export CSV</button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <motion.div
            className="analytics-page-container"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* 1. Header Section */}
            <header className="analytics-header-section">
                <div className="analytics-title-group">
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        Performance Overview
                    </motion.h2>
                    <p>Real-time academic insights & risk analysis</p>
                </div>

                <div className="analytics-controls">
                    <div className="live-indicator-badge">
                        <div className="pulsing-dot"></div>
                        <span>{updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString()}` : 'Updated Just Now'}</span>
                    </div>

                    <SimpleDropdown
                        value={timeRange}
                        onChange={setTimeRange} // Updates state and chart data
                        options={[
                            { value: '7d', label: 'Last 7 Days' },
                            { value: '30d', label: 'Last 30 Days' },
                            { value: 'term', label: 'This Term' }
                        ]}
                    />
                </div>
            </header>

            {/* 2. KPI Row */}
            <motion.div className="analytics-kpi-grid" variants={containerVariants}>
                <motion.div variants={itemVariants}>
                    <StatCard
                        title="Risk Analysis"
                        value={summary?.risk_label || "N/A"}
                        subValue={summary ? `Risk Score: ${summary.risk_score}/100` : "No data"}
                        trend={riskTrendValue === null ? "neutral" : riskTrendValue <= 0 ? "down" : "up"}
                        trendValue={riskTrendValue === null ? "-" : `${riskTrendValue > 0 ? '+' : ''}${riskTrendValue}%`}
                        color="green"
                        icon={Activity}
                        data={(riskTrends || []).map(d => ({ v: d.value }))}
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <StatCard
                        title="Attendance"
                        value={summary ? `${summary.attendance_rate}%` : "0%"}
                        subValue="Present Rate"
                        trend={attendanceTrendValue === null ? "neutral" : attendanceTrendValue >= 0 ? "up" : "down"}
                        trendValue={attendanceTrendValue === null ? "Stable" : `${attendanceTrendValue > 0 ? '+' : ''}${attendanceTrendValue}%`}
                        color="blue"
                        icon={Users}
                        data={(displayAttendance || []).map(d => ({ v: d.value }))}
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <StatCard
                        title="Average Grade"
                        value={summary ? `${summary.average_grade}` : "0.0"}
                        subValue={summary ? "Based on latest assessments" : "No data"}
                        trend={gradeTrendValue === null ? "neutral" : gradeTrendValue >= 0 ? "up" : "down"}
                        trendValue={gradeTrendValue === null ? "-" : `${gradeTrendValue > 0 ? '+' : ''}${gradeTrendValue}%`}
                        color="purple"
                        icon={BookOpen}
                        data={(displayGrades || []).map(d => ({ v: d.value }))}
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <StatCard
                        title="Engagement"
                        value={summary?.engagement || "N/A"}
                        subValue={summary ? "Activity level" : "-"}
                        trend="neutral"
                        trendValue="Stable"
                        color="orange"
                        icon={Zap}
                        data={(riskTrends || []).map(d => ({ v: 100 - d.value }))}
                    />
                </motion.div>
            </motion.div>

            {/* 3. Charts Row */}
            <div className="analytics-charts-row">
                <motion.div variants={itemVariants} className="chart-wrapper-left">
                    <ChartCard
                        title="Grade Trends"
                        subtitle="Performance in All Courses"
                        headerAction={
                            <SimpleDropdown
                                value={selectedCourse}
                                onChange={setSelectedCourse}
                                options={[
                                    { value: 'all', label: 'All Courses' }
                                ]}
                            />
                        }
                    >
                        {loading ? (
                            <div style={{ height: '300px', width: '100%', background: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                Loading visualization...
                            </div>
                        ) : displayGrades.length === 0 ? (
                            <div style={{ height: '300px', width: '100%', background: '#f8fafc', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                <BarChart2 size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <p>Data will appear once your first grade is uploaded</p>
                            </div>
                        ) : (
                            <AreaChartWidget
                                data={displayGrades}
                                color="#8b5cf6"
                                height={320}
                            />
                        )}
                    </ChartCard>
                </motion.div>

                <motion.div variants={itemVariants} className="chart-wrapper-right">
                    <ChartCard
                        title="Attendance History"
                        subtitle="Presence stability"
                        // Updated to independent time range selector as requested
                        headerAction={
                            <SimpleDropdown
                                value={attendanceTimeRange}
                                onChange={setAttendanceTimeRange}
                                options={[
                                    { value: '7d', label: 'Last 7 Days' },
                                    { value: '30d', label: 'Last 30 Days' },
                                    { value: 'term', label: 'This Term' }
                                ]}
                            />
                        }
                    >
                        {loading ? (
                            <div style={{ height: '300px', width: '100%', background: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                Loading...
                            </div>
                        ) : displayAttendance.length === 0 ? (
                            <div style={{ height: '300px', width: '100%', background: '#f8fafc', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                <Users size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <p>No attendance records</p>
                            </div>
                        ) : (
                            <AreaChartWidget
                                data={displayAttendance}
                                color="#3b82f6"
                                height={320}
                            />
                        )}
                    </ChartCard>
                </motion.div>
            </div>

            {/* 4. Bottom Row (Risk + Insights) */}
            <div className="analytics-risk-insights-row">
                <motion.div variants={itemVariants}>
                    <ChartCard
                        title="Risk Meter"
                        subtitle="Current composite score"
                        headerAction={<ActionMenu onAction={(action) => handleChartAction(action, 'Risk Meter')} />}
                    >
                        {!summary ? (
                            <div className="risk-meter-empty">
                                <p>Not enough data</p>
                            </div>
                        ) : (
                            <div className="risk-meter-body">
                                <GaugeWidget
                                    className="risk-meter-gauge"
                                    score={summary.risk_score || 0}
                                    label={summary.risk_label || 'Unknown'}
                                    color={summary.risk_score >= 70 ? '#dc2626' : summary.risk_score >= 40 ? '#ea580c' : '#22c55e'}
                                    height={220}
                                />
                                <div className="risk-meter-caption">
                                    <p>{summary.risk_label === 'Safe' ? 'You are in the safe zone.' : 'Attention recommended based on risk.'}</p>
                                </div>
                            </div>
                        )}
                    </ChartCard>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <ChartCard title="Recent Insights" subtitle="AI-driven observations">
                        {!summary ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem', alignItems: 'center', color: '#94a3b8' }}>
                                <p>Insights will appear here as you progress.</p>
                            </div>
                        ) : insights.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem', alignItems: 'center', color: '#94a3b8' }}>
                                <p>No insights available yet.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem' }}>
                                {insights.map((insight, idx) => {
                                    const tone = insight.tone || 'neutral';
                                    const styleMap = {
                                        success: { bg: '#f0fdf4', border: '#dcfce7', title: '#166534', text: '#15803d', icon: TrendingUp, iconColor: '#16a34a' },
                                        warning: { bg: '#fffbeb', border: '#fef3c7', title: '#92400e', text: '#b45309', icon: AlertCircle, iconColor: '#d97706' },
                                        danger: { bg: '#fef2f2', border: '#fecaca', title: '#991b1b', text: '#b91c1c', icon: AlertCircle, iconColor: '#dc2626' },
                                        neutral: { bg: '#f8fafc', border: '#e2e8f0', title: '#334155', text: '#475569', icon: TrendingUp, iconColor: '#64748b' }
                                    };
                                    const style = styleMap[tone] || styleMap.neutral;
                                    const Icon = style.icon;
                                    return (
                                        <div key={`${insight.type || 'insight'}-${idx}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: style.bg, border: `1px solid ${style.border}` }}>
                                            <Icon size={18} color={style.iconColor} style={{ marginTop: '4px' }} />
                                            <div>
                                                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: style.title, margin: 0 }}>{insight.title}</h4>
                                                <p style={{ fontSize: '0.875rem', color: style.text, margin: '0.25rem 0 0 0' }}>{insight.message}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </ChartCard>
                </motion.div>
            </div>

        </motion.div>
    );
};

export default StudentAnalyticsDashboard;
