import React, { useState, useEffect, useRef } from 'react';
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

// Widgets
import {
    StatCard,
    ChartCard,
    AreaChartWidget,
    GaugeWidget
} from '../../ui/DashboardWidgets';

import './StudentAnalyticsDashboard.css';

// --- Mock Data Map ---
const MOCK_DATA_MAP = {
    '7d': {
        grades: [
            { t: 'Mon', value: 82 }, { t: 'Tue', value: 84 }, { t: 'Wed', value: 83 },
            { t: 'Thu', value: 85 }, { t: 'Fri', value: 86 }, { t: 'Sat', value: 88 }, { t: 'Sun', value: 87 }
        ],
        attendance: [
            { t: 'Mon', value: 100 }, { t: 'Tue', value: 100 }, { t: 'Wed', value: 100 },
            { t: 'Thu', value: 90 }, { t: 'Fri', value: 100 }
        ]
    },
    '30d': {
        grades: [
            { t: 'Jan 15', value: 78 }, { t: 'Jan 18', value: 82 }, { t: 'Jan 22', value: 80 },
            { t: 'Jan 25', value: 85 }, { t: 'Jan 29', value: 83 }, { t: 'Feb 01', value: 88 },
            { t: 'Feb 05', value: 86 }, { t: 'Feb 08', value: 89 }, { t: 'Feb 12', value: 92 }
        ],
        attendance: [
            { t: 'Wk 1', value: 100 }, { t: 'Wk 2', value: 100 }, { t: 'Wk 3', value: 95 },
            { t: 'Wk 4', value: 90 }, { t: 'Wk 5', value: 95 }, { t: 'Wk 6', value: 92 },
            { t: 'Wk 7', value: 100 }
        ]
    },
    'term': {
        grades: [
            { t: 'Sep', value: 70 }, { t: 'Oct', value: 75 }, { t: 'Nov', value: 78 },
            { t: 'Dec', value: 82 }, { t: 'Jan', value: 85 }, { t: 'Feb', value: 88 }
        ],
        attendance: [
            { t: 'Sep', value: 98 }, { t: 'Oct', value: 96 }, { t: 'Nov', value: 94 },
            { t: 'Dec', value: 95 }, { t: 'Jan', value: 97 }, { t: 'Feb', value: 96 }
        ]
    }
};

