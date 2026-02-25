import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Activity, Server, Database, Save, FileText, AlertTriangle,
    CheckCircle, RefreshCw, Mail, ShieldAlert,
    Clock, Cpu, Zap, Archive, Trash2, Copy, Info, Check, AlertCircle, X, Users,
    TrendingUp, Gauge, BarChart3, Radio, Wifi, HardDrive
} from 'lucide-react';
import * as healthService from '../../../services/healthService';

// ─── Animated Circular Gauge ─────────────────────────────────────────────────
const CircularGauge = ({ value, max = 100, size = 120, strokeWidth = 10, color = '#6366f1', label, sublabel }) => {
    const [animated, setAnimated] = useState(0);
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;
    const pct = Math.min((value / max) * 100, 100);
    const offset = circ - (circ * animated) / 100;

    useEffect(() => {
        const t = setTimeout(() => setAnimated(pct), 80);
        return () => clearTimeout(t);
    }, [pct]);

    return (
        <div className="flex flex-col items-center gap-1">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90" style={{ display: 'block' }}>
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
                    <circle
                        cx={size / 2} cy={size / 2} r={r} fill="none"
                        stroke={color} strokeWidth={strokeWidth}
                        strokeDasharray={circ} strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 6px ${color}80)` }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-gray-900 leading-none tabular-nums">{Math.round(pct)}%</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{sublabel}</span>
                </div>
            </div>
            {label && <p className="text-xs font-bold text-gray-600 text-center">{label}</p>}
        </div>
    );
};

// ─── Animated Bar ─────────────────────────────────────────────────────────────
const AnimatedBar = ({ value, max, color, label, labelRight }) => {
    const [animated, setAnimated] = useState(0);
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    useEffect(() => {
        const t = setTimeout(() => setAnimated(pct), 120);
        return () => clearTimeout(t);
    }, [pct]);
    return (
        <div>
            <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
                <span className="text-[10px] font-black text-gray-700">{labelRight}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full"
                    style={{
                        width: `${animated}%`,
                        background: color,
                        transition: 'width 1s cubic-bezier(0.34,1.56,0.64,1)',
                        boxShadow: `0 0 8px ${color}60`
                    }}
                />
            </div>
        </div>
    );
};

// ─── Sparkline ────────────────────────────────────────────────────────────────
const Sparkline = ({ values = [], color = '#6366f1', height = 40, width = 120 }) => {
    if (!values.length) return null;
    const max = Math.max(...values, 1);
    const pts = values.map((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - (v / max) * (height - 4) - 2;
        return `${x},${y}`;
    }).join(' ');
    const areaPath = `M0,${height} L${values.map((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - (v / max) * (height - 4) - 2;
        return `${x},${y}`;
    }).join(' L')} L${width},${height} Z`;
    return (
        <svg width={width} height={height} className="overflow-visible">
            <defs>
                <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#sg-${color.replace('#', '')})`} />
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={values.map((_, i) => (i / (values.length - 1)) * width).at(-1)} cy={height - (values.at(-1) / max) * (height - 4) - 2} r="3" fill={color} />
        </svg>
    );
};

// ─── Pulse Dot ────────────────────────────────────────────────────────────────
const PulseDot = ({ ok }) => (
    <span className="relative flex h-2.5 w-2.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
    </span>
);

// ─── Tooltip ──────────────────────────────────────────────────────────────────
const Tooltip = ({ text, children }) => (
    <div className="group relative flex items-center">
        {children}
        <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50">
            <div className="bg-gray-900 text-white text-[11px] font-medium rounded-lg px-3 py-2 w-52 text-center shadow-xl leading-snug">{text}</div>
            <div className="border-4 border-transparent border-t-gray-900 -mt-0.5" />
        </div>
    </div>
);

