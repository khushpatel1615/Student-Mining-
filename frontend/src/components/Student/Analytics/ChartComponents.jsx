import React, { useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadialBarChart, RadialBar, Legend
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Minus, AlertCircle } from 'lucide-react';

/* 
 * Reusable Components with Premium Styling - Upscaled Version
 */

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip">
                <p className="tooltip-label">{label}</p>
                <p className="tooltip-value" style={{ color: payload[0].stroke || payload[0].fill }}>
                    {payload[0].value}
                    {payload[0].name === 'Risk' ? '' : '%'}
                </p>
            </div>
        );
    }
    return null;
};

export const KPICard = ({ title, value, subValue, trend, trendValue, icon: Icon, color }) => {
    const sparkData = useMemo(() => Array.from({ length: 15 }, (_, i) => ({
        v: 50 + (trend === 'up' ? i * 2 : trend === 'down' ? -i * 2 : 0) + Math.random() * 10
    })), [trend]);

    const colorClasses = {
        purple: { text: 'text-purple', bg: 'bg-purple-light', hex: '#8b5cf6' },
        blue: { text: 'text-blue', bg: 'bg-blue-light', hex: '#3b82f6' },
        green: { text: 'text-green', bg: 'bg-green-light', hex: '#22c55e' },
        orange: { text: 'text-orange', bg: 'bg-orange-light', hex: '#f97316' },
        red: { text: 'text-red', bg: 'bg-red-light', hex: '#ef4444' },
    };
    const theme = colorClasses[color] || colorClasses.blue;
    const trendClass = trend === 'up' ? 'delta-up' : trend === 'down' ? 'delta-down' : 'delta-neutral';
    const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;

    return (
        <div className="analytics-card">
            <div className="kpi-header">
                <span className="kpi-title">{title}</span>
                <div className={`kpi-icon-wrapper ${theme.bg}`}>
                    <Icon size={18} className={theme.text} strokeWidth={2.5} />
                </div>
            </div>

            <div className="kpi-content" style={{ marginTop: 'auto' }}>
                <div className="kpi-value-group">
                    <h3>{value}</h3>
                    <div className={`kpi-delta ${trendClass}`}>
                        <TrendIcon size={12} strokeWidth={3} />
                        <span>{trendValue}</span>
                    </div>
                </div>
                {/* Sparkline */}
                <div className="kpi-chart-mini">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparkData}>
                            <Line
                                type="monotone"
                                dataKey="v"
                                stroke={theme.hex}
                                strokeWidth={2.5}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="kpi-sublabel">{subValue}</div>
        </div>
    );
};

export const LineChartCard = ({ title, subTitle, data, dataKey, color, fillId }) => {
    const isEmpty = !data || data.length === 0;

    return (
        <div className="analytics-card">
            <div className="chart-header">
                <div className="chart-title-group">
                    <h3>{title}</h3>
                    <p>{subTitle}</p>
                </div>
                <select className="chart-select">
                    <option>Last 30 Days</option>
                    <option>Last 7 Days</option>
                    <option>Semester</option>
                </select>
            </div>
            <div className="chart-container-medium">
                {isEmpty ? (
                    <div className="status-container" style={{ minHeight: '100%' }}>
                        <AlertCircle size={32} />
                        <p>No data available yet</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis
                                dataKey="t"
                                stroke="#9ca3af"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={15}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                stroke="#9ca3af"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                width={30}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
                            <Area
                                type="monotone"
                                dataKey={dataKey}
                                stroke={color}
                                strokeWidth={3}
                                fillOpacity={1}
                                fill={`url(#${fillId})`}
                                isAnimationActive={true}
                                animationDuration={1000}
                                activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export const GaugeCard = ({ title, score, label, color, icon: Icon }) => {
    return (
        <div className="analytics-card">
            <div className="kpi-header">
                <span className="kpi-title">{title}</span>
                {Icon && (
                    <div className="kpi-icon-wrapper" style={{ backgroundColor: `${color}15` }}>
                        <Icon size={18} color={color} strokeWidth={2.5} />
                    </div>
                )}
            </div>
            <div className="gauge-container">
                <div className="gauge-chart-wrapper" style={{ height: '140px', marginTop: '-10px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                            cx="50%"
                            cy="80%"
                            innerRadius="80%"
                            outerRadius="110%"
                            barSize={12}
                            data={[{ value: score, fill: color }]}
                            startAngle={180}
                            endAngle={0}
                        >
                            <RadialBar
                                background={{ fill: '#f1f5f9' }}
                                clockWise
                                dataKey="value"
                                cornerRadius={10}
                            />
                        </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="gauge-overlay" style={{ marginTop: '0' }}>
                        <span className="gauge-value" style={{ color: color, fontSize: '2rem' }}>{score}</span>
                        <span className="gauge-label" style={{
                            color: color,
                            fontSize: '0.7rem',
                            marginTop: '2px',
                            background: `${color}15`,
                            padding: '2px 8px'
                        }}>{label}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