const StudentAnalyticsDashboard = () => {
    const { user } = useAuth();
    // 1. Stateful Tracking
    const [timeRange, setTimeRange] = useState('30d');
    const [attendanceTimeRange, setAttendanceTimeRange] = useState('30d'); // Separate state for attendance
    const [selectedCourse, setSelectedCourse] = useState('all');
    const [loading, setLoading] = useState(true);

    const isNewUser = user?.email === 'test1@gmail.com'; // Guardrail for new user

    // Simulate initial loading
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    // 2. Dynamic Data Mapping & Logic
    const currentData = MOCK_DATA_MAP[timeRange] || MOCK_DATA_MAP['30d'];
    const attendanceData = MOCK_DATA_MAP[attendanceTimeRange]?.attendance || MOCK_DATA_MAP['30d'].attendance;

    // Apply course filter logic (simple modifier for demo)
    const getFilteredGrades = () => {
        let baseData = [...currentData.grades];
        if (selectedCourse === 'math') {
            return baseData.map(d => ({ ...d, value: Math.max(0, Math.min(100, d.value - 5 + Math.random() * 3)) }));
        }
        if (selectedCourse === 'cs') {
            return baseData.map(d => ({ ...d, value: Math.max(0, Math.min(100, d.value + 4 + Math.random() * 2)) }));
        }
        return baseData;
    };

    const displayGrades = isNewUser ? [] : getFilteredGrades();
    const displayAttendance = isNewUser ? [] : attendanceData;

    // 4. Functional Branching (Actions)
    const handleChartAction = (action, context) => {
        console.log(`Action triggered: ${action} for ${context}`);
        if (action === 'export') {
            alert(`Exporting CSV for ${context}...`);
        } else if (action === 'details') {
            alert(`Opening details view for ${context}...`);
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
                        <span>Updated Just Now</span>
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
                        value={isNewUser ? "N/A" : "Low"}
                        subValue={isNewUser ? "No data" : "Risk Score: 12/100"}
                        trend={isNewUser ? "neutral" : "down"}
                        trendValue={isNewUser ? "-" : "-5% vs last week"}
                        color="green"
                        icon={Activity}
                        data={isNewUser ? [] : [
                            { v: 30 }, { v: 28 }, { v: 25 }, { v: 20 }, { v: 18 }, { v: 15 }, { v: 12 }
                        ]}
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <StatCard
                        title="Attendance"
                        value={isNewUser ? "0%" : "96.5%"}
                        subValue="Present Rate"
                        trend="neutral"
                        trendValue="Stable"
                        color="blue"
                        icon={Users}
                        data={isNewUser ? [] : [
                            { v: 95 }, { v: 95 }, { v: 100 }, { v: 100 }, { v: 90 }, { v: 100 }, { v: 100 }
                        ]}
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <StatCard
                        title="Average Grade"
                        value={isNewUser ? "0.0" : "82.4"}
                        subValue="GPA: 3.4"
                        trend={isNewUser ? "neutral" : "up"}
                        trendValue={isNewUser ? "-" : "+1.2% this month"}
                        color="purple"
                        icon={BookOpen}
                        data={isNewUser ? [] : [
                            { v: 78 }, { v: 79 }, { v: 80 }, { v: 81 }, { v: 83 }, { v: 82 }, { v: 84 }
                        ]}
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <StatCard
                        title="Engagement"
                        value={isNewUser ? "N/A" : "High"}
                        subValue={isNewUser ? "-" : "Top 15% of class"}
                        trend={isNewUser ? "neutral" : "up"}
                        trendValue={isNewUser ? "-" : "Rising activity"}
                        color="orange"
                        icon={Zap}
                        data={isNewUser ? [] : [
                            { v: 40 }, { v: 50 }, { v: 45 }, { v: 60 }, { v: 75 }, { v: 80 }, { v: 85 }
                        ]}
                    />
                </motion.div>
            </motion.div>

            {/* 3. Charts Row */}
            <div className="analytics-charts-row">
                <motion.div variants={itemVariants} className="chart-wrapper-left">
                    <ChartCard
                        title="Grade Trends"
                        subtitle={`Performance in ${selectedCourse === 'all' ? 'All Courses' : selectedCourse === 'math' ? 'Mathematics 101' : 'Comp Sci 202'}`}
                        headerAction={
                            <SimpleDropdown
                                value={selectedCourse}
                                onChange={setSelectedCourse}
                                options={[
                                    { value: 'all', label: 'All Courses' },
                                    { value: 'math', label: 'Mathematics 101' },
                                    { value: 'cs', label: 'Comp Sci 202' }
                                ]}
                            />
                        }
                    >
                        {loading ? (
                            <div style={{ height: '300px', width: '100%', background: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                Loading visualization...
                            </div>
                        ) : isNewUser || displayGrades.length === 0 ? (
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
                        ) : isNewUser || displayAttendance.length === 0 ? (
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
            <div className="analytics-chart-row" style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                <motion.div variants={itemVariants}>
                    <ChartCard
                        title="Risk Meter"
                        subtitle="Current composite score"
                        headerAction={<ActionMenu onAction={(action) => handleChartAction(action, 'Risk Meter')} />}
                    >
                        {isNewUser ? (
                            <div style={{ height: '220px', width: '100%', background: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                <p>Not enough data</p>
                            </div>
                        ) : (
                            <>
                                <GaugeWidget
                                    score={12}
                                    label="Safe Zone"
                                    color="#22c55e"
                                    height={220}
                                />
                                <div style={{ textAlign: 'center', marginTop: '-1rem', paddingBottom: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
                                    <p>You are in the safe zone.</p>
                                </div>
                            </>
                        )}
                    </ChartCard>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <ChartCard title="Recent Insights" subtitle="AI-driven observations">
                        {isNewUser ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem', alignItems: 'center', color: '#94a3b8' }}>
                                <p>Insights will appear here as you progress.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7' }}>
                                    <TrendingUp size={18} color="#16a34a" style={{ marginTop: '4px' }} />
                                    <div>
                                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#166534', margin: 0 }}>Grade Improvement</h4>
                                        <p style={{ fontSize: '0.875rem', color: '#15803d', margin: '0.25rem 0 0 0' }}>Your performance in <strong>Computer Science</strong> has improved by 8% over the last 2 weeks.</p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#fffbeb', border: '1px solid #fef3c7' }}>
                                    <AlertCircle size={18} color="#d97706" style={{ marginTop: '4px' }} />
                                    <div>
                                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#92400e', margin: 0 }}>Attendance Watch</h4>
                                        <p style={{ fontSize: '0.875rem', color: '#b45309', margin: '0.25rem 0 0 0' }}>You missed 2 classes in <strong>Advanced Math</strong>. Try to maintain above 90% attendance.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </ChartCard>
                </motion.div>
            </div>

        </motion.div>
    );
};

export default StudentAnalyticsDashboard;
