import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, LayoutGrid } from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import { finalizeService } from '../../services/finalizeService';

const GradeIntegrityReport = () => {
    const [data, setData] = useState([]);
    const [stats, setStats] = useState({ total: 0, weightErrors: 0, noCriteria: 0, finalized: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');

    useEffect(() => {
        loadReport();
    }, []);

    const loadReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await analyticsService.fetchGradeIntegrity();
            console.log('Grade Integrity Response:', response);

            if (response.error) {
                throw new Error(response.error);
            }

            // Match the structure suggested in Problem 2 - Step 3 & 4
            const subjects = response.data?.subjects ?? response.subjects ?? (Array.isArray(response.data) ? response.data : []);
            const summary = response.data?.summary ?? response.summary;

            setData(Array.isArray(subjects) ? subjects : []);

            if (summary) {
                setStats({
                    total: summary.total || 0,
                    weightErrors: summary.weight_errors || 0,
                    noCriteria: summary.no_criteria || 0,
                    finalized: summary.finalized || 0
                });
            } else if (Array.isArray(subjects)) {
                // Fallback computation
                setStats({
                    total: subjects.length,
                    weightErrors: subjects.filter(s => s.status === 'weight_error').length,
                    noCriteria: subjects.filter(s => s.status === 'no_criteria').length,
                    finalized: subjects.filter(s => s.enrolled_students > 0 && s.finalized_count === s.enrolled_students).length,
                });
            }
        } catch (err) {
            console.error('Grade Integrity fetch failed:', err);
            setError(err.message || 'Failed to fetch report');
            setData([]); // Ensure data is an array even on error
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async (subjectId) => {
        const confirmFinalize = window.confirm("Are you sure you want to finalize grades for this subject?");
        if (!confirmFinalize) return;

        const { error: err } = await finalizeService.finalizeSubject(subjectId);
        if (err) {
            alert("Failed to finalize: " + err);
        } else {
            alert("Grades finalized successfully.");
            loadReport();
        }
    };

    const handleUnfinalize = async (subjectId) => {
        const confirmUnfinalize = window.confirm("Are you sure you want to REOPEN grades for this subject?");
        if (!confirmUnfinalize) return;

        const { error: err } = await finalizeService.unfinalizeSubject(subjectId);
        if (err) {
            alert("Failed to unfinalize: " + err);
        } else {
            alert("Grades reopened successfully.");
            loadReport();
        }
    };

    const filteredData = data.filter(d => activeFilter === 'all' || d.status === activeFilter);

    return (
        <div className="p-6">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Grade Integrity Report</h2>
                <p className="text-slate-500">Monitor and resolve grading configuration issues across all programs.</p>
            </div>

            {/* PROBLEM 1 - SUMMARY CARDS (Exact Grid Structure) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Card 1 - Total Subjects */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <LayoutGrid className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Total Subjects</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                    </div>
                </div>

                {/* Card 2 - Weight Errors */}
                <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Weight Errors</p>
                        <p className="text-2xl font-bold text-amber-600">{stats.weightErrors}</p>
                    </div>
                </div>

                {/* Card 3 - No Criteria */}
                <div className="bg-white rounded-xl border border-red-200 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                        <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">No Criteria</p>
                        <p className="text-2xl font-bold text-red-600">{stats.noCriteria}</p>
                    </div>
                </div>

                {/* Card 4 - Fully Finalized */}
                <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Fully Finalized</p>
                        <p className="text-2xl font-bold text-emerald-600">{stats.finalized}</p>
                    </div>
                </div>
            </div>

            {/* PROBLEM 1 - FILTER TABS (Exact Markup) */}
            <div className="flex gap-2 mb-4 flex-wrap">
                {[
                    { key: 'all', label: 'All Subjects', icon: null },
                    { key: 'weight_error', label: 'Weight Errors', icon: '⚠️' },
                    { key: 'no_criteria', label: 'No Criteria', icon: '❌' },
                    { key: 'healthy', label: 'Healthy', icon: '✅' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveFilter(tab.key)}
                        className={activeFilter === tab.key
                            ? "px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white"
                            : "px-4 py-2 rounded-lg text-sm font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }
                    >
                        {tab.icon && <span className="mr-1">{tab.icon}</span>}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* PROBLEM 1 - TABLE (White Card Wrap + Light Styling) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            {['Program', 'Subject', 'Code/Sem', 'Criteria', 'Weight Sum', 'Status', 'Enrolled', 'Finalized', 'Actions']
                                .map(col => (
                                    <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-400">
                                        {col}
                                    </th>
                                ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {/* LOADING STATE */}
                        {loading && Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} className="animate-pulse">
                                {Array.from({ length: 9 }).map((_, j) => (
                                    <td key={j} className="px-4 py-3">
                                        <div className="h-4 bg-slate-100 rounded w-full" />
                                    </td>
                                ))}
                            </tr>
                        ))}

                        {/* DATA ROWS */}
                        {!loading && filteredData.map(row => (
                            <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-slate-500">{row.program_name}</td>
                                <td className="px-4 py-3 font-medium text-slate-800">{row.subject_name}</td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="text-slate-700 font-semibold">{row.code}</span>
                                        <span className="text-xs text-slate-400">Sem {row.semester}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">{row.criteria_count}</td>
                                <td className="px-4 py-3 font-semibold">{row.total_weight}%</td>
                                <td className="px-4 py-3">
                                    {row.status === 'healthy' && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Healthy</span>
                                    )}
                                    {row.status === 'weight_error' && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Weight Error</span>
                                    )}
                                    {row.status === 'no_criteria' && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">No Criteria</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">{row.enrolled_students}</td>
                                <td className="px-4 py-3">
                                    <span className={row.enrolled_students > 0 && row.finalized_count === row.enrolled_students ? "text-emerald-600 font-bold" : "text-slate-500"}>
                                        {row.finalized_count}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => window.location.hash = `#grade-management?subject_id=${row.id}`}
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                                        >
                                            Fix Criteria
                                        </button>
                                        {row.status === 'healthy' && row.enrolled_students > 0 && (
                                            row.finalized_count < row.enrolled_students ? (
                                                <button
                                                    onClick={() => handleFinalize(row.id)}
                                                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                                                >
                                                    Finalize
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleUnfinalize(row.id)}
                                                    className="text-xs font-semibold text-red-600 hover:text-red-800"
                                                >
                                                    Unfinalize
                                                </button>
                                            )
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {/* PROBLEM 1 - EMPTY STATE */}
                        {!loading && !error && filteredData.length === 0 && (
                            <tr>
                                <td colSpan={9} className="py-16 text-center">
                                    <div className="flex flex-col items-center gap-3 text-slate-400">
                                        <LayoutGrid className="w-10 h-10 opacity-30" />
                                        <p className="font-medium text-slate-500">No subjects found</p>
                                        <p className="text-sm">
                                            {activeFilter === 'all'
                                                ? 'No subjects exist yet. Add subjects in the Programs section.'
                                                : 'No subjects match this filter. Try "All Subjects".'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {/* ERROR STATE */}
                        {!loading && error && (
                            <tr>
                                <td colSpan={9} className="py-12 text-center text-red-500">
                                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="font-semibold">Failed to load data</p>
                                    <p className="text-xs">{error}</p>
                                    <button onClick={loadReport} className="mt-4 text-xs bg-red-100 px-3 py-1 rounded text-red-700 hover:bg-red-200">Try Again</button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GradeIntegrityReport;
