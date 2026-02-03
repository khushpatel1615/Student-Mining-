import React, { useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadialBarChart, RadialBar, Legend
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Minus, Activity, MoreHorizontal } from 'lucide-react';
import './DashboardWidgets.css';

/**
 * Reusable Dashboard Components
 * Copy these skeletons to build your dashboard pages.
 */

/* --- 1. StatCard (The 4 top cards) --- */
export const StatCard = ({
    title = "Metric",
    value = "0",
    subValue,
    trend = "neutral", // 'up', 'down', 'neutral'
    trendValue,
    icon: Icon = Activity,
    color = "blue", // 'purple', 'blue', 'green', 'orange', 'red'
    data = [] // Optional sparkline data
}) => {
    // Generate dummy sparkline if no data provided
    const sparkData = useMemo(() => {
        if (data.length > 0) return data;
        return Array.from({ length: 15 }, (_, i) => ({
            v: 50 + (trend === 'up' ? i * 2 : trend === 'down' ? -i * 2 : 0) + Math.random() * 20
        }));
    }, [data, trend]);

    const themeColors = {
        purple: '#7c3aed',
        blue: '#2563eb',
        green: '#16a34a',
        orange: '#ea580c',
        red: '#dc2626',
    };

    const hexColor = themeColors[color] || themeColors.blue;
    const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
    const trendClass = `trend-${trend}`; // trend-up, trend-down, etc.

    return (
        <div className={`dashboard-card theme-${color}`}>
            <div className="stat-card-header">
                <span className="stat-card-title">{title}</span>
                <div className="stat-icon-wrapper">
                    <Icon size={20} strokeWidth={2} />
                </div>
            </div>

            <div className="stat-card-content">
                <div className="stat-value-group">
                    <h3>{value}</h3>
                    {trendValue && (
                        <div className={`stat-trend ${trendClass}`}>
                            <TrendIcon size={12} strokeWidth={3} />
                            <span>{trendValue}</span>
                        </div>
                    )}
                </div>

                {/* Sparkline */}
                <div className="stat-micro-chart">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparkData}>
                            <Line
                                type="monotone"
                                dataKey="v"
                                stroke={hexColor}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
            {subValue && <div className="stat-sublabel">{subValue}</div>}
        </div>
    );
};

/* --- 2. ChartCard (Generic Chart Container) --- */
export const ChartCard = ({
    title = "Chart Title",
    subtitle,
    children,
    headerAction
}) => {
    return (
        <div className="dashboard-card">
            <div className="chart-card-header">
                <div className="chart-title-group">
                    <h3>{title}</h3>
                    {subtitle && <p>{subtitle}</p>}
                </div>
                {headerAction || (
                    <button className="chart-select">
                        <MoreHorizontal size={16} />
                    </button>
                )}
            </div>
            {children}
        </div>
    );
};

/* --- 3. AreaChartWidget (The Main Chart) --- */
export const AreaChartWidget = ({
    data = [],
    dataKey = "value",
    color = "#3b82f6",
    height = 300,
    showGrid = true
}) => {
    const gradientId = `fill-${color.replace('#', '')}-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div style={{ width: '100%', height: `${height}px` }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />}
                    <XAxis
                        dataKey="t" // Expects 't' or 'name' for label
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={30}
                    />
                    <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        width={30}
                    />
                    <Tooltip
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="widget-tooltip">
                                        <p className="widget-tooltip-label">{label}</p>
                                        <p className="widget-tooltip-value" style={{ color: color }}>
                                            {payload[0].value}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={3}
                        fill={`url(#${gradientId})`}
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

/* --- 4. GaugeWidget (Risk Score) --- */
export const GaugeWidget = ({
    score = 0,
    max = 100,
    color = "#3b82f6",
    label = "Score",
    height = 160
}) => {
    const data = [{ name: 'Score', value: score, fill: color }];

    return (
        <div style={{ width: '100%', height: `${height}px`, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                    cx="50%"
                    cy="80%"
                    innerRadius="80%"
                    outerRadius="110%"
                    barSize={12}
                    data={data}
                    startAngle={180}
                    endAngle={0}
                >
                    <RadialBar
                        minAngle={15}
                        background={{ fill: '#f1f5f9' }}
                        clockWise
                        dataKey="value"
                        cornerRadius={10}
                    />
                </RadialBarChart>
            </ResponsiveContainer>
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '15%'
            }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: color, lineHeight: 1 }}>
                    {score}
                </span>
                <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: color,
                    backgroundColor: `${color}20`,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    marginTop: '4px'
                }}>
                    {label}
                </span>
            </div>
        </div>
    );
};