// ─── Count-Up Number ─────────────────────────────────────────────────────────
const CountUp = ({ target, duration = 1200, suffix = '' }) => {
    const [val, setVal] = useState(0);
    useEffect(() => {
        if (!target) return;
        const num = parseFloat(target);
        if (isNaN(num)) { setVal(target); return; }
        let start = null;
        const step = ts => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setVal(Math.round(ease * num));
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [target, duration]);
    return <>{typeof val === 'number' ? val.toLocaleString() : val}{suffix}</>;
};

// ─── Main Component ──────────────────────────────────────────────────────────
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
    const [memHistory, setMemHistory] = useState([0, 0, 0, 0, 0, 0, 0, 0]);
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
            const mem = parseFloat(data?.performance?.api_script_memory_mb || 0);
            setMemHistory(prev => [...prev.slice(-7), mem]);
            if (data.status !== 'ok' && prevStatusRef.current === 'ok') setBannerDismissed(false);
            prevStatusRef.current = data.status;
        }
        setLastRefresh(new Date().toLocaleTimeString());
        setCountdown(30);
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        let timer;
        if (autoRefresh) {
            timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) { fetchData(true); return 30; }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [autoRefresh, fetchData]);

    const handleClearCache = async () => {
        setShowCacheModal(false);
        const { data, error: fetchError } = await healthService.clearCache();
        if (data && data.success) fetchData(true);
        else window.alert('Failed to clear cache: ' + fetchError);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);
        setTimeout(() => setCopiedText(null), 2000);
    };

    // ── Loading skeleton ──
    if (loading && !healthData) {
        return (
            <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-6">
                <div className="max-w-[1600px] mx-auto space-y-8 animate-pulse">
                    <div className="h-16 bg-white rounded-2xl shadow-sm" />
                    <div className="grid grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-32 bg-white rounded-3xl shadow-sm relative overflow-hidden">
                                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-white rounded-3xl shadow-sm" />)}
                    </div>
                    <div className="grid grid-cols-5 gap-4">
                        <div className="col-span-2 h-80 bg-white rounded-3xl shadow-sm" />
                        <div className="col-span-3 h-80 bg-white rounded-3xl shadow-sm" />
                    </div>
                </div>
                <style>{`
                    @keyframes shimmer { from{transform:translateX(-100%)} to{transform:translateX(200%)} }
                `}</style>
            </div>
        );
    }

    if (error && !healthData) {
        return (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-8 rounded-2xl">
                <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center border border-red-100">
                    <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Wifi size={40} className="text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">API Unreachable</h2>
                    <p className="text-gray-500 text-sm">Cannot connect to the health endpoint. Verify the server is running.</p>
                    <button onClick={() => fetchData()} className="mt-6 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // ── Derived values ──
    const st = healthData?.status || 'unknown';
    const isCritical = st !== 'ok';
    const showBanner = isCritical && !bannerDismissed;
    const errorsToday = healthData?.errors?.errors_today || 0;
    const slowRequestsCnt = healthData?.performance?.slow_requests_today?.length || 0;
    const memUsage = parseFloat(healthData?.performance?.api_script_memory_mb || 0);
    const finalized = healthData?.database_stats?.finalized_subjects || 0;
    const ready = healthData?.database_stats?.ready_to_finalize || 0;
    const totalFinalizedReady = finalized + ready;
    const finalizedPct = totalFinalizedReady > 0 ? (finalized / totalFinalizedReady) * 100 : 0;
    const totalStudents = healthData?.database_stats?.total_students || 0;
    const totalEnrollments = healthData?.database_stats?.total_enrollments || 0;
    const totalGrades = healthData?.database_stats?.total_grades_entered || 0;
    const atRiskStudents = healthData?.database_stats?.at_risk_students || 0;
    const cacheActive = (healthData?.cache?.total_items || 0) - (healthData?.cache?.expired_items || 0);
    const cacheExpired = healthData?.cache?.expired_items || 0;
    const cacheTotal = healthData?.cache?.total_items || 0;
    const cacheKb = healthData?.cache?.size_kb || 0;
    const cronLastRunStr = healthData?.email_queue?.cron_last_run;
    const cronLastRunDate = cronLastRunStr && cronLastRunStr !== 'Never run' ? new Date(cronLastRunStr) : null;
    const cronStatusOk = cronLastRunDate ? (new Date() - cronLastRunDate) / 60000 < 5 : false;
    const combinedErrors = [
        ...(healthData?.errors?.system_errors || []).map(msg => ({ type: 'CRITICAL', msg })),
        ...(healthData?.errors?.recent_errors || []).map(e => ({ type: e.level, msg: e.message }))
    ];

    const statusItems = [
        { title: 'Core Database', icon: Database, ok: healthData?.uptime_check?.database?.status === 'ok', badge: healthData?.uptime_check?.database?.response_ms ? `${healthData.uptime_check.database.response_ms}ms` : null },
        { title: 'Storage Access', icon: HardDrive, ok: healthData?.uptime_check?.log_dir_writable, badge: null },
        { title: 'Cache Cluster', icon: Archive, ok: healthData?.uptime_check?.cache_dir_writable, badge: null },
        { title: 'Environment', icon: Server, ok: healthData?.uptime_check?.env_loaded, badge: null },
    ];

    const upCount = statusItems.filter(s => s.ok).length;

    return (
        <div className="bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 pb-8" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

            {/* ── Top Bar ── */}
            <div className="bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm">
                <div className="px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <Activity size={20} className="text-white" />
                            </div>
                            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
                        </div>
                        <div>
                            <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-[0.2em] leading-none mb-0.5">Admin Panel</p>
                            <h1 className="text-lg font-black text-gray-900 leading-none">System Health</h1>
                        </div>
                        <div className="ml-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border"
                            style={isCritical
                                ? { background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }
                                : { background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
                            <span className="relative flex h-2 w-2">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${isCritical ? 'bg-red-400' : 'bg-emerald-400'}`} />
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${isCritical ? 'bg-red-500' : 'bg-emerald-500'}`} />
                            </span>
                            {isCritical ? 'Degraded' : 'Operational'} · {upCount}/4 Services
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                            <span className="text-[11px] font-bold text-gray-400">Updated {lastRefresh || '—'}</span>
                            <div className="h-3 w-px bg-gray-200" />
                            <label className="flex items-center gap-2 cursor-pointer">
                                <div
                                    onClick={() => setAutoRefresh(v => !v)}
                                    className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${autoRefresh ? 'bg-indigo-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${autoRefresh ? 'left-4' : 'left-0.5'}`} />
                                </div>
                                <span className="text-[11px] font-bold text-gray-600">Auto</span>
                                {autoRefresh && (
                                    <div className="relative w-8 h-5">
                                        <svg className="absolute inset-0 -rotate-90" width="20" height="20" viewBox="0 0 20 20" style={{ marginLeft: 0 }}>
                                            <circle cx="10" cy="10" r="8" stroke="#e0e7ff" strokeWidth="2.5" fill="none" />
                                            <circle
                                                cx="10" cy="10" r="8" stroke="#6366f1" strokeWidth="2.5" fill="none"
                                                strokeDasharray={50.3} strokeDashoffset={50.3 - (50.3 * (countdown / 30))}
                                                strokeLinecap="round"
                                                style={{ transition: 'stroke-dashoffset 1s linear' }}
                                            />
                                        </svg>
                                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-indigo-600">{countdown}</span>
                                    </div>
                                )}
                            </label>
                        </div>
                        <button
                            onClick={() => fetchData(true)}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-60"
                        >
                            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-6 pt-6 space-y-5">

                {/* ── Alert Banner ── */}
                {showBanner ? (
                    <div className="relative overflow-hidden rounded-2xl p-5 border flex items-center justify-between"
                        style={{ background: 'linear-gradient(135deg,#7f1d1d,#dc2626)', borderColor: '#b91c1c' }}>
                        <div className="absolute inset-0 opacity-10"
                            style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '10px 10px' }} />
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <AlertTriangle size={26} className="text-white animate-bounce" />
                            </div>
                            <div>
                                <h3 className="text-white font-black text-lg tracking-tight">Critical Infrastructure Alert</h3>
                                <p className="text-red-200 text-sm font-medium">Underlying system errors detected. Database or Storage systems may be degraded.</p>
                            </div>
                        </div>
                        <button onClick={() => setBannerDismissed(true)} className="p-2 hover:bg-white/20 rounded-xl text-white transition-colors relative z-10">
                            <X size={20} />
                        </button>
                    </div>
                ) : !isCritical && !bannerDismissed ? (
                    <div className="relative overflow-hidden rounded-2xl p-5 border flex items-center gap-4"
                        style={{ background: 'linear-gradient(135deg,#052e16,#16a34a)', borderColor: '#15803d' }}>
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <CheckCircle size={26} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-white font-black text-lg tracking-tight">System Operational</h3>
                            <p className="text-emerald-200 text-sm font-medium">All core services are responding within normal parameters.</p>
                        </div>
                    </div>
                ) : null}

                {/* ── Row 1: Status Cards ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {statusItems.map(({ title, icon: Icon, ok, badge }) => (
                        <div key={title} className={`group relative bg-white rounded-2xl border p-5 flex items-center gap-4 hover:-translate-y-1 transition-all duration-300 overflow-hidden ${ok ? 'border-emerald-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-100/50' : 'border-red-100 hover:border-red-200 hover:shadow-lg hover:shadow-red-100/50'}`}>
                            <div className={`absolute top-0 left-0 h-1 w-full ${ok ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-red-500 to-rose-400'}`} />
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${ok ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                <Icon size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1 truncate">{title}</p>
                                <div className="flex items-center gap-2">
                                    <PulseDot ok={ok} />
                                    <span className={`text-sm font-black ${ok ? 'text-emerald-600' : 'text-red-500'}`}>{ok ? 'Active' : 'Offline'}</span>
                                    {badge && <span className="ml-auto text-[9px] font-black bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-lg border border-indigo-100">{badge}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Row 2: Metric Cards ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Errors Today */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:shadow-red-50 transition-all group">
                        <div className="flex justify-between items-start mb-5">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${errorsToday > 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                <ShieldAlert size={24} />
                            </div>
                            <Tooltip text="Recent exceptions and fatal errors logged by the PHP/MySQL backend.">
                                <Info size={14} className="text-gray-300 hover:text-gray-500 cursor-help" />
                            </Tooltip>
                        </div>
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Critical Errors Today</p>
                        <p className={`text-5xl font-black tabular-nums ${errorsToday > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                            <CountUp target={errorsToday} />
                        </p>
                        <div className="mt-4 pt-4 border-t border-gray-50">
                            <Sparkline values={[0, 1, 0, 2, errorsToday, 0, errorsToday]} color={errorsToday > 0 ? '#ef4444' : '#10b981'} width={160} height={36} />
                        </div>
                    </div>

                    {/* Slow Requests */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:shadow-amber-50 transition-all group">
                        <div className="flex justify-between items-start mb-5">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${slowRequestsCnt > 0 ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                <Clock size={24} />
                            </div>
                            <Tooltip text="Requests exceeding 1000ms response time in the current session.">
                                <Info size={14} className="text-gray-300 hover:text-gray-500 cursor-help" />
                            </Tooltip>
                        </div>
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Slow Request Volume</p>
                        <p className="text-5xl font-black tabular-nums text-gray-900">
                            <CountUp target={slowRequestsCnt} />
                        </p>
                        <div className="mt-4 pt-4 border-t border-gray-50">
                            <Sparkline values={[2, 0, 1, 3, slowRequestsCnt, 1, slowRequestsCnt]} color={slowRequestsCnt > 0 ? '#f59e0b' : '#10b981'} width={160} height={36} />
                        </div>
                    </div>

                    {/* Memory Usage */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:shadow-indigo-50 transition-all group">
                        <div className="flex justify-between items-start mb-5">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600">
                                <Cpu size={24} />
                            </div>
                            <Tooltip text="Peak memory allocation consumed by the Health API script during telemetry.">
                                <Info size={14} className="text-gray-300 hover:text-gray-500 cursor-help" />
                            </Tooltip>
                        </div>
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Compute Memory</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-5xl font-black tabular-nums text-gray-900">{memUsage}</p>
                            <span className="text-xl font-bold text-gray-300">MB</span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-50">
                            <Sparkline values={memHistory} color="#6366f1" width={160} height={36} />
                        </div>
                    </div>
                </div>

                {/* ── Row 3: Main Panel ── */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

                    {/* Left col */}
                    <div className="xl:col-span-2 space-y-6">

                        {/* Email Queue */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                    <Mail size={18} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-gray-900">Email Queue</h2>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mail Processor Status</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-5">
                                {[
                                    { label: 'Pending', value: healthData?.email_queue?.pending || 0, color: 'text-gray-900' },
                                    { label: 'Sent Today', value: healthData?.email_queue?.sent_today || 0, color: 'text-emerald-500' },
                                    { label: 'Fatal Failures', value: healthData?.email_queue?.failed || 0, color: 'text-red-500' },
                                    { label: 'Latency', value: `${healthData?.email_queue?.oldest_pending_minutes || 0}m`, color: 'text-gray-900' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className="bg-gray-50 rounded-xl p-4 hover:bg-indigo-50/50 transition-colors">
                                        <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                                        <p className={`text-2xl font-black ${color}`}>{value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className={`flex items-center justify-between p-4 rounded-xl border font-medium ${cronStatusOk ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100 animate-pulse'}`}>
                                <div className="flex items-center gap-3">
                                    <PulseDot ok={cronStatusOk} />
                                    <div>
                                        <p className={`text-sm font-black ${cronStatusOk ? 'text-emerald-700' : 'text-red-600'}`}>Cron Processor</p>
                                        <p className="text-[10px] font-bold text-gray-400">Mail delivery scheduler</p>
                                    </div>
                                </div>
                                <span className="text-[10px] text-gray-400 font-bold">
                                    {cronLastRunDate ? cronLastRunDate.toLocaleTimeString() : 'Offline'}
                                </span>
                            </div>
                        </div>

                        {/* Cache Optimization */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                                        <Archive size={18} className="text-gray-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-black text-gray-900">Cache Optimization</h2>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Object Store</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowCacheModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors border border-transparent hover:border-red-100"
                                    title="Purge Cache"
                                >
                                    <Trash2 size={14} />
                                    Purge
                                </button>
                            </div>

                            <div className="flex items-center gap-6 mb-5">
                                <CircularGauge
                                    value={cacheActive}
                                    max={Math.max(cacheTotal, 1)}
                                    size={100}
                                    strokeWidth={9}
                                    color="#6366f1"
                                    sublabel="Active"
                                />
                                <div className="flex-1 space-y-3">
                                    <AnimatedBar value={cacheActive} max={Math.max(cacheTotal, 1)} color="#6366f1" label="Active Objects" labelRight={`${cacheActive}`} />
                                    <AnimatedBar value={cacheExpired} max={Math.max(cacheTotal, 1)} color="#f59e0b" label="Expired Objects" labelRight={`${cacheExpired}`} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                                <div>
                                    <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Total Objects</p>
                                    <p className="text-xl font-black text-gray-900">{cacheTotal}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Disk Usage</p>
                                    <p className="text-xl font-black text-gray-900">{cacheKb} <span className="text-gray-300 font-bold text-sm">KB</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right col */}
                    <div className="xl:col-span-3 space-y-6">

                        {/* Database Stats */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                        <Database size={18} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-black text-gray-900">Database Clusters</h2>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Relational Integrity Metrics</p>
                                    </div>
                                </div>
                                <span className={`text-[11px] font-black px-3 py-1 rounded-full ${atRiskStudents > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    Risk: {atRiskStudents > 0 ? 'High' : 'Optimal'}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-6">
                                {[
                                    { icon: Users, label: 'Student Registry', value: totalStudents, color: '#6366f1' },
                                    { icon: CheckCircle, label: 'Active Enrollments', value: totalEnrollments, color: '#10b981' },
                                    { icon: Zap, label: 'Grade Components', value: totalGrades, color: '#f59e0b' },
                                ].map(({ icon: Icon, label, value, color }) => (
                                    <div key={label} className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-100 hover:border-indigo-100 hover:shadow-md transition-all group">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + '15' }}>
                                                <Icon size={14} style={{ color }} />
                                            </div>
                                            <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest leading-tight">{label}</p>
                                        </div>
                                        <p className="text-2xl font-black text-gray-900 tabular-nums">
                                            <CountUp target={value} />
                                        </p>
                                        <div className="mt-2 h-1 rounded-full" style={{ background: color + '20' }}>
                                            <div className="h-full rounded-full" style={{ width: '60%', background: color }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Grading Integrity */}
                            <div className="bg-gradient-to-br from-indigo-50/50 to-violet-50/30 rounded-xl p-5 border border-indigo-100/50 flex flex-col md:flex-row items-center gap-6">
                                <CircularGauge
                                    value={finalizedPct}
                                    max={100}
                                    size={110}
                                    strokeWidth={10}
                                    color="#6366f1"
                                    sublabel="Done"
                                />
                                <div className="flex-1 w-full">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-black text-gray-900">Grading Integrity</h3>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-black text-indigo-600">{finalized.toLocaleString()}</span>
                                            <span className="text-gray-300 font-bold">/</span>
                                            <span className="text-xl font-black text-gray-400">{totalFinalizedReady.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-4">Ratio of finalized transcripts to pending submissions.</p>
                                    <AnimatedBar value={finalized} max={Math.max(totalFinalizedReady, 1)} color="#6366f1" label="Finalized" labelRight={`${finalized}`} />
                                    <div className="mt-2">
                                        <AnimatedBar value={ready} max={Math.max(totalFinalizedReady, 1)} color="#fbbf24" label="Pending Ready" labelRight={`${ready}`} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* System Anomalies Log */}
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                                        <ShieldAlert size={18} className="text-red-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-black text-gray-900">System Anomalies</h2>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Error Stream</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {combinedErrors.length > 0 && (
                                        <span className="px-2.5 py-1 bg-red-100 text-red-600 text-[11px] font-black rounded-lg">
                                            {combinedErrors.length} Issue{combinedErrors.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="p-5 space-y-3 max-h-[360px] overflow-y-auto" style={{ background: '#fafbff' }}>
                                {combinedErrors.length === 0 ? (
                                    <div className="py-16 flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                                            <Zap size={32} className="text-emerald-500" />
                                        </div>
                                        <h3 className="font-black text-gray-800 text-lg">Infrastructure Optimal</h3>
                                        <p className="text-gray-400 text-sm font-medium mt-1">No fatal exceptions recorded in the telemetry buffer.</p>
                                    </div>
                                ) : combinedErrors.slice(0, 15).map((err, i) => {
                                    const isCrit = err.type.includes('CRITICAL') || err.type === 'FATAL';
                                    return (
                                        <div key={i} className="group bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all relative overflow-hidden">
                                            <div className={`absolute left-0 top-0 w-1 h-full rounded-l-xl ${isCrit ? 'bg-red-500' : 'bg-amber-400'}`} />
                                            <div className="flex justify-between items-center mb-2">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${isCrit ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    {err.type}
                                                </span>
                                                <button
                                                    onClick={() => copyToClipboard(err.msg)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 rounded-lg transition-all"
                                                >
                                                    {copiedText === err.msg ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-gray-400" />}
                                                </button>
                                            </div>
                                            <p className="font-mono text-xs text-gray-700 break-all leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">{err.msg}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Cache Modal ── */}
            {showCacheModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 border border-gray-100">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5 ring-8 ring-red-50">
                                <AlertCircle size={40} className="text-red-500" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">System Flush</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                You are about to purge all application telemetry and result caches. This may cause a temporary latency spike during index rebuild.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleClearCache} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-lg shadow-red-200 transition-all active:scale-[0.98]">
                                Confirm Purge
                            </button>
                            <button onClick={() => setShowCacheModal(false)} className="w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-2xl transition-all">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap');
                * { font-family: 'Inter', system-ui, sans-serif; }
            `}</style>
        </div>
    );
};

export default SystemHealth;
