// ==========================================
// GRADEBOOK v2 — GradeAnalyticsPanel
// Charts: grade distribution + component avgs
// ==========================================
import { useMemo } from 'react';
import {
    BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Legend,
} from 'recharts';
import { calcGradeDistribution, calcComponentAverages } from '../utils/gradeCalculations';
import { GRADE_SCALE } from '../utils/constants';

const RADIAN = Math.PI / 180;
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, label }) {
    if (percent < 0.05) return null;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{label}</text>;
}

export default function GradeAnalyticsPanel({ enrollments, grades, criteria }) {
    const distribution = useMemo(
        () => calcGradeDistribution(enrollments, grades, criteria),
        [enrollments, grades, criteria]
    );
    const componentAvgs = useMemo(
        () => calcComponentAverages(enrollments, grades, criteria),
        [enrollments, grades, criteria]
    );

    const pieData = GRADE_SCALE
        .map(g => ({ name: g.label, value: distribution[g.label] || 0, color: g.color }))
        .filter(d => d.value > 0);

    const barData = componentAvgs.map(c => ({
        name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name,
        avg: parseFloat(c.average.toFixed(1)),
        max: c.max,
        pct: parseFloat(c.pct.toFixed(1)),
    }));

    return (
        <div className="gmv2-analytics-panel">
            <h3 className="gmv2-analytics-title">Analytics Overview</h3>

            <div className="gmv2-charts-row">
                {/* Grade Distribution Pie */}
                <div className="gmv2-chart-card">
                    <div className="gmv2-chart-label">Grade Distribution</div>
                    {pieData.length === 0 ? (
                        <div className="gmv2-chart-empty">No grade data yet</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    dataKey="value"
                                    labelLine={false}
                                    label={CustomLabel}
                                >
                                    {pieData.map(entry => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value, name) => [value + ' students', name]}
                                    contentStyle={{ fontSize: 12 }}
                                />
                                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Component Average Bar */}
                <div className="gmv2-chart-card">
                    <div className="gmv2-chart-label">Component Averages (% of max)</div>
                    {barData.length === 0 ? (
                        <div className="gmv2-chart-empty">No criteria defined</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={barData} margin={{ left: -10 }}>
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                                <Tooltip
                                    formatter={(value, name) => [`${value}%`, 'Class avg']}
                                    contentStyle={{ fontSize: 12 }}
                                />
                                <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                                    {barData.map((_, idx) => (
                                        <Cell key={idx} fill={GRADE_SCALE[idx % GRADE_SCALE.length].color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}
