import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PieChart, Pie, Cell,
    ScatterChart, Scatter, XAxis, YAxis,
    BarChart, Bar, CartesianGrid,
    ResponsiveContainer, Tooltip, Legend,
    ReferenceLine, LabelList
} from 'recharts';
import {
    AlertTriangle, ShieldCheck, Star, RefreshCw,
    TrendingUp, TrendingDown, ChevronRight, Home,
    BarChart3, PieChart as PieIcon, Activity, Users2
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import apiClient from '../../utils/apiClient';

/* ─────────────────────────────────────────────────────────────────────────────
   DESIGN TOKENS
   Primary palette: deep purple / indigo as defined in the spec
───────────────────────────────────────────────────────────────────────────── */
const C = {
    // Spec: Purple as primary for At Risk, Green for Safe, Light Purple for Star
    atRisk: '#7C3AED',   // purple (#7C3AED)
    safe: '#16A34A',   // green
    star: '#A78BFA',   // light purple
    primary: '#7C3AED',   // brand purple
    primaryLight: 'rgba(124,58,237,0.1)',

    atRiskLight: 'rgba(124,58,237,0.1)',
    safeLight: 'rgba(22,163,74,0.1)',
    starLight: 'rgba(167,139,250,0.12)',

    danger: '#DC2626',
    text: '#0F172A',
    muted: '#64748B',
    subtle: '#94A3B8',
    border: '#E2E8F0',
    bg: '#F8FAFC',
    white: '#FFFFFF',
};

/* ─────────────────────────────────────────────────────────────────────────────
   FRAMER MOTION VARIANTS
───────────────────────────────────────────────────────────────────────────── */
const containerV = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
};
const itemV = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL STYLES (injected once via <style>)
───────────────────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
@keyframes spin    { to { transform: rotate(360deg); } }
@keyframes shimmer { 0%,100% { opacity:1; } 50% { opacity:.5; } }

.ins-card { transition: box-shadow .25s ease, transform .25s ease; }
.ins-card:hover { box-shadow: 0 12px 36px rgba(15,23,42,.11); transform: translateY(-3px); }

.ins-refresh-btn:hover:not(:disabled) { opacity: .92; transform: scale(1.03); }
.ins-refresh-btn:active:not(:disabled) { transform: scale(.97); }
.ins-refresh-btn { transition: all .2s ease; }

.ins-skeleton {
    background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
    border-radius: 12px;
}

@media (max-width: 1080px) { .ins-chart-row { grid-template-columns: 1fr !important; } }
@media (max-width:  680px) { .ins-kpi-row  { grid-template-columns: 1fr !important; } }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   GLASS TOOLTIP WRAPPER
───────────────────────────────────────────────────────────────────────────── */
const GlassBox = ({ children }) => (
    <div style={{
        background: 'rgba(255,255,255,.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,.55)',
        borderRadius: 10,
        padding: '9px 13px',
        boxShadow: '0 8px 28px rgba(15,23,42,.13)',
        minWidth: 130,
        pointerEvents: 'none',
    }}>
        {children}
    </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   CHART TOOLTIPS
───────────────────────────────────────────────────────────────────────────── */
const PieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0];
    const clr = payload[0].payload?.color ?? C.primary;
    const total = payload[0].payload?.total ?? value;
    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
    return (
        <GlassBox>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: clr, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{name}</span>
            </div>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{value.toLocaleString()} students</p>
            <p style={{ fontSize: 12, color: C.subtle, margin: 0 }}>{pct}% of cohort</p>
        </GlassBox>
    );
};

const ScatterTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload ?? {};
    return (
        <GlassBox>
            {d.studentName && (
                <p style={{ fontWeight: 700, fontSize: 13, color: C.text, margin: '0 0 5px' }}>{d.studentName}</p>
            )}
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                Attendance: <strong>{Number(d.x ?? 0).toFixed(1)}%</strong>
            </p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                Grade: <strong>{Number(d.y ?? 0).toFixed(1)}%</strong>
            </p>
            {d.riskLevel && (
                <span style={{
                    display: 'inline-block', marginTop: 5, fontSize: 11, fontWeight: 600,
                    color: d.riskLevel === 'At Risk' ? C.atRisk
                        : d.riskLevel === 'Safe' ? C.safe : C.star,
                }}>
                    {d.riskLevel}
                </span>
            )}
        </GlassBox>
    );
};

const BarTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const val = Number(payload[0]?.value ?? 0);
    const count = payload[0]?.payload?.studentCount;
    const isEmpty = val === 0;
    return (
        <GlassBox>
            <p style={{ fontWeight: 700, fontSize: 13, color: C.text, margin: '0 0 4px' }}>{label}</p>
            {isEmpty
                ? <p style={{ fontSize: 12, color: C.subtle, margin: 0, fontStyle: 'italic' }}>No data available</p>
                : <>
                    <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Avg Grade: <strong>{val.toFixed(1)}%</strong></p>
                    {count && <p style={{ fontSize: 12, color: C.subtle, margin: 0 }}>Students: {count}</p>}
                </>
            }
        </GlassBox>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   SKELETON LOADER
───────────────────────────────────────────────────────────────────────────── */
const Sk = ({ w, h, style }) => (
    <div className="ins-skeleton" style={{ width: w ?? '100%', height: h ?? 16, ...style }} />
);

/* ─────────────────────────────────────────────────────────────────────────────
   KPI METRIC CARD
───────────────────────────────────────────────────────────────────────────── */
const KpiCard = ({ icon: Icon, label, value, valueColor, iconBg, trend, trendDir }) => (
    <motion.div
        variants={itemV}
        className="ins-card"
        style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: '20px 22px',
            boxShadow: '0 2px 12px rgba(15,23,42,.05)',
            position: 'relative',
            overflow: 'hidden',
        }}
    >
        {/* Decorative orb */}
        <div style={{
            position: 'absolute', top: -24, right: -24,
            width: 80, height: 80, borderRadius: '50%',
            background: valueColor, opacity: .06, filter: 'blur(16px)',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Icon row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: iconBg, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icon size={20} style={{ color: valueColor }} strokeWidth={2.2} />
                </div>

                {trend && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        padding: '3px 9px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                        color: trendDir === 'down' ? C.safe : C.safe,
                        background: trendDir === 'down' ? 'rgba(22,163,74,.1)' : 'rgba(22,163,74,.1)',
                    }}>
                        {trendDir === 'down'
                            ? <TrendingDown size={12} style={{ color: C.safe }} />
                            : <TrendingUp size={12} style={{ color: C.safe }} />
                        }
                        {trend}
                    </div>
                )}
            </div>

            {/* Label */}
            <p style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: C.subtle, margin: '0 0 6px',
            }}>
                {label}
            </p>

            {/* Value */}
            <p style={{
                fontSize: 42, fontWeight: 800, lineHeight: 1, margin: 0,
                color: valueColor,
                fontVariantNumeric: 'tabular-nums',
            }}>
                {typeof value === 'number' ? value.toLocaleString() : '—'}
            </p>
        </div>
    </motion.div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   CHART CARD WRAPPER
