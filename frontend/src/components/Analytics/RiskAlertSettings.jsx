import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Bell,
    Mail,
    Clock,
    Settings,
    Send,
    History,
    AlertTriangle,
    CheckCircle,
    XCircle,
    RefreshCw,
    Eye,
    Calendar,
    Users,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    Copy,
    Plus,
    X,
    Shield,
    Zap,
    Activity,
    Info
} from 'lucide-react';

import apiClient from '../../utils/apiClient';
import { useAuth } from '../../context/AuthContext';

import './RiskAlertSettings.css';

const RiskAlertSettings = () => {
    const { token } = useAuth();
    const [settings, setSettings] = useState({
        enabled: true,
        min_risk_score_threshold: 50,
        send_time: '08:00',
        include_star_students: false,
        email_recipients: 'admins',
        custom_emails: ''
    });
    const [initialSettings, setInitialSettings] = useState(null);
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    const [activeTab, setActiveTab] = useState('settings');
    const [toasts, setToasts] = useState([]);
    const [showConfirmSend, setShowConfirmSend] = useState(false);
    const [showIntegration, setShowIntegration] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [copiedCode, setCopiedCode] = useState(false);
    const toastIdRef = useRef(0);

    // Track unsaved changes
    const hasUnsavedChanges = initialSettings && JSON.stringify(settings) !== JSON.stringify(initialSettings);

    // Parse custom emails into array for chip display
    const customEmailsList = settings.custom_emails
        ? settings.custom_emails.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean)
        : [];

    const addToast = (type, text) => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev, { id, type, text }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const fetchSettings = useCallback(async () => {
        try {
            const data = await apiClient.get('/risk_alerts.php', { action: 'settings' });
            if (data.success) {
                setSettings(data.data);
                setInitialSettings(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            const data = await apiClient.get('/risk_alerts.php', { action: 'history', limit: 20 });
            if (data.success) {
                setHistory(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const data = await apiClient.get('/risk_alerts.php', { action: 'stats' });
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }, []);

    const fetchPreview = useCallback(async () => {
        try {
            const data = await apiClient.get('/risk_alerts.php', { action: 'preview' });
            if (data.success) {
                setPreview(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch preview:', error);
        }
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchSettings(), fetchHistory(), fetchStats()]);
            setLoading(false);
        };
        loadData();
    }, [fetchSettings, fetchHistory, fetchStats]);

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            let data = null;
            try {
                data = await apiClient.put('/risk_alerts.php?action=settings', settings);
            } catch {
                try {
                    data = await apiClient.post('/risk_alerts.php?action=settings', settings);
                } catch {
                    data = null;
                }
            }

            if (data && data.success) {
                setInitialSettings({ ...settings });
                addToast('success', `Settings saved successfully. Daily alerts will be sent to ${settings.email_recipients === 'admins' ? 'all administrators' : customEmailsList.length + ' recipient(s)'} at ${formatTime(settings.send_time)} for students with risk score ≤ ${settings.min_risk_score_threshold}%.`);
            } else {
                addToast('error', data?.error ? `Failed to save: ${data.error}` : 'Failed to save settings. Please try again.');
            }
        } catch (error) {
            addToast('error', 'Failed to save settings. Please check your connection.');
        }
        setSaving(false);
    };

    const handleSendNow = async () => {
        setShowConfirmSend(false);
        setSending(true);
        try {
            const data = await apiClient.post('/risk_alerts.php?action=send', {});
            if (data.success) {
                addToast('success', `Alert sent successfully! ${data.students_count} at-risk student(s) reported to ${data.admins_notified} recipient(s).`);
                fetchHistory();
                fetchStats();
            } else {
                addToast('error', data.error || 'Failed to send alert email.');
            }
        } catch (error) {
            addToast('error', 'Failed to send alert. Please check your connection.');
        }
        setSending(false);
    };

    const handleAddEmail = () => {
        const email = emailInput.trim();
        if (!email) return;
        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            addToast('error', 'Please enter a valid email address.');
            return;
        }
        if (customEmailsList.includes(email)) {
            addToast('error', 'This email address is already added.');
            return;
        }
        const newList = [...customEmailsList, email];
        setSettings({ ...settings, custom_emails: newList.join('\n') });
        setEmailInput('');
    };

    const handleRemoveEmail = (emailToRemove) => {
        const newList = customEmailsList.filter(e => e !== emailToRemove);
        setSettings({ ...settings, custom_emails: newList.join('\n') });
    };

    const handleEmailInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddEmail();
        }
    };

    const handleCopyCode = async () => {
        const code = '0 8 * * * php /path/to/StudentDataMining/backend/cron/send_risk_alerts.php';
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
        } catch {
            // Fallback
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${m} ${ampm}`;
    };

    const getRiskLabel = (value) => {
        if (value <= 30) return { text: 'Low Risk', className: 'low' };
        if (value <= 60) return { text: 'Medium Risk', className: 'medium' };
        return { text: 'High Risk', className: 'high' };
    };

    const handleCancelChanges = () => {
        if (initialSettings) {
            setSettings({ ...initialSettings });
        }
    };

    if (loading) {
        return (
            <div className="ras">
                <div className="ras-loading">
                    <div className="ras-loading__spinner">
                        <RefreshCw className="spin" size={32} />
                    </div>
                    <p>Loading alert configuration...</p>
                </div>
            </div>
        );
    }

    const riskLabel = getRiskLabel(settings.min_risk_score_threshold);

    return (
        <div className="ras">
            {/* Toast Notifications */}
            <div className="ras-toasts" aria-live="polite">
                {toasts.map(toast => (
                    <div key={toast.id} className={`ras-toast ras-toast--${toast.type}`}>
                        <div className="ras-toast__icon">
                            {toast.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                        </div>
                        <span className="ras-toast__text">{toast.text}</span>
                        <button className="ras-toast__close" onClick={() => removeToast(toast.id)} aria-label="Dismiss notification">
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Confirmation Dialog */}
            {showConfirmSend && (
                <div className="ras-overlay" onClick={() => setShowConfirmSend(false)}>
                    <div className="ras-confirm" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
                        <div className="ras-confirm__icon">
                            <Send size={24} />
                        </div>
                        <h3 id="confirm-title">Send Alert Now?</h3>
                        <p>
                            This will immediately send an alert email to{' '}
                            {settings.email_recipients === 'admins'
                                ? 'all administrators'
                                : `${customEmailsList.length} custom recipient(s)`
                            }{' '}
                            about {stats?.current_at_risk_count || 0} at-risk student(s).
                        </p>
                        <div className="ras-confirm__actions">
                            <button className="ras-btn ras-btn--ghost" onClick={() => setShowConfirmSend(false)}>
                                Cancel
                            </button>
                            <button className="ras-btn ras-btn--danger" onClick={handleSendNow}>
                                <Send size={16} />
                                Send Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── HEADER ── */}
            <header className="ras-header">
                <div className="ras-header__left">
                    <div className="ras-header__icon">
                        <Shield size={26} />
                    </div>
                    <div className="ras-header__text">
                        <h1>Risk Alert Configuration</h1>
                        <p>Configure how and when to alert administrators of at-risk students</p>
                    </div>
                </div>
                <div className="ras-header__right">
                    <div className={`ras-status-badge ${settings.enabled ? 'ras-status-badge--active' : 'ras-status-badge--inactive'}`}>
                        <span className="ras-status-badge__dot"></span>
                        {settings.enabled ? 'Alerts Active' : 'Alerts Inactive'}
                    </div>
                </div>
            </header>

            {/* Unsaved changes banner */}
            {hasUnsavedChanges && (
                <div className="ras-unsaved-banner" role="alert">
                    <Info size={16} />
                    <span>You have unsaved changes</span>
                    <div className="ras-unsaved-banner__actions">
                        <button className="ras-btn ras-btn--ghost ras-btn--sm" onClick={handleCancelChanges}>Discard</button>
                        <button className="ras-btn ras-btn--primary ras-btn--sm" onClick={handleSaveSettings} disabled={saving}>
                            {saving ? <RefreshCw className="spin" size={14} /> : <CheckCircle size={14} />}
                            Save
                        </button>
                    </div>
                </div>
            )}

            {/* ── KEY METRICS ── */}
            <section className="ras-metrics" aria-label="Key Metrics">
                <div className="ras-metric-card ras-metric-card--warning">
                    <div className="ras-metric-card__icon">
                        <AlertTriangle size={22} />
                    </div>
                    <div className="ras-metric-card__body">
                        <span className="ras-metric-card__label">At-Risk Students</span>
                        <span className="ras-metric-card__value">{stats?.current_at_risk_count || 0} <small>students</small></span>
                        <span className="ras-metric-card__desc">Scoring below {settings.min_risk_score_threshold}% threshold</span>
                    </div>
                </div>
                <div className="ras-metric-card ras-metric-card--emerald">
                    <div className="ras-metric-card__icon">
                        <Mail size={22} />
                    </div>
                    <div className="ras-metric-card__body">
                        <span className="ras-metric-card__label">Total Alerts Sent</span>
                        <span className="ras-metric-card__value">{stats?.total_alerts_sent || 0} <small>this month</small></span>
                        <span className="ras-metric-card__desc ras-metric-card__desc--link" onClick={() => setShowHistory(true)} tabIndex={0} role="button">View history →</span>
                    </div>
                </div>
                <div className="ras-metric-card ras-metric-card--blue">
                    <div className="ras-metric-card__icon">
                        <Calendar size={22} />
                    </div>
                    <div className="ras-metric-card__body">
                        <span className="ras-metric-card__label">Last Alert Sent</span>
                        <span className="ras-metric-card__value ras-metric-card__value--date">{formatDate(stats?.last_alert_sent)}</span>
                        <span className="ras-metric-card__desc">To {settings.email_recipients === 'admins' ? 'admin recipients' : `${customEmailsList.length} recipient(s)`}</span>
                    </div>
                </div>
            </section>

            {/* ── QUICK ACTIONS ── */}
            <section className="ras-quick-actions" aria-label="Quick Actions">
                <button
                    className="ras-btn ras-btn--danger ras-btn--icon"
                    onClick={() => setShowConfirmSend(true)}
                    disabled={sending}
                    id="send-alert-now-btn"
                >
                    {sending ? <RefreshCw className="spin" size={16} /> : <Send size={16} />}
                    {sending ? 'Sending...' : 'Send Alert Now'}
                </button>
                <button
                    className="ras-btn ras-btn--outline ras-btn--icon"
                    onClick={() => { setActiveTab('preview'); fetchPreview(); }}
                    id="preview-alert-btn"
                >
                    <Eye size={16} />
                    Preview Alert Email
                </button>
                <button
                    className="ras-btn ras-btn--outline ras-btn--icon"
                    onClick={() => { setShowHistory(!showHistory); setActiveTab('history'); }}
                    id="view-history-btn"
                >
                    <History size={16} />
                    View History
                </button>
            </section>

            {/* ── MAIN CONFIGURATION ── */}
            <section className="ras-config" aria-label="Alert Configuration">
                <div className="ras-config__header">
                    <div className="ras-config__tabs" role="tablist">
                        <button
                            className={`ras-config__tab ${activeTab === 'settings' ? 'ras-config__tab--active' : ''}`}
                            onClick={() => setActiveTab('settings')}
                            role="tab"
                            aria-selected={activeTab === 'settings'}
                            id="tab-settings"
                        >
                            <Settings size={16} />
                            Configuration
                        </button>
                        <button
                            className={`ras-config__tab ${activeTab === 'preview' ? 'ras-config__tab--active' : ''}`}
                            onClick={() => { setActiveTab('preview'); fetchPreview(); }}
                            role="tab"
                            aria-selected={activeTab === 'preview'}
                            id="tab-preview"
                        >
                            <Eye size={16} />
                            Preview
                        </button>
                        <button
                            className={`ras-config__tab ${activeTab === 'history' ? 'ras-config__tab--active' : ''}`}
                            onClick={() => setActiveTab('history')}
                            role="tab"
                            aria-selected={activeTab === 'history'}
                            id="tab-history"
                        >
                            <History size={16} />
                            History
                        </button>
                    </div>
                </div>

                {/* ── Settings Tab ── */}
                {activeTab === 'settings' && (
                    <div className="ras-config__body" role="tabpanel" aria-labelledby="tab-settings">
                        {/* Alert Status */}
                        <div className="ras-section">
                            <div className="ras-section__header">
                                <Zap size={18} />
                                <h3>Alert Status</h3>
                            </div>
                            <div className={`ras-toggle-card ${settings.enabled ? 'ras-toggle-card--active' : ''}`}>
                                <div className="ras-toggle-card__content">
                                    <div className="ras-toggle-card__icon">
                                        {settings.enabled ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                    </div>
                                    <div className="ras-toggle-card__text">
                                        <span className="ras-toggle-card__title">Enable Daily Email Alerts</span>
                                        <span className="ras-toggle-card__desc">Automatically notify administrators of at-risk students daily</span>
                                    </div>
                                </div>
                                <label className="ras-switch" aria-label="Toggle daily email alerts">
                                    <input
                                        type="checkbox"
                                        checked={settings.enabled}
                                        onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                                        id="enable-alerts-toggle"
                                    />
                                    <span className="ras-switch__track">
                                        <span className="ras-switch__thumb"></span>
                                    </span>
                                    <span className="ras-switch__label">{settings.enabled ? 'ON' : 'OFF'}</span>
                                </label>
                            </div>
                        </div>

                        {/* Schedule */}
                        <div className="ras-section">
                            <div className="ras-section__header">
                                <Clock size={18} />
                                <h3>Schedule</h3>
                            </div>
                            <div className="ras-form-row">
                                <div className="ras-field">
                                    <label htmlFor="send-time-input" className="ras-field__label">
                                        Send Time
                                    </label>
                                    <div className="ras-field__input-wrapper">
                                        <Clock size={16} className="ras-field__icon" />
                                        <input
                                            type="time"
                                            id="send-time-input"
                                            value={settings.send_time}
                                            onChange={(e) => setSettings({ ...settings, send_time: e.target.value })}
                                            className="ras-field__input"
                                        />
                                    </div>
                                    <span className="ras-field__help">
                                        Send alerts at {formatTime(settings.send_time)} daily (Server time)
                                    </span>
                                </div>
                                <div className="ras-field">
                                    <label className="ras-field__label">Frequency</label>
                                    <div className="ras-field__input-wrapper">
                                        <RefreshCw size={16} className="ras-field__icon" />
                                        <select className="ras-field__input" defaultValue="daily" id="frequency-select">
                                            <option value="daily">Daily</option>
                                        </select>
                                    </div>
                                    <span className="ras-field__help">Alerts are sent once per day</span>
                                </div>
                            </div>
                        </div>

                        {/* Risk Threshold */}
                        <div className="ras-section">
                            <div className="ras-section__header">
                                <Activity size={18} />
                                <h3>Risk Threshold</h3>
                            </div>
                            <div className="ras-threshold">
                                <div className="ras-threshold__display">
                                    <span className="ras-threshold__label">Alert when risk score is at or below:</span>
                                    <span className={`ras-threshold__value ras-threshold__value--${riskLabel.className}`}>
                                        {settings.min_risk_score_threshold}%
                                    </span>
                                </div>
                                <div className="ras-threshold__slider-wrap">
                                    <input
                                        type="range"
                                        min="20"
                                        max="80"
                                        value={settings.min_risk_score_threshold}
                                        onChange={(e) => setSettings({ ...settings, min_risk_score_threshold: parseInt(e.target.value) })}
                                        className="ras-threshold__slider"
                                        id="risk-threshold-slider"
                                        aria-label="Risk score threshold"
                                    />
                                    <div className="ras-threshold__labels">
                                        <span className="ras-threshold__range-label ras-threshold__range-label--low">Low Risk (20)</span>
                                        <span className="ras-threshold__range-label ras-threshold__range-label--med">Medium (50)</span>
                                        <span className="ras-threshold__range-label ras-threshold__range-label--high">High Risk (80)</span>
                                    </div>
                                </div>
                                <p className="ras-field__help" style={{ marginTop: '8px' }}>
                                    Students scoring at or below this threshold will trigger alert notifications
                                </p>
                            </div>
                        </div>

                        {/* Recipients */}
                        <div className="ras-section">
                            <div className="ras-section__header">
                                <Users size={18} />
                                <h3>Recipients</h3>
                            </div>
                            <div className="ras-field" style={{ marginBottom: '16px' }}>
                                <label htmlFor="recipients-select" className="ras-field__label">Email Recipients</label>
                                <div className="ras-field__input-wrapper">
                                    <Users size={16} className="ras-field__icon" />
                                    <select
                                        id="recipients-select"
                                        className="ras-field__input"
                                        value={settings.email_recipients}
                                        onChange={(e) => setSettings({ ...settings, email_recipients: e.target.value })}
                                    >
                                        <option value="admins">All Administrators</option>
                                        <option value="custom">Custom Recipients</option>
                                    </select>
                                </div>
                            </div>

                            {settings.email_recipients === 'custom' && (
                                <div className="ras-recipients">
                                    <label className="ras-field__label">Additional Recipients</label>
                                    {customEmailsList.length > 0 && (
                                        <div className="ras-email-chips">
                                            {customEmailsList.map((email, i) => (
                                                <span key={i} className="ras-email-chip">
                                                    <Mail size={12} />
                                                    {email}
                                                    <button
                                                        className="ras-email-chip__remove"
                                                        onClick={() => handleRemoveEmail(email)}
                                                        aria-label={`Remove ${email}`}
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="ras-email-add">
                                        <div className="ras-field__input-wrapper">
                                            <Mail size={16} className="ras-field__icon" />
                                            <input
                                                type="email"
                                                className="ras-field__input"
                                                placeholder="Enter email address..."
                                                value={emailInput}
                                                onChange={(e) => setEmailInput(e.target.value)}
                                                onKeyDown={handleEmailInputKeyDown}
                                                id="add-email-input"
                                            />
                                        </div>
                                        <button className="ras-btn ras-btn--primary ras-btn--sm" onClick={handleAddEmail} id="add-email-btn">
                                            <Plus size={14} />
                                            Add
                                        </button>
                                    </div>
                                    <span className="ras-field__help">Press Enter or click Add to add an email address</span>
                                </div>
                            )}
                        </div>

                        {/* Save Actions */}
                        <div className="ras-config__footer">
                            <button
                                className="ras-btn ras-btn--primary ras-btn--lg"
                                onClick={handleSaveSettings}
                                disabled={saving || !hasUnsavedChanges}
                                id="save-settings-btn"
                            >
                                {saving ? (
                                    <>
                                        <RefreshCw className="spin" size={18} />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={18} />
                                        Save Settings
                                    </>
                                )}
                            </button>
                            {hasUnsavedChanges && (
                                <button className="ras-btn ras-btn--ghost" onClick={handleCancelChanges} id="cancel-changes-btn">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Preview Tab ── */}
                {activeTab === 'preview' && (
                    <div className="ras-config__body" role="tabpanel" aria-labelledby="tab-preview">
                        <div className="ras-preview-header">
                            <div>
                                <h3>Email Preview</h3>
                                <p>{preview?.count || 0} at-risk students will be included in the next alert</p>
                            </div>
                            <button className="ras-btn ras-btn--outline ras-btn--sm" onClick={fetchPreview}>
                                <RefreshCw size={14} />
                                Refresh
                            </button>
                        </div>

                        {preview?.students?.length > 0 ? (
                            <div className="ras-preview-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Program</th>
                                            <th>Risk Score</th>
                                            <th>Attendance</th>
                                            <th>Grade Avg</th>
                                            <th>Risk Factors</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.students.map((student) => (
                                            <tr key={student.id}>
                                                <td>
                                                    <div className="ras-student-info">
                                                        <span className="ras-student-info__name">{student.full_name}</span>
                                                        <span className="ras-student-info__id">{student.student_id}</span>
                                                    </div>
                                                </td>
                                                <td>{student.program_code || 'N/A'}</td>
                                                <td>
                                                    <span className={`ras-risk-badge ras-risk-badge--${student.risk_score < 40 ? 'high' : 'medium'}`}>
                                                        {student.risk_score}%
                                                    </span>
                                                </td>
                                                <td className={student.attendance_score < 75 ? 'ras-td--low' : ''}>
                                                    {student.attendance_score}%
                                                </td>
                                                <td className={student.grade_avg < 50 ? 'ras-td--low' : ''}>
                                                    {student.grade_avg}%
                                                </td>
                                                <td>
                                                    <div className="ras-factors">
                                                        {student.risk_factors?.slice(0, 2).map((factor, i) => (
                                                            <span key={i} className="ras-factor-tag">{factor}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="ras-empty">
                                <CheckCircle size={48} />
                                <h4>No At-Risk Students</h4>
                                <p>Great news! There are currently no students flagged as at-risk based on the current threshold.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── History Tab ── */}
                {activeTab === 'history' && (
                    <div className="ras-config__body" role="tabpanel" aria-labelledby="tab-history">
                        <div className="ras-history-top">
                            <h3>Alert History</h3>
                            <button className="ras-btn ras-btn--outline ras-btn--sm" onClick={fetchHistory}>
                                <RefreshCw size={14} />
                                Refresh
                            </button>
                        </div>

                        {history.length > 0 ? (
                            <div className="ras-history-list">
                                {history.map((log) => (
                                    <div key={log.id} className={`ras-history-item ${log.success ? 'ras-history-item--ok' : 'ras-history-item--fail'}`}>
                                        <div className="ras-history-item__icon">
                                            {log.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                        </div>
                                        <div className="ras-history-item__body">
                                            <span className="ras-history-item__title">
                                                {log.success ? 'Alert Sent Successfully' : 'Alert Failed'}
                                            </span>
                                            <span className="ras-history-item__meta">
                                                {log.students_count} student(s) • {log.admins_notified} recipient(s)
                                            </span>
                                            {log.error_message && (
                                                <span className="ras-history-item__error">{log.error_message}</span>
                                            )}
                                        </div>
                                        <div className="ras-history-item__time">
                                            {formatDate(log.sent_at)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="ras-empty">
                                <History size={48} />
                                <h4>No History Yet</h4>
                                <p>Alert history will appear here after emails are sent.</p>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* ── EMAIL INTEGRATION SETUP (Collapsible) ── */}
            <section className="ras-collapsible">
                <button
                    className="ras-collapsible__trigger"
                    onClick={() => setShowIntegration(!showIntegration)}
                    aria-expanded={showIntegration}
                    id="toggle-integration-btn"
                >
                    <div className="ras-collapsible__trigger-left">
                        <Settings size={18} />
                        <span>Email Integration Setup</span>
                    </div>
                    {showIntegration ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {showIntegration && (
                    <div className="ras-collapsible__content">
                        <p className="ras-collapsible__desc">Configure your server to automatically send daily alert emails using the cron job below.</p>
                        <div className="ras-code-block">
                            <code>0 8 * * * php /path/to/StudentDataMining/backend/cron/send_risk_alerts.php</code>
                            <button
                                className="ras-code-block__copy"
                                onClick={handleCopyCode}
                                aria-label="Copy command"
                                id="copy-cron-btn"
                            >
                                {copiedCode ? <CheckCircle size={14} /> : <Copy size={14} />}
                                {copiedCode ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <p className="ras-field__help">This cron job runs every day at 8:00 AM server time. Adjust the schedule to match your preferred send time.</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default RiskAlertSettings;
