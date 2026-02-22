import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, Minus, ChevronDown, ChevronUp, BookOpen, GraduationCap, AlertTriangle } from 'lucide-react';
import { degreeService } from '../../../services/degreeService';

const DegreeAudit = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedSems, setExpandedSems] = useState({});

    useEffect(() => {
        loadAudit();
    }, []);

    const loadAudit = async () => {
        setLoading(true);
        const { data: res, error: err } = await degreeService.fetchDegreeAudit();
        setLoading(false);
        if (err) setError(err);
        if (res) setData(res);
    };

    const toggleSem = (sem) => {
        setExpandedSems(prev => ({ ...prev, [sem]: !prev[sem] }));
    };

    if (loading) return <div className="p-6 text-slate-400 animate-pulse">Loading Degree Audit...</div>;
    if (error) return <div className="p-6 text-red-400">Error: {error}</div>;
    if (!data) return null;

    const { program, summary, semesters } = data;
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - ((summary.graduation_progress_percentage || 0) / 100) * circumference;

    return (
        <div className="p-4 md:p-6 space-y-6 animate-fade-in text-slate-200">

            {/* Progress Hero Section */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center gap-8 z-10 relative">

                    {/* Circular Progress Ring */}
                    <div className="relative flex shrink-0 items-center justify-center">
                        <svg className="transform -rotate-90 w-40 h-40">
                            <circle
                                cx="80" cy="80" r={radius}
                                className="stroke-slate-700 fill-none"
                                strokeWidth="12"
                            />
                            <circle
                                cx="80" cy="80" r={radius}
                                className="stroke-indigo-500 fill-none transition-all duration-1000 ease-in-out"
                                strokeWidth="12"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                            <span className="text-3xl font-bold text-white">{summary.graduation_progress_percentage}%</span>
                            <span className="text-xs text-slate-400">Complete</span>
                        </div>
                    </div>

                    <div className="flex-1 w-full text-center md:text-left">
                        <h2 className="text-2xl font-bold text-white mb-2">{program.name}</h2>
                        <p className="text-indigo-400 font-medium mb-6 text-lg">{summary.credits_earned} / {program.total_credits_required} Credits</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 flex flex-col items-center md:items-start text-xs">
                                <span className="flex items-center gap-1.5 text-emerald-400 font-medium mb-1"><CheckCircle className="h-4 w-4" /> Earned</span>
                                <span className="text-xl font-bold text-white">{summary.credits_earned} cr</span>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 flex flex-col items-center md:items-start text-xs">
                                <span className="flex items-center gap-1.5 text-blue-400 font-medium mb-1"><Clock className="h-4 w-4" /> In Progress</span>
                                <span className="text-xl font-bold text-white">{summary.credits_in_progress} cr</span>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 flex flex-col items-center md:items-start text-xs">
                                <span className="flex items-center gap-1.5 text-slate-400 font-medium mb-1"><BookOpen className="h-4 w-4" /> Remaining</span>
                                <span className="text-xl font-bold text-white">{summary.credits_remaining} cr</span>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 flex flex-col items-center md:items-start text-xs">
                                <span className="flex items-center gap-1.5 text-red-400 font-medium mb-1"><XCircle className="h-4 w-4" /> Failed</span>
                                <span className="text-xl font-bold text-white">{summary.credits_failed} cr</span>
                            </div>
                        </div>

                        {/* GPA Bar */}
                        <div className="mt-6 flex flex-col gap-2">
                            <div className="flex justify-between items-end text-sm">
                                <span className="font-medium text-slate-300">Cumulative GPA</span>
                                <span className={`font-bold ${summary.meets_gpa_requirement ? 'text-emerald-400' : 'text-red-400'}`}>{summary.cumulative_gpa.toFixed(2)}</span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden relative border border-slate-700">
                                <div
                                    className={`h-full ${summary.meets_gpa_requirement ? 'bg-emerald-500' : 'bg-red-500'}`}
                                    style={{ width: `${Math.min(100, (summary.cumulative_gpa / 4.0) * 100)}%` }}
                                />
                                <div
                                    className="absolute top-0 bottom-0 bg-white w-0.5 border-r border-slate-800 z-10"
                                    style={{ left: `${(program.min_gpa_required / 4.0) * 100}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500 text-right">Min requirement: {program.min_gpa_required.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                {summary.on_track ? (
                    <div className="mt-6 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center gap-2 rounded-lg font-medium">
                        <GraduationCap className="h-5 w-5" /> 🎓 On Track for Graduation
                    </div>
                ) : (
                    <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center gap-2 rounded-lg font-medium">
                        <AlertTriangle className="h-5 w-5" /> ⚠️ At Risk of Not Meeting Graduation Requirements
                    </div>
                )}
            </div>

            {/* Semester Accordion */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white px-1">Academic Terms</h3>

                {semesters.map(semData => {
                    const { semester, subjects } = semData;
                    const completedCount = subjects.filter(s => s.enrollment_status === 'completed').length;
                    const totalCredits = subjects.reduce((sum, s) => sum + s.credits, 0);
                    const isExpanded = expandedSems[semester] !== false;

                    return (
                        <div key={semester} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden transition-all">
                            <button
                                onClick={() => toggleSem(semester)}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
                            >
                                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-left">
                                    <span className="font-bold text-white text-base">Semester {semester}</span>
                                    <div className="text-sm text-slate-400 flex flex-wrap gap-x-3 items-center">
                                        <span>{completedCount}/{subjects.length} subjects complete</span>
                                        <span className="hidden md:inline">•</span>
                                        <span>{totalCredits} credits</span>
                                    </div>
                                </div>
                                <div className="text-slate-400">
                                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="border-t border-slate-700 bg-slate-800/50 p-4">
                                    <div className="flex flex-col gap-3">
                                        {subjects.map(s => {
                                            let rowStyle = "border-slate-700";
                                            let icon = null;
                                            let statusText = "";
                                            let statusColor = "";
                                            let actionContent = null;

                                            if (s.enrollment_status === 'completed') {
                                                rowStyle = "bg-emerald-500/5 border-emerald-500/20 border";
                                                icon = <CheckCircle className="h-5 w-5 text-emerald-400" />;
                                                statusText = "Completed";
                                                statusColor = "text-emerald-400";
                                                actionContent = <a href={`#grade-management?subject_id=${s.id}`} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">View Grades</a>;
                                            } else if (s.enrollment_status === 'active') {
                                                rowStyle = "bg-blue-500/5 border-blue-500/20 border";
                                                icon = <Clock className="h-5 w-5 text-blue-400" />;
                                                statusText = "In Progress";
                                                statusColor = "text-blue-400";
                                            } else if (s.enrollment_status === 'failed') {
                                                rowStyle = "bg-red-500/5 border-red-500/20 border";
                                                icon = <XCircle className="h-5 w-5 text-red-400" />;
                                                statusText = "Failed";
                                                statusColor = "text-red-400";
                                                actionContent = <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded">Retake Available</span>;
                                            } else if (s.enrollment_status === 'dropped') {
                                                rowStyle = "bg-slate-700/30 border-slate-600 border";
                                                icon = <Minus className="h-5 w-5 text-slate-500" />;
                                                statusText = "Dropped";
                                                statusColor = "text-slate-400";
                                            } else {
                                                // not_enrolled
                                                rowStyle = "border-slate-700 border border-dashed opacity-60";
                                                icon = <div className="h-5 w-5 rounded-full border border-slate-600 border-dashed" />;
                                                statusText = "Not Enrolled";
                                                statusColor = "text-slate-500";
                                            }

                                            let typeColor = "bg-slate-700 text-slate-300";
                                            if (s.subject_type === 'Core') typeColor = "bg-indigo-500/20 text-indigo-300";
                                            else if (s.subject_type === 'Elective') typeColor = "bg-purple-500/20 text-purple-300";
                                            else if (s.subject_type === 'Lab') typeColor = "bg-amber-500/20 text-amber-300";

                                            return (
                                                <div key={s.id} className={`rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-4 ${rowStyle}`}>

                                                    <div className="flex items-start md:items-center gap-3 w-full md:w-auto">
                                                        <div className="mt-0.5 md:mt-0 shrink-0">{icon}</div>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-white text-sm md:text-base">{s.name} <span className="text-slate-400 font-normal ml-1">({s.code})</span></span>
                                                            {/* Mobile ONLY status right below name */}
                                                            <span className={`text-xs mt-1 md:hidden ${statusColor}`}>{statusText}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pl-8 md:pl-0">
                                                        {/* Hide Type & Credits on mobile */}
                                                        <span className="hidden md:flex text-xs px-2 py-1 rounded font-medium shrink-0 items-center justify-center w-20 text-center uppercase tracking-wider bg-opacity-70 flex-col">
                                                            <span className={typeColor + " px-2 py-0.5 rounded w-full"}>{s.subject_type}</span>
                                                        </span>

                                                        <span className="hidden md:inline text-sm text-slate-400 whitespace-nowrap min-w-[60px]">{s.credits} cr</span>

                                                        <span className={`hidden md:inline text-sm font-medium whitespace-nowrap min-w-[90px] ${statusColor}`}>{statusText}</span>

                                                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                                                            <div className="w-12 text-center shrink-0 flex justify-center">
                                                                {s.final_grade && s.enrollment_status !== 'dropped' ? (
                                                                    <span className="inline-flex items-center justify-center h-7 w-7 rounded bg-slate-900 border border-slate-600 font-bold text-sm text-white">
                                                                        {s.final_grade}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-600">-</span>
                                                                )}
                                                            </div>
                                                            <div className="min-w-[100px] text-right">
                                                                {actionContent}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default DegreeAudit;
