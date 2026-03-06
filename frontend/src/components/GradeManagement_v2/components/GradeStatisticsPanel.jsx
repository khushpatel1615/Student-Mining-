// ==========================================
// GRADEBOOK v2 — GradeStatisticsPanel
// Stats cards + completion + grading scale key
// ==========================================
import { TrendingUp, Users, Target, CheckCircle2, AlertCircle, BarChart2 } from 'lucide-react';
import { GRADE_SCALE } from '../utils/constants';

function StatCard({ icon: Icon, label, value, sub, accent = '#6366f1' }) {
    return (
        <div className="gmv2-stat-card">
            <div className="gmv2-stat-icon" style={{ background: accent + '18', color: accent }}>
                <Icon size={18} />
            </div>
            <div className="gmv2-stat-body">
                <span className="gmv2-stat-label">{label}</span>
                <span className="gmv2-stat-value">{value}</span>
                {sub && <span className="gmv2-stat-sub">{sub}</span>}
            </div>
        </div>
    );
}

export default function GradeStatisticsPanel({ stats, dataQuality, totalWeight, dataCompletion }) {
    const weightOk = Math.abs(totalWeight - 100) < 0.5;
    const validCount = dataQuality?.summary?.valid_count ?? 0;
    const incompleteCount = dataQuality?.summary?.incomplete_count ?? 0;

    return (
        <div className="gmv2-stats-section">
            {/* Stat cards */}
            <div className="gmv2-stats-row">
                <StatCard
                    icon={TrendingUp}
                    label="Class Average"
                    value={`${stats.average.toFixed(1)}%`}
                    accent="#6366f1"
                />
                <StatCard
                    icon={Target}
                    label="Highest Performance"
                    value={`${stats.highest.toFixed(1)}%`}
                    accent="#10b981"
                />
                <StatCard
                    icon={BarChart2}
                    label="Weight Calibration"
                    value={`${totalWeight.toFixed(0)}%`}
                    sub={weightOk ? '✓ Balanced' : '⚠ Check weights'}
                    accent={weightOk ? '#10b981' : '#f59e0b'}
                />
                <StatCard
                    icon={Users}
                    label="Data Completion"
                    value={`${dataCompletion.toFixed(0)}%`}
                    sub={`${validCount} valid · ${incompleteCount} incomplete`}
                    accent="#8b5cf6"
                />
            </div>

            {/* Grade scale key */}
            <div className="gmv2-scale-row">
                {GRADE_SCALE.map(g => (
                    <span
                        key={g.label}
                        className="gmv2-scale-chip"
                        style={{ color: g.color, background: g.bg, borderColor: g.color + '44' }}
                    >
                        {g.label}
                        <span className="gmv2-scale-range">≥{g.min}%</span>
                    </span>
                ))}
            </div>
        </div>
    );
}
