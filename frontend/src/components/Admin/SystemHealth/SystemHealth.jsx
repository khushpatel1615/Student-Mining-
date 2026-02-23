import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Activity, Server, Database, Save, FileText, AlertTriangle,
    CheckCircle, RefreshCw, Mail, ShieldAlert,
    Clock, Cpu, Zap, Archive, Trash2, Copy, Info, Check, AlertCircle, X, Users
} from 'lucide-react';
import * as healthService from '../../../services/healthService';

// Tooltip Component
const Tooltip = ({ text, children }) => (
    <div className="group relative flex items-center justify-center">
        {children}
        <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10 text-center">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>
    </div>
);

const SystemHealth = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [healthData, setHealthData] = useState(null);
    const [error, setError] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [countdown, setCountdown] = useState(30);
    const [bannerDismissed, setBannerDismissed] = useState(false);
    const [copiedText, setCopiedText] = useState(null);
    const [showCacheModal, setShowCacheModal] = useState(false);

    // Track previous status to un-dismiss banner if status changes to critical again
    const prevStatusRef = useRef(null);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const { data, error: fetchError } = await healthService.fetchHealthDetailed();

        if (fetchError) {
            setError(fetchError);
        } else if (data) {
            setHealthData(data);
            setError(null);

            // Re-show banner if status degraded/critical and it was previously ok
            if (data.status !== 'ok' && prevStatusRef.current === 'ok') {
                setBannerDismissed(false);
            }
            prevStatusRef.current = data.status;
        }

        setLastRefresh(new Date().toLocaleTimeString());
        setCountdown(30);

        if (isRefresh) setRefreshing(false);
        else setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Countdown and Auto-Refresh timer
    useEffect(() => {
        let timer;
        if (autoRefresh) {
            timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        fetchData(true);
                        return 30; // reset
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [autoRefresh, fetchData]);

    const handleClearCache = async () => {
        setShowCacheModal(false);
        const { data, error: fetchError } = await healthService.clearCache();
        if (data && data.success) {
            fetchData(true);
        } else {
            window.alert("Failed to clear cache: " + fetchError);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);
        setTimeout(() => setCopiedText(null), 2000);
    };

    if (loading && !healthData) {
        return (
            <div className="p-8 space-y-6 bg-[#F8F9FA] min-h-screen">
                <div className="animate-pulse flex flex-col gap-6">
                    <div className="h-10 bg-gray-200 rounded w-64"></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white rounded-xl shadow-sm"></div>)}
                    </div>
                </div>
            </div>
        );
    }

    if (error && !healthData) {
        return (
            <div className="p-8 bg-[#F8F9FA] min-h-screen">
                <div className="bg-red-50 text-red-700 p-6 rounded-xl shadow-sm border border-red-200">
                    <div className="flex items-center gap-3 text-xl font-bold mb-2">
                        <AlertTriangle size={24} />
                        API Unreachable
                    </div>
                    <p>Cannot connect to the health endpoint. Verify server is running.</p>
                </div>
            </div>
        );
    }

    const st = healthData?.status || 'unknown';
    const isCritical = st !== 'ok';
    const showBanner = isCritical && !bannerDismissed;

    // Derived values
    const errorsToday = healthData?.errors?.errors_today || 0;
    const slowRequestsCnt = healthData?.performance?.slow_requests_today?.length || 0;
    const memUsage = healthData?.performance?.api_script_memory_mb || 0;

    // Finalized Progress
    const finalized = healthData?.database_stats?.finalized_subjects || 0;
    const ready = healthData?.database_stats?.ready_to_finalize || 0;
    const totalFinalizedReady = finalized + ready;
    const finalizedPct = totalFinalizedReady > 0 ? (finalized / totalFinalizedReady) * 100 : 0;

    // Cron time checking
    const cronLastRunStr = healthData?.email_queue?.cron_last_run;
    const cronLastRunDate = cronLastRunStr && cronLastRunStr !== 'Never run' ? new Date(cronLastRunStr) : null;
    let cronStatusOk = false;
    if (cronLastRunDate) {
        const diffMins = (new Date() - cronLastRunDate) / 1000 / 60;
        cronStatusOk = diffMins < 5;
    }

    const combinedErrors = [
        ...(healthData?.errors?.system_errors || []).map(msg => ({ type: 'SYSTEM DIAGNOSTICS (CRITICAL)', msg })),
        ...(healthData?.errors?.recent_errors || []).map(e => ({ type: e.level, msg: e.message }))
    ];

    return (
        <div className="min-h-screen bg-[#F8F9FA] selection:bg-indigo-100 selection:text-indigo-900 pb-12">
            {/* Top Navigation / Breadcrumb */}
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30">
                <div className="max-w-[1600px] mx-auto px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Activity size={22} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Admin Panel</p>
                            <h1 className="text-lg font-black text-gray-900 leading-none">System Health</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100 shadow-inner">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${refreshing ? 'bg-indigo-500 animate-ping' : 'bg-green-500'}`}></div>
                                <span className="text-xs font-bold text-gray-500 tabular-nums">Refreshed: {lastRefresh}</span>
                            </div>
                            <div className="h-4 w-px bg-gray-200"></div>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={autoRefresh}
                                    onChange={(e) => setAutoRefresh(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-gray-600 group-hover:text-indigo-600 transition-colors">Auto-Refresh</span>
                                {autoRefresh && <span className="text-indigo-600 font-extrabold text-[10px] bg-indigo-50 px-1.5 py-0.5 rounded-md min-w-[24px] text-center">{countdown}s</span>}
                            </label>
                        </div>
                        <button
                            onClick={() => fetchData(true)}
                            className="p-2.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-xl shadow-sm hover:shadow transition-all active:scale-95"
                        >
                            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-8 pt-8 space-y-8">
                {/* Status Banner */}
                {showBanner ? (
                    <div className="bg-red-600 text-white p-5 rounded-3xl shadow-2xl shadow-red-200 flex items-center justify-between border border-red-500 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                <AlertTriangle size={28} className="animate-bounce" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Critical Infrastructure Alert</h3>
                                <p className="text-red-100 text-sm font-medium">Underlying system errors detected. Database or Storage systems may be degraded.</p>
                            </div>
                        </div>
                        <button onClick={() => setBannerDismissed(true)} className="p-2 hover:bg-white/20 rounded-full transition-colors relative z-10">
                            <X size={24} />
                        </button>
                    </div>
                ) : (!isCritical && !bannerDismissed) ? (
                    <div className="bg-emerald-500 text-white p-5 rounded-3xl shadow-xl shadow-emerald-100 flex items-center gap-4 border border-emerald-400">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner">
                            <CheckCircle size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">System Operational</h3>
                            <p className="text-emerald-50 text-sm font-medium">All core services are responding within normal parameters.</p>
                        </div>
                    </div>
                ) : null}

                {/* Grid 1: Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatusCard
                        title="Core Database"
                        icon={Database}
                        ok={healthData?.uptime_check?.database?.status === 'ok'}
                        badge={healthData?.uptime_check?.database?.response_ms ? `${healthData.uptime_check.database.response_ms}ms` : null}
                    />
                    <StatusCard
                        title="Storage Access"
                        icon={FileText}
                        ok={healthData?.uptime_check?.log_dir_writable}
                    />
                    <StatusCard
                        title="Cache Cluster"
                        icon={Save}
                        ok={healthData?.uptime_check?.cache_dir_writable}
                    />
                    <StatusCard
                        title="Environment"
                        icon={Server}
                        ok={healthData?.uptime_check?.env_loaded}
                    />
                </div>

                {/* Grid 2: Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricBox
                        icon={ShieldAlert}
                        label="Critical Errors Today"
                        value={errorsToday}
                        color={errorsToday > 0 ? 'red' : 'green'}
                        tooltip="Recent exceptions and fatal errors logged by the PHP/MySQL backend."
                    />
                    <MetricBox
                        icon={Clock}
                        label="Slow Request Volume"
                        value={slowRequestsCnt}
                        color={slowRequestsCnt > 0 ? 'amber' : 'green'}
                        tooltip="Requests exceeding 1000ms response time in the current session."
                    />
                    <MetricBox
                        icon={Cpu}
                        label="Compute Memory Usage"
                        value={`${memUsage}MB`}
                        color="purple"
                        tooltip="Peak memory allocation consumed by the Health API script during telemetry."
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                    <div className="xl:col-span-2 space-y-8">
                        {/* Email Queue */}
                        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                    <Mail size={24} />
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Email Queue</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <SmallStat label="Pending" value={healthData?.email_queue?.pending || 0} />
                                <SmallStat label="Sent Today" value={healthData?.email_queue?.sent_today || 0} valueColor="text-emerald-500" />
                                <SmallStat label="Fatal Failures" value={healthData?.email_queue?.failed || 0} valueColor="text-red-500" />
                                <SmallStat label="Latency" value={`${healthData?.email_queue?.oldest_pending_minutes || 0}m`} />
                            </div>
                            <div className={`p-5 rounded-2xl flex items-center justify-between font-bold border transition-all duration-500 ${cronStatusOk ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-inner' : 'bg-red-50 text-red-700 border-red-100 animate-pulse'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className={`w-3 h-3 rounded-full ${cronStatusOk ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                        <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${cronStatusOk ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                    </div>
                                    <span className="text-sm">Cron Processor Status</span>
                                </div>
                                <span className="text-[10px] opacity-70 tracking-widest uppercase">Last: {cronLastRunDate ? cronLastRunDate.toLocaleTimeString() : 'offline'}</span>
                            </div>
                        </div>

                        {/* Cache Management */}
                        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-gray-50 text-gray-600 rounded-2xl">
                                        <Archive size={24} />
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Optimization</h2>
                                </div>
                                <button
                                    onClick={() => setShowCacheModal(true)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                    title="Purge Object Cache"
                                >
                                    <Trash2 size={24} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-gray-400 uppercase tracking-widest text-[10px]">Registry Items</span>
                                    <span className="text-gray-900">{healthData?.cache?.total_items || 0} Objects</span>
                                </div>
                                <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden flex">
                                    <div className="bg-indigo-500 h-full" style={{ width: '60%' }}></div>
                                    <div className="bg-emerald-400 h-full" style={{ width: '15%' }}></div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Active: {healthData?.cache?.total_items - healthData?.cache?.expired_items}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Expired: {healthData?.cache?.expired_items || 0}</span>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-gray-50">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Disk Allocation</p>
                                    <p className="text-lg font-black text-gray-900">{healthData?.cache?.size_kb || 0} <span className="text-gray-300">KB</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="xl:col-span-3 space-y-8">
                        {/* Database In-Depth */}
                        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
                            <div className="flex justify-between items-center mb-10">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                                        <Database size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Database Clusters</h2>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Relational Integrity Metrics</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${healthData?.database_stats?.at_risk_students > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        Risk Level: {healthData?.database_stats?.at_risk_students > 0 ? 'High' : 'Optimal'}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                                <DbStat label="Student Registry" value={healthData?.database_stats?.total_students?.toLocaleString() || 0} icon={Users} />
                                <DbStat label="Active Enrollments" value={healthData?.database_stats?.total_enrollments?.toLocaleString() || 0} icon={CheckCircle} />
                                <DbStat label="Total Grade Components" value={healthData?.database_stats?.total_grades_entered?.toLocaleString() || 0} icon={Zap} />
                            </div>

                            <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col md:flex-row items-center gap-8 shadow-inner">
                                <div className="relative w-32 h-32 flex-shrink-0">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-200" />
                                        <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={364} strokeDashoffset={364 - (364 * finalizedPct / 100)} className="text-indigo-600" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-black text-gray-900 leading-none">{Math.round(finalizedPct)}%</span>
                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Finalized</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-end mb-4">
                                        <div>
                                            <h3 className="text-xl font-black text-gray-900 leading-none mb-1">Grading Integrity</h3>
                                            <p className="text-sm font-medium text-gray-500">Ratio of finalized transcripts to pending submissions.</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-black text-indigo-600 leading-none">{finalized.toLocaleString()}</span>
                                            <span className="text-gray-300 px-1 font-bold">/</span>
                                            <span className="text-lg font-black text-gray-400 leading-none">{totalFinalizedReady.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-600"></div> Finalized</div>
                                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#fbd38d]"></div> Pending Ready</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Performance Logs */}
                        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                            <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                    <ShieldAlert size={28} className="text-red-500" />
                                    System Anomalies
                                </h2>
                                <button className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline">Flush Logs</button>
                            </div>
                            <div className="p-8 space-y-4 max-h-[500px] overflow-y-auto bg-gray-50/30">
                                {combinedErrors.length === 0 ? (
                                    <div className="py-20 flex flex-col items-center justify-center text-emerald-500">
                                        <Zap size={64} className="mb-4 animate-pulse opacity-50" />
                                        <h3 className="text-xl font-black uppercase tracking-wider">Infrastructure Optimal</h3>
                                        <p className="text-emerald-600/60 font-medium">No fatal exceptions recorded in the telemetry buffer.</p>
                                    </div>
                                ) : (
                                    combinedErrors.slice(0, 15).map((err, i) => {
                                        const isCrit = err.type.includes('CRITICAL') || err.type === 'FATAL';
                                        return (
                                            <div key={i} className="group bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                                                <div className={`absolute top-0 left-0 w-1.5 h-full ${isCrit ? 'bg-red-500' : 'bg-amber-400'}`}></div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isCrit ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                                        {err.type}
                                                    </span>
                                                    <button onClick={() => copyToClipboard(err.msg)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 transition-all">
                                                        {copiedText === err.msg ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                    </button>
                                                </div>
                                                <p className="font-mono text-xs text-gray-700 break-all leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all duration-300">{err.msg}</p>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal remains same logic, just styling overhaul */}
            {showCacheModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden p-8 border border-white/20 scale-100 animate-in zoom-in-95 duration-200">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-100">
                                <AlertCircle size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">System Flush</h3>
                            <p className="text-gray-500 text-sm font-medium leading-relaxed">You are about to purge all application telemetry and result caches. This may cause a temporary latency spike during index rebuild.</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleClearCache} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-lg shadow-red-200 transition-all active:scale-[0.98]">Confirm Purge</button>
                            <button onClick={() => setShowCacheModal(false)} className="w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-2xl transition-all">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==========================================
// SUBCOMPONENTS - Polished & Modernized
// ==========================================

const StatusCard = ({ title, icon: Icon, ok, badge }) => (
    <div className="group bg-white p-6 rounded-[2rem] shadow-xl shadow-gray-200/40 border border-gray-100 flex items-center gap-5 hover:shadow-2xl hover:shadow-indigo-100 hover:border-indigo-100 transition-all duration-500 hover:-translate-y-1">
        <div className={`p-4 rounded-2xl flex items-center justify-center transition-colors duration-500 ${ok ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-red-50 text-red-600 group-hover:bg-red-500 group-hover:text-white'}`}>
            <Icon size={28} />
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 truncate">{title}</h3>
            <div className="flex items-center gap-2">
                <div className="relative">
                    <div className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    {ok && <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75"></div>}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-tighter ${ok ? 'text-emerald-600' : 'text-red-600'}`}>
                    {ok ? 'Active' : 'Offline'}
                </span>
                {badge && (
                    <span className="ml-auto bg-gray-50 text-gray-500 text-[9px] font-black px-2 py-0.5 rounded-lg border border-gray-100">{badge}</span>
                )}
            </div>
        </div>
    </div>
);

const MetricBox = ({ icon: Icon, label, value, color, tooltip }) => {
    const colorMap = {
        red: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500', glow: 'shadow-red-100' },
        green: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', glow: 'shadow-emerald-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500', glow: 'shadow-amber-100' },
        purple: { bg: 'bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-500', glow: 'shadow-indigo-100' }
    };
    const c = colorMap[color] || colorMap.purple;

    return (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 hover:shadow-2xl transition-all duration-300 group">
            <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-[1.5rem] shadow-lg ${c.glow} ${c.bg} ${c.text} group-hover:scale-110 transition-transform duration-500`}>
                    <Icon size={32} />
                </div>
                <Tooltip text={tooltip}>
                    <div className="p-2 cursor-help text-gray-300 hover:text-gray-500 transition-colors">
                        <Info size={16} />
                    </div>
                </Tooltip>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{label}</p>
            <div className="flex items-baseline gap-2">
                <h4 className="text-4xl font-black text-gray-900 tracking-tight">{value}</h4>
                <div className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse`}></div>
            </div>
        </div>
    );
};

const SmallStat = ({ label, value, valueColor = "text-gray-900" }) => (
    <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-50 group hover:border-indigo-100 hover:bg-white hover:shadow-lg hover:shadow-indigo-50 transition-all duration-300">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{label}</p>
        <p className={`text-xl font-black ${valueColor} truncate`}>{value}</p>
    </div>
);

const DbStat = ({ label, value, icon: Icon }) => (
    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-50 text-gray-400 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                {Icon && <Icon size={14} />}
            </div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        </div>
        <p className="text-2xl font-black text-gray-900 tabular-nums">{value}</p>
    </div>
);

export default SystemHealth;