───────────────────────────────────────────────────────────────────────────── */
const ChartCard = ({ title, subtitle, badge, icon: Icon, children }) => (
    <motion.div
        variants={itemV}
        style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: '20px 22px',
            boxShadow: '0 2px 12px rgba(15,23,42,.05)',
            display: 'flex',
            flexDirection: 'column',
        }}
    >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {Icon && (
                    <div style={{
                        width: 34, height: 34, borderRadius: 9,
                        background: C.primaryLight,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <Icon size={17} style={{ color: C.primary }} strokeWidth={2.2} />
                    </div>
                )}
                <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
                        {title}
                    </h3>
                    {subtitle && (
                        <p style={{ fontSize: 11.5, color: C.subtle, margin: '2px 0 0', fontStyle: 'italic', lineHeight: 1.4 }}>
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            {badge && (
                <span style={{
                    padding: '3px 9px', borderRadius: 20, flexShrink: 0,
                    background: C.primaryLight, color: C.primary,
                    fontSize: 11, fontWeight: 700,
                }}>
                    {badge}
                </span>
            )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#F1F5F9', marginBottom: 16 }} />

        {children}
    </motion.div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   CUSTOM PIE LEGEND
───────────────────────────────────────────────────────────────────────────── */
const PieLegend = ({ items }) => (
    <div style={{
        display: 'flex', justifyContent: 'center',
        gap: 20, flexWrap: 'wrap', marginTop: 14,
    }}>
        {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: it.color }} />
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{it.label}</span>
            </div>
        ))}
    </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
const InsightsDashboard = () => {
    const { token } = useAuth();
    const [stats, setStats] = useState(null);
    const [prevStats, setPrevStats] = useState(null); // previous snapshot for real trend calculation
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const hasDataRef = React.useRef(false);

    /* ── FETCH ─────────────────────────────────────────────────────────── */
    const fetchStats = useCallback(async (isRefresh = false) => {
        isRefresh ? setRefreshing(true) : setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get('/analytics/features.php', { action: 'stats' });
            if (res.success) {
                // Preserve previous snapshot before overwriting, so we can compute real deltas
                if (hasDataRef.current) {
                    setStats(prev => {
                        setPrevStats(prev);
                        return res.data;
                    });
                } else {
                    setStats(res.data);
                }
                hasDataRef.current = true;
                setLastUpdated(new Date());
            } else {
                throw new Error(res.error ?? 'Failed to load analytics');
            }
        } catch (err) {
            console.error('[InsightsDashboard]', err);
            if (!hasDataRef.current) setError(err.message ?? 'Something went wrong.');
            else setError('⚠ Refresh failed — showing last known data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        const t = setInterval(() => fetchStats(true), 60_000);
        return () => clearInterval(t);
    }, [fetchStats]);

    /* ── REAL TREND CALCULATION ────────────────────────────────────────── */
    // Returns { label: '+5%' | '-3%' | 'Live', dir: 'up' | 'down' | null }
    const computeTrend = useCallback((key) => {
        const curr = stats?.risk_distribution?.[key] ?? null;
        const prev = prevStats?.risk_distribution?.[key] ?? null;
        if (curr === null || prev === null || prev === 0) {
            return { label: 'Live', dir: null };
        }
        const delta = curr - prev;
        const pct = ((delta / prev) * 100).toFixed(1);
        if (delta === 0) return { label: 'Stable', dir: null };
        return {
            label: `${delta > 0 ? '+' : ''}${pct}%`,
            dir: delta > 0 ? 'up' : 'down',
        };
    }, [stats, prevStats]);

    /* ── DERIVED DATA ──────────────────────────────────────────────────── */
    const atRisk = stats?.risk_distribution?.['At Risk'] ?? 0;
    const safe = stats?.risk_distribution?.['Safe'] ?? 0;
    const star = stats?.risk_distribution?.['Star'] ?? 0;
    const total = atRisk + safe + star;

    // Real trend deltas (computed from actual snapshots)
    const atRiskTrend = computeTrend('At Risk');
    const safeTrend = computeTrend('Safe');
    const starTrend = computeTrend('Star');

    const pieData = [
        { name: 'At Risk', value: atRisk, color: C.atRisk, total },
        { name: 'Safe', value: safe, color: C.safe, total },
        { name: 'Star Performers', value: star, color: C.star, total },
    ].filter(d => d.value > 0); // hide truly-zero segments

    /* Scatter — auto-scale domain to actual data range for readability */
    const rawScatter = useMemo(() =>
        (stats?.correlation_att_grade ?? []).map(p => ({
            x: parseFloat(p.x) || 0,
            y: parseFloat(p.y) || 0,
            riskLevel: p.risk_level ?? null,
            studentName: p.student_name ?? null,
        })),
        [stats]);

    const scatterDomain = useMemo(() => {
        if (!rawScatter.length) return { x: [0, 100], y: [0, 100] };
        const xs = rawScatter.map(d => d.x);
        const ys = rawScatter.map(d => d.y);
        const pad = 8;
        return {
            x: [Math.max(0, Math.floor(Math.min(...xs)) - pad),
            Math.min(100, Math.ceil(Math.max(...xs)) + pad)],
            y: [Math.max(0, Math.floor(Math.min(...ys)) - pad),
            Math.min(100, Math.ceil(Math.max(...ys)) + pad)],
        };
    }, [rawScatter]);

    /* Cohort — always show Sem 1, 3, 5 — fill missing with 0 */
    const targetSems = [1, 3, 5];
    const cohortMap = useMemo(() => {
        const m = {};
        (stats?.cohort_grades ?? []).forEach(c => {
            m[Number(c.current_semester)] = {
                averageGrade: parseFloat(c.avg_grade) || 0,
                studentCount: c.student_count ?? null,
            };
        });
        return m;
    }, [stats]);

    const cohortData = targetSems.map(sem => ({
        semester: `Semester ${sem}`,
        averageGrade: cohortMap[sem]?.averageGrade ?? 0,
        studentCount: cohortMap[sem]?.studentCount ?? null,
        noData: !cohortMap[sem],
    }));

    const fmtTime = (d) => d?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    /* ── SKELETON ──────────────────────────────────────────────────────── */
    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <style>{GLOBAL_CSS}</style>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <Sk w={200} h={24} />
                        <Sk w={280} h={14} />
                    </div>
                    <Sk w={130} h={40} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                    <Sk h={120} /><Sk h={120} /><Sk h={120} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 14 }}>
                    <Sk h={320} /><Sk h={320} />
                </div>
                <Sk h={250} />
            </div>
        );
    }

    /* ── MAIN RENDER ───────────────────────────────────────────────────── */
    return (
        <motion.div
            initial="hidden" animate="visible" variants={containerV}
            style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 32 }}
        >
            <style>{GLOBAL_CSS}</style>

            {/* ─── HEADER ──────────────────────────────────────────────── */}
            <motion.div variants={itemV}>
                {/* Breadcrumb */}
                <nav style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 12, color: C.subtle, marginBottom: 14,
                }}>
                    <a
                        href="/admin/dashboard?tab=overview"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: C.subtle, textDecoration: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.color = C.primary}
                        onMouseLeave={e => e.currentTarget.style.color = C.subtle}
                    >
                        <Home size={12} /> Dashboard
                    </a>
                    <ChevronRight size={12} style={{ color: '#CBD5E1' }} />
                    <span style={{ color: C.text, fontWeight: 600 }}>Analytics Insights</span>
                </nav>

                {/* Title row */}
                <div style={{
                    display: 'flex', alignItems: 'flex-start',
                    justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 46, height: 46, borderRadius: 13,
                            background: 'linear-gradient(135deg,#7C3AED 0%,#A78BFA 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 6px 16px rgba(124,58,237,.28)',
                        }}>
                            <BarChart3 size={22} style={{ color: '#fff' }} />
                        </div>
                        <div>
                            <h1 style={{
                                fontSize: 23, fontWeight: 800, color: C.text,
                                margin: 0, letterSpacing: '-0.02em',
                            }}>
                                Analytics Insights
                            </h1>
                            <p style={{ fontSize: 13, color: C.muted, margin: '3px 0 0' }}>
                                Phase B: Descriptive Mining — Patterns &amp; Distributions
                            </p>
                        </div>
                    </div>

                    <button
                        className="ins-refresh-btn"
                        onClick={() => fetchStats(true)}
                        disabled={refreshing}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '9px 18px',
                            background: refreshing ? '#EDE9FE' : '#7C3AED',
                            border: 'none', borderRadius: 11, cursor: refreshing ? 'not-allowed' : 'pointer',
                            color: refreshing ? C.primary : '#fff',
                            fontWeight: 600, fontSize: 13,
                            boxShadow: refreshing ? 'none' : '0 4px 14px rgba(124,58,237,.32)',
                        }}
                    >
                        <RefreshCw
                            size={14}
                            style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
                        />
                        {refreshing ? 'Refreshing…' : 'Refresh Data'}
                    </button>
                </div>
            </motion.div>

            {/* ─── ERROR TOAST ─────────────────────────────────────────── */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        key="toast"
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                        onClick={() => setError(null)}
                        title="Click to dismiss"
                        style={{
                            position: 'fixed', top: 76, right: 18, zIndex: 9999,
                            padding: '9px 14px', borderRadius: 11, cursor: 'pointer',
                            background: error.startsWith('⚠') ? 'rgba(245,158,11,.09)' : 'rgba(220,38,38,.09)',
                            border: error.startsWith('⚠') ? '1px solid rgba(245,158,11,.3)' : '1px solid rgba(220,38,38,.3)',
                            color: error.startsWith('⚠') ? '#92400E' : '#DC2626',
                            fontSize: 12, display: 'flex', alignItems: 'center', gap: 7,
                            backdropFilter: 'blur(8px)', maxWidth: 300,
                            boxShadow: '0 4px 16px rgba(15,23,42,.09)',
                        }}
                    >
                        <AlertTriangle size={13} />
                        <span>{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── KPI CARDS ───────────────────────────────────────────── */}
            <div
                className="ins-kpi-row"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}
            >
                <KpiCard
                    icon={AlertTriangle}
                    label="At Risk Students"
                    value={atRisk}
                    valueColor={C.atRisk}
                    iconBg={C.atRiskLight}
                    trend={atRiskTrend.label}
                    trendDir={atRiskTrend.dir ?? 'down'}
                />
                <KpiCard
                    icon={ShieldCheck}
                    label="Safe Students"
                    value={safe}
                    valueColor={C.safe}
                    iconBg={C.safeLight}
                    trend={safeTrend.label}
                    trendDir={safeTrend.dir ?? 'up'}
                />
                <KpiCard
                    icon={Star}
                    label="Star Performers"
                    value={star}
                    valueColor={C.star}
                    iconBg={C.starLight}
                    trend={starTrend.label}
                    trendDir={starTrend.dir ?? 'up'}
                />
            </div>

            {/* ─── CHARTS TOP ROW ──────────────────────────────────────── */}
            <div
                className="ins-chart-row"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1.62fr', gap: 14 }}
            >
                {/* ── DONUT CHART ──────────────────────────────────────── */}
                <ChartCard
                    title="Risk Distribution"
                    subtitle={`${total.toLocaleString()} total students analyzed`}
                    icon={PieIcon}
                >
                    <div style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <defs>
                                    <linearGradient id="gAtRisk" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor="#9333EA" />
                                        <stop offset="100%" stopColor="#7C3AED" />
                                    </linearGradient>
                                    <linearGradient id="gSafe" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor="#22C55E" />
                                        <stop offset="100%" stopColor="#16A34A" />
                                    </linearGradient>
                                    <linearGradient id="gStar" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor="#C4B5FD" />
                                        <stop offset="100%" stopColor="#A78BFA" />
                                    </linearGradient>
                                </defs>
                                <Pie
                                    data={pieData}
                                    cx="50%" cy="44%"
                                    innerRadius={70} outerRadius={104}
                                    paddingAngle={3} dataKey="value"
                                    animationBegin={80} animationDuration={850}
                                    animationEasing="ease-out" stroke="none"
                                >
                                    {pieData.map((entry, i) => {
                                        const fills = ['url(#gAtRisk)', 'url(#gSafe)', 'url(#gStar)'];
                                        return <Cell key={i} fill={fills[i] ?? entry.color} />;
                                    })}
                                </Pie>
                                <Tooltip content={<PieTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>

                        <PieLegend items={[
                            { label: 'At Risk', color: C.atRisk },
                            { label: 'Safe', color: C.safe },
                            { label: 'Star Performers', color: C.star },
                        ]} />
                    </div>
                </ChartCard>

                {/* ── SCATTER CHART ─────────────────────────────────────── */}
                <ChartCard
                    title="Correlation: Attendance vs Grade"
                    subtitle="Each point represents a student. Clustering in top-right indicates positive correlation."
                    icon={TrendingUp}
                    badge={`${rawScatter.length} points`}
                >
                    <div style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 8, right: 12, bottom: 28, left: 4 }}>
                                <defs>
                                    <radialGradient id="dotG" cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.85} />
                                        <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.55} />
                                    </radialGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                <XAxis
                                    dataKey="x" type="number" name="Attendance %"
                                    domain={scatterDomain.x}
                                    tick={{ fontSize: 11, fill: C.subtle }}
                                    label={{ value: 'Attendance %', position: 'insideBottom', offset: -18, fontSize: 12, fill: C.muted, fontWeight: 600 }}
                                />
                                <YAxis
                                    dataKey="y" type="number" name="Grade %"
                                    domain={scatterDomain.y}
                                    tick={{ fontSize: 11, fill: C.subtle }}
                                    label={{ value: 'Grade %', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fill: C.muted, fontWeight: 600 }}
                                    width={46}
                                />
                                <Tooltip
                                    cursor={{ stroke: '#E2E8F0', strokeDasharray: '4 3' }}
                                    content={<ScatterTooltip />}
                                />
                                <Scatter
                                    data={rawScatter}
                                    fill="url(#dotG)"
                                    r={4}
                                    animationBegin={180}
                                    animationDuration={800}
                                />
                                {/* Positive-correlation reference trend */}
                                <ReferenceLine
                                    segment={[
                                        { x: scatterDomain.x[0], y: scatterDomain.y[0] },
                                        { x: scatterDomain.x[1], y: scatterDomain.y[1] },
                                    ]}
                                    stroke="#C4B5FD"
                                    strokeDasharray="6 4"
                                    strokeWidth={1.5}
                                />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* ─── COHORT BAR CHART ────────────────────────────────────── */}
            <ChartCard
                title="Cohort Analysis — Average Grade by Semester"
                subtitle="Performance comparison across student cohorts by semester level"
                icon={Users2}
            >
                <div style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={cohortData}
                            margin={{ top: 10, right: 14, bottom: 18, left: 0 }}
                            barCategoryGap="42%"
                        >
                            <defs>
                                <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#7C3AED" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#A78BFA" stopOpacity={0.65} />
                                </linearGradient>
                                <linearGradient id="barEmpty" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#E2E8F0" stopOpacity={0.7} />
                                    <stop offset="100%" stopColor="#F1F5F9" stopOpacity={0.4} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                            <XAxis
                                dataKey="semester"
                                tick={{ fontSize: 12, fill: C.muted, fontWeight: 600 }}
                                axisLine={false} tickLine={false}
                            />
                            <YAxis
                                domain={[0, 100]}
                                tick={{ fontSize: 11, fill: C.subtle }}
                                tickFormatter={v => `${v}%`}
                                axisLine={false} tickLine={false}
                                width={40}
                            />
                            <Tooltip
                                content={<BarTooltip />}
                                cursor={{ fill: 'rgba(124,58,237,.05)', radius: 8 }}
                            />
                            <Bar
                                dataKey="averageGrade"
                                radius={[10, 10, 0, 0]}
                                animationBegin={280}
                                animationDuration={850}
                                animationEasing="ease-out"
                                maxBarSize={72}
                            >
                                {cohortData.map((entry, i) => (
                                    <Cell
                                        key={i}
                                        fill={entry.noData || entry.averageGrade === 0
                                            ? 'url(#barEmpty)'
                                            : 'url(#barG)'
                                        }
                                    />
                                ))}
                                {/* "No data" label on empty bars */}
                                <LabelList
                                    content={({ x, y, width, height, value, index }) => {
                                        if (!cohortData[index]?.noData && value > 0) return null;
                                        return (
                                            <text
                                                x={x + width / 2}
                                                y={y - 6}
                                                textAnchor="middle"
                                                fontSize={10}
                                                fill={C.subtle}
                                                fontStyle="italic"
                                            >
                                                No data
                                            </text>
                                        );
                                    }}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </ChartCard>

            {/* ─── FOOTER ──────────────────────────────────────────────── */}
            <motion.div
                variants={itemV}
                style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    paddingTop: 14, borderTop: `1px solid ${C.border}`,
                    flexWrap: 'wrap', gap: 8,
                }}
            >
                <span style={{ fontSize: 12, color: C.subtle }}>
                    {lastUpdated
                        ? <>Last updated:&nbsp;
                            <span style={{ fontFamily: 'monospace', color: C.muted }}>
                                {fmtTime(lastUpdated)}
                            </span>
                        </>
                        : 'Not yet refreshed'
                    }
                </span>
                <span style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 500 }}>
                    EduPortal Analytics · Phase B
                </span>
            </motion.div>
        </motion.div>
    );
};

export default InsightsDashboard;
