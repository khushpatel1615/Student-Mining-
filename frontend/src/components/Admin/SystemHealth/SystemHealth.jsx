import React, { useState, useEffect, useCallback } from 'react';
import {
    Activity, Server, Database, Save, FileText, AlertTriangle,
    XCircle, CheckCircle, RefreshCw, Mail, Box, ShieldAlert,
    Clock, Cpu, Zap, FileQuestion, Archive, Trash2
} from 'lucide-react';
import * as healthService from '../../../services/healthService';

const SystemHealth = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [healthData, setHealthData] = useState(null);
    const [error, setError] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(null);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const { data, error: fetchError } = await healthService.fetchHealthDetailed();

        if (fetchError) {
            setError(fetchError);
        } else if (data) {
            setHealthData(data);
            setError(null);
        }

        setLastRefresh(new Date().toLocaleTimeString());

        if (isRefresh) setRefreshing(false);
        else setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            fetchData(true);
        }, 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleClearCache = async () => {
        if (!window.confirm("Are you sure you want to clear all cache?")) return;
        const { data, error } = await healthService.clearCache();
        if (data && data.success) {
            alert("Cache cleared successfully!");
            fetchData(true);
        } else {
            alert("Failed to clear cache: " + error);
        }
    };

    if (loading && !healthData) {
        return (
            <div className="p-6 space-y-6">
                <div className="animate-pulse flex justify-between">
                    <div className="h-8 bg-gray-200 rounded w-48"></div>
                    <div className="h-8 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="grid grid-cols-4 gap-4 animate-pulse">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 rounded"></div>)}
                </div>
                <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
        );
    }

    if (error && !healthData) {
        return (
            <div className="p-6">
                <div className="bg-red-50 text-red-700 p-6 rounded-lg shadow-sm border border-red-200">
                    <div className="flex items-center gap-3 text-xl font-bold mb-2">
                        <AlertTriangle size={24} />
                        ⚠️ Health API Unreachable
                    </div>
                    <p>Cannot connect to backend/api/health.php. Verify your server is running.</p>
                    <p className="mt-2 text-sm text-red-600">Error details: {error}</p>
                    <button onClick={() => fetchData(true)} className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded text-red-800 font-medium">Try Again</button>
                </div>
            </div>
        );
    }

    const st = healthData.status || 'unknown';
    const statusColor = st === 'ok' ? 'bg-emerald-500' : (st === 'degraded' ? 'bg-amber-500' : 'bg-red-500');
    const statusText = st === 'ok' ? 'All Systems Operational' : (st === 'degraded' ? 'Performance Degraded' : 'Critical Issues Detected');

    const dbMs = healthData.uptime_check?.database?.response_ms || 0;
    const dbColor = dbMs < 100 ? 'text-emerald-600' : (dbMs < 500 ? 'text-amber-600' : 'text-red-600');

    const errCnt = healthData.errors?.errors_today || 0;
    const slowCnt = healthData.performance?.slow_requests_today?.length || 0;

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Activity className="text-blue-600" />
                        System Health
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Last refreshed: {lastRefresh}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-gray-200 bg-gray-50">
                        <div className={`w-3 h-3 rounded-full ${statusColor} animate-pulse`}></div>
                        <span className="font-semibold text-gray-700">{statusText}</span>
                    </div>
                    <button
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={refreshing ? "animate-spin" : ""} size={20} />
                    </button>
                </div>
            </div>

            {/* Row 1: Uptime Check Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatusCard
                    title="Database"
                    icon={Database}
                    ok={healthData.uptime_check?.database?.status === 'ok'}
                    subtext={`${dbMs}ms`}
                    subtextColor={dbColor}
                />
                <StatusCard
                    title="Log System"
                    icon={FileText}
                    ok={healthData.uptime_check?.log_dir_writable}
                />
                <StatusCard
                    title="Cache"
                    icon={Save}
                    ok={healthData.uptime_check?.cache_dir_writable}
                />
                <StatusCard
                    title="Environment"
                    icon={Server}
                    ok={healthData.uptime_check?.env_loaded}
                />
            </div>

            {/* Row 2: Performance Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border-l-4 border-red-500 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Errors Today</p>
                        <p className="text-3xl font-black text-red-600">{errCnt}</p>
                    </div>
                    <ShieldAlert size={36} className="text-red-100" />
                </div>
                <div className="bg-white p-5 rounded-xl border-l-4 border-amber-500 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Slow Requests</p>
                        <p className="text-3xl font-black text-amber-600">{slowCnt}</p>
                    </div>
                    <Clock size={36} className="text-amber-100" />
                </div>
                <div className="bg-white p-5 rounded-xl border-l-4 border-blue-500 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Peak Memory</p>
                        <p className="text-3xl font-black text-blue-600">{healthData.performance?.peak_memory_mb} <span className="text-lg">MB</span></p>
                    </div>
                    <Cpu size={36} className="text-blue-100" />
                </div>
            </div>

            {/* Row 3: Email Queue */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4 border-b pb-2 text-gray-700">
                    <Mail size={20} className="text-indigo-500" />
                    <h2 className="font-bold text-lg">Email Queue Processor</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-xs text-gray-500">Pending</p>
                        <p className="font-bold text-xl">{healthData.email_queue?.pending}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-xs text-gray-500">Sent Today</p>
                        <p className="font-bold text-xl text-emerald-600">{healthData.email_queue?.sent_today}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-xs text-gray-500">Failed</p>
                        <p className="font-bold text-xl text-red-600">{healthData.email_queue?.failed}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-xs text-gray-500">Oldest Pending</p>
                        <p className="font-bold text-xl">{healthData.email_queue?.oldest_pending_minutes}m</p>
                    </div>
                </div>
                {healthData.email_queue?.failed > 0 && (
                    <div className="bg-amber-50 text-amber-700 p-2 rounded text-sm mb-2 font-medium flex gap-2"><AlertTriangle size={18} /> {healthData.email_queue?.failed} emails failed — check cron job</div>
                )}
                {healthData.email_queue?.oldest_pending_minutes > 30 && (
                    <div className="bg-red-50 text-red-700 p-2 rounded text-sm font-medium flex gap-2"><XCircle size={18} /> Email queue stalled — cron may not be running</div>
                )}
            </div>

            {/* Row 4: Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Error Log */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 pb-2 overflow-hidden flex flex-col h-96">
                    <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                        <h2 className="font-bold text-gray-700 flex items-center gap-2"><ShieldAlert size={18} /> Recent Errors</h2>
                        <span className="text-xs text-gray-500">Max 10 shown</span>
                    </div>
                    <div className="overflow-y-auto flex-1 p-0">
                        {healthData.errors?.recent_errors?.length === 0 ? (
                            <div className="p-8 text-center text-emerald-600 flex flex-col items-center justify-center h-full">
                                <CheckCircle size={40} className="mb-2 opacity-50" />
                                <span className="font-medium text-lg">No errors today 🎉</span>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2">Time</th>
                                        <th className="px-4 py-2">Lvl</th>
                                        <th className="px-4 py-2">Endpoint</th>
                                        <th className="px-4 py-2 w-full">Message</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {healthData.errors?.recent_errors?.slice(0, 10).map((err, i) => (
                                        <tr key={i} className={`border-b border-gray-100 ${err.level === 'FATAL' ? 'bg-red-100' : err.level === 'ERROR' ? 'bg-red-50' : err.level === 'WARN' ? 'bg-amber-50' : ''}`}>
                                            <td className="px-4 py-2 text-gray-500 text-xs">{new Date(err.timestamp).toLocaleTimeString()}</td>
                                            <td className="px-4 py-2 font-bold text-xs">{err.level}</td>
                                            <td className="px-4 py-2 truncate max-w-[120px]" title={err.endpoint}>{err.endpoint}</td>
                                            <td className="px-4 py-2 truncate max-w-[200px]" title={err.message}>{err.message}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Slow Requests */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 pb-2 overflow-hidden flex flex-col h-96">
                    <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                        <h2 className="font-bold text-gray-700 flex items-center gap-2"><Clock size={18} /> Slow Requests</h2>
                        <span className="text-xs text-gray-500">&gt; 1s duration</span>
                    </div>
                    <div className="overflow-y-auto flex-1 p-0">
                        {healthData.performance?.slow_requests_today?.length === 0 ? (
                            <div className="p-8 text-center text-emerald-600 flex flex-col items-center justify-center h-full">
                                <Zap size={40} className="mb-2 opacity-50" />
                                <span className="font-medium text-lg">All requests fast ✅</span>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2">Time</th>
                                        <th className="px-4 py-2">Endpoint</th>
                                        <th className="px-4 py-2">Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...healthData.performance.slow_requests_today]
                                        .sort((a, b) => b.duration_ms - a.duration_ms)
                                        .slice(0, 10)
                                        .map((req, i) => (
                                            <tr key={i} className={`border-b border-gray-100 ${req.duration_ms > 2000 ? 'bg-red-50 text-red-800' : (req.duration_ms > 1000 ? 'bg-amber-50 text-amber-800' : '')}`}>
                                                <td className="px-4 py-2 text-gray-500 text-xs">{new Date(req.timestamp).toLocaleTimeString()}</td>
                                                <td className="px-4 py-2 font-mono text-xs truncate max-w-[200px]" title={req.endpoint}>{req.endpoint}</td>
                                                <td className="px-4 py-2 font-bold">{req.duration_ms} ms</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 5: Database Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <MiniStat title="Students" val={healthData.database_stats?.total_students} />
                <MiniStat title="Enrollments" val={healthData.database_stats?.total_enrollments} />
                <MiniStat title="Grades Entered" val={healthData.database_stats?.total_grades_entered} />
                <MiniStat title="Finalized" val={healthData.database_stats?.finalized_subjects} />
                <div className={`bg-white p-4 rounded-xl shadow-sm text-center border-t-2 ${healthData.database_stats?.at_risk_students > 0 ? 'border-red-500' : 'border-emerald-500'}`}>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">At Risk</p>
                    <p className={`text-2xl font-black ${healthData.database_stats?.at_risk_students > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{healthData.database_stats?.at_risk_students}</p>
                </div>
            </div>

            {/* Row 6: Cache Stats */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Archive size={24} /></div>
                    <div>
                        <h2 className="font-bold text-gray-700">Cache System</h2>
                        <p className="text-sm text-gray-500">
                            Total Items: <span className="font-bold text-gray-700">{healthData.cache?.total_items}</span> |
                            Expired: <span className="font-bold text-gray-700">{healthData.cache?.expired_items}</span> |
                            Size: <span className="font-bold text-gray-700">{healthData.cache?.size_kb} KB</span>
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleClearCache}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors font-medium border border-red-200"
                >
                    <Trash2 size={18} /> Clear All Cache
                </button>
            </div>
        </div>
    );
};

const StatusCard = ({ title, icon: Icon, ok, subtext, subtextColor }) => (
    <div className="bg-white p-5 rounded-xl shadow-sm border flex items-center justify-between border-gray-100 hover:border-blue-200 transition-colors">
        <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${ok ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                <Icon size={24} />
            </div>
            <div>
                <h3 className="font-bold text-gray-700 text-sm">{title}</h3>
                <p className={`text-xs font-bold ${ok ? 'text-emerald-500' : 'text-red-500'}`}>{ok ? 'ONLINE' : 'OFFLINE'}</p>
            </div>
        </div>
        {subtext && <div className={`font-mono text-sm font-bold ${subtextColor}`}>{subtext}</div>}
    </div>
);

const MiniStat = ({ title, val }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm text-center border border-gray-100">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{title}</p>
        <p className="text-2xl font-black text-gray-800">{val || 0}</p>
    </div>
);

export default SystemHealth;
