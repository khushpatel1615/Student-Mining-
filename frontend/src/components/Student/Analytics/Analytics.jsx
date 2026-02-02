import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../config';
import { motion } from 'framer-motion';
import { Activity, Users, Award, Zap, AlertTriangle, Bot } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { KPICard, LineChartCard, GaugeCard } from './ChartComponents';
import './Analytics.css';

const Analytics = () => {
    const { token, user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (user && token) {
            fetchLiveAnalytics();
            intervalRef.current = setInterval(() => fetchLiveAnalytics(true), 10000); // 10s poll
        } else if (!authLoading && (!user || !token)) {
            setError('Not authenticated');
            setLoading(false);
        }
        return () => clearInterval(intervalRef.current);
    }, [user, token, authLoading]);

    const fetchLiveAnalytics = async (isPolling = false) => {
        if (!user?.id) return;
        try {
            if (!isPolling) setLoading(true);
            const response = await fetch(`${API_BASE}/student_live_analytics.php?user_id=${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to connect to live stream');
            const json = await response.json();
            if (json.success) {
                setData(json.data);
                setLastUpdated(new Date());
                setError(null);
            } else {
                throw new Error(json.error || 'API Error');
            }
        } catch (err) {
            if (!isPolling) setError(err.message);
        } finally {
            if (!isPolling) setLoading(false);
        }
    };

    if (loading || authLoading) {
        return (
            <div className="analytics-dashboard">
                <div className="analytics-header">
                    <div className="header-title">
                        <div className="skeleton-box" style={{ width: '200px', height: '32px', marginBottom: '8px' }}></div>
                        <div className="skeleton-box" style={{ width: '150px', height: '20px' }}></div>
                    </div>
                </div>
                <div className="kpi-grid">
                    {[1, 2, 3, 4].map(i => <div key={i} className="analytics-card skeleton-box" style={{ height: '180px' }}></div>)}
                </div>
                <div className="chart-grid-2">
                    <div className="analytics-card skeleton-box" style={{ height: '350px' }}></div>
                    <div className="analytics-card skeleton-box" style={{ height: '350px' }}></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="status-container" style={{ color: '#ef4444' }}>
                <AlertTriangle size={48} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0.5rem 0' }}>Connection Failed</h3>
                <p>{error}</p>
                <button onClick={() => fetchLiveAnalytics(false)} className="retry-button">Retry Connection</button>
            </div>
        );
    }

    const safeData = data || {};
    const trends = safeData.trends || {};
    const riskScore = Number(safeData.risk_score || 0);

    // Calculate deltas
    const getDelta = (arr) => {
        if (!arr || arr.length < 2) return "+0.0%";
        const start = arr[arr.length - 1].value;
        const end = arr[0].value;
        const delta = end - start;
        return (delta >= 0 ? "+" : "") + delta.toFixed(1) + "%";
    };

    const grades = trends.grades || [];
    const atts = trends.attendance || [];
    const risks = trends.risk || [];

    const gradeDelta = getDelta(grades);
    const attDelta = getDelta(atts);
    const engagementDelta = "+2.4%"; // Simulated

    const gradeTrend = parseFloat(gradeDelta) >= 0 ? 'up' : 'down';
    const attTrend = parseFloat(attDelta) >= 0 ? 'up' : 'down';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="analytics-dashboard"
        >
            {/* Header */}
            <div className="analytics-header">
                <div className="header-title">
                    <h2>Performance Overview</h2>
                    <p>Real-time academic insights & risk analysis</p>
                </div>
                <div className="header-actions">
                    <div className="live-indicator">
                        <div className="ping-dot">
                            <span className="ping-animate"></span>
                            <span className="ping-solid"></span>
                        </div>
                        <span>
                            Updated {lastUpdated ? lastUpdated.toLocaleTimeString() : '...'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Row 1: KPI Cards */}
            <div className="kpi-grid">
                <GaugeCard
                    title="Risk Analysis"
                    score={riskScore}
                    label={safeData.risk_label || 'Unknown'}
                    color={riskScore > 50 ? '#22c55e' : '#ef4444'}
                    icon={Bot}
                />
                <KPICard
                    title="Attendance"
                    value={`${Number(safeData.attendance_percent || 0).toFixed(1)}%`}
                    subValue="Present Rate"
                    trend={attTrend}
                    trendValue={attDelta}
                    icon={Users}
                    color="blue"
                />
                <KPICard
                    title="Average Grade"
                    value={Number(safeData.avg_grade || 0).toFixed(1)}
                    subValue={`GPA: ${safeData.gpa_4}`}
                    trend={gradeTrend}
                    trendValue={gradeDelta}
                    icon={Award}
                    color="purple"
                />
                <KPICard
                    title="Engagement"
                    value={`${Number(safeData.engagement_percent || 0).toFixed(0)}%`}
                    subValue="Participation"
                    trend="up"
                    trendValue={engagementDelta}
                    icon={Zap}
                    color="orange"
                />
            </div>

            {/* Row 2: Medium Charts */}
            <div className="chart-grid-2">
                <LineChartCard
                    title="Grade Trends"
                    subTitle="Academic performance over last 30 days"
                    data={grades}
                    dataKey="value"
                    color="#8b5cf6"
                    fillId="gradeGradient"
                />
                <LineChartCard
                    title="Attendance History"
                    subTitle="Presence stability analysis"
                    data={atts}
                    dataKey="value"
                    color="#3b82f6"
                    fillId="attGradient"
                />
            </div>

            {/* Row 3: Full Width Risk Chart */}
            <div className="analytics-card">
                <div className="chart-header">
                    <div className="chart-title-group">
                        <h3>Risk Assessment Timeline</h3>
                        <p>Historical risk score fluctuation analysis (Last 30 Days)</p>
                    </div>
                    <Activity size={20} className="text-red" />
                </div>
                <div className="chart-container-large">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={risks} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="riskMain" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis
                                dataKey="t"
                                stroke="#9ca3af"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={30}
                            />
                            <YAxis stroke="#9ca3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#ef4444"
                                strokeWidth={3}
                                fill="url(#riskMain)"
                                isAnimationActive={true}
                                animationDuration={1000}
                                activeDot={{ r: 6, strokeWidth: 2, stroke: "white" }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </motion.div>
    );
};

export default Analytics;
