// ==========================================
// GRADEBOOK v2 — StudentGradeTable
// Main scrollable grade roster table
// ==========================================
import { useMemo } from 'react';
import { ArrowUpDown, Clock } from 'lucide-react';
import GradeCell from './GradeCell';
import { calcWeightedTotal, getStudentStatus } from '../utils/gradeCalculations';
import { getGradeInfo, avatarColor, STUDENT_STATUSES } from '../utils/constants';

function toSentenceCase(str = '') {
    return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function StudentGradeTable({
    enrollments, criteria, grades, errors,
    searchQuery, updateGrade,
}) {
    const filtered = useMemo(() => {
        if (!searchQuery) return enrollments;
        const q = searchQuery.toLowerCase();
        return enrollments.filter(e =>
            e.student_name.toLowerCase().includes(q) ||
            String(e.student_id).includes(q)
        );
    }, [enrollments, searchQuery]);

    return (
        <div className="gmv2-table-card">
            {/* Table header bar */}
            <div className="gmv2-table-topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="gmv2-table-title">Student Roster</span>
                    <span className="gmv2-roster-badge">{filtered.length} students</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#94a3b8' }}>
                    <Clock size={13} /> Updated just now
                </div>
            </div>

            {/* Scrollable table */}
            <div className="gmv2-scroll">
                <table className="gmv2-table">
                    <thead>
                        <tr>
                            <th className="gmv2-th gmv2-sticky-col">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    Student Identity <ArrowUpDown size={12} style={{ opacity: 0.5 }} />
                                </div>
                            </th>
                            {criteria.map(c => (
                                <th key={c.id} className="gmv2-th">
                                    <div className="gmv2-th-inner">
                                        <span>{c.component_name}</span>
                                        <div className="gmv2-th-meta">
                                            <span>Max {c.max_marks}</span>
                                            <span>·</span>
                                            <span>Weight {parseFloat(c.weight_percentage)}%</span>
                                        </div>
                                    </div>
                                </th>
                            ))}
                            <th className="gmv2-th gmv2-th-right">Performance Index</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={criteria.length + 2} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                                    No students match your search.
                                </td>
                            </tr>
                        )}
                        {filtered.map(enrollment => {
                            const eGrades = grades[enrollment.id] ?? {};
                            const total = calcWeightedTotal(eGrades, criteria);
                            const gradeInfo = getGradeInfo(total);
                            const status = getStudentStatus(eGrades);
                            const statusInfo = STUDENT_STATUSES[status];
                            const initials = enrollment.student_name.charAt(0).toUpperCase();
                            const color = avatarColor(enrollment.student_name);

                            return (
                                <tr key={enrollment.id} className="gmv2-tr">
                                    {/* Student identity */}
                                    <td className="gmv2-td gmv2-sticky-col">
                                        <div className="gmv2-student-cell">
                                            <div
                                                className="gmv2-avatar"
                                                style={{ background: color }}
                                            >
                                                {initials}
                                            </div>
                                            <div className="gmv2-student-info">
                                                <span className="gmv2-student-name">
                                                    {toSentenceCase(enrollment.student_name)}
                                                </span>
                                                <span className="gmv2-student-id">ID: #{enrollment.student_id}</span>
                                                <span
                                                    className="gmv2-status-chip"
                                                    style={{ color: statusInfo.color, background: statusInfo.bg }}
                                                >
                                                    {statusInfo.label}
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Grade cells */}
                                    {criteria.map(c => (
                                        <td key={c.id} className="gmv2-td">
                                            <GradeCell
                                                value={eGrades[c.id] ?? ''}
                                                maxMarks={c.max_marks}
                                                weight={c.weight_percentage}
                                                error={errors[enrollment.id]?.[c.id]}
                                                onChange={val => updateGrade(enrollment.id, c.id, val)}
                                            />
                                        </td>
                                    ))}

                                    {/* Performance index */}
                                    <td className="gmv2-td gmv2-td-right">
                                        <div className="gmv2-perf-wrap">
                                            <span
                                                className="gmv2-perf-pct"
                                                style={{ color: gradeInfo.color }}
                                            >
                                                {total.toFixed(1)}%
                                            </span>
                                            <span
                                                className="gmv2-grade-badge"
                                                style={{ color: gradeInfo.color, background: gradeInfo.bg, borderColor: gradeInfo.color + '55' }}
                                            >
                                                {gradeInfo.label}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
