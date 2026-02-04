import { API_BASE } from '../../config';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
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
    TrendingUp
} from 'lucide-react';
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
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    const [activeTab, setActiveTab] = useState('settings');
    const [message, setMessage] = useState(null);

    const fetchSettings = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/risk_alerts.php?action=settings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setSettings(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    }, [token]);

    const fetchHistory = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/risk_alerts.php?action=history&limit=20`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setHistory(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
        }
    }, [token]);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/risk_alerts.php?action=stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }, [token]);

    const fetchPreview = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/risk_alerts.php?action=preview`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setPreview(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch preview:', error);
        }
    }, [token]);

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
        setMessage(null);
        try {
            const sendRequest = async (method) => {
                const response = await fetch(`${API_BASE}/risk_alerts.php?action=settings`, {
                    method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(settings)
                });

                let data = null;
                let text = null;
                try {
                    data = await response.json();
                } catch {
                    data = null;
                    try {
                        text = await response.text();
                    } catch {
                        text = null;
                    }
                }

                return { response, data, text };
            };

            let result = null;
            try {
                result = await sendRequest('PUT');
            } catch {
                result = null;
            }

            if (!result || !result.response.ok) {
                try {
                    result = await sendRequest('POST');
                } catch {
                    result = null;
                }
            }

            if (result && result.data && result.data.success) {
                setMessage({ type: 'success', text: 'Settings saved successfully!' });
            } else {
                const errorText = result?.data?.error || result?.text;
                setMessage({
                    type: 'error',
                    text: errorText ? `Failed to save settings: ${errorText}` : 'Failed to save settings'
                });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save settings' });
        }
        setSaving(false);
    };

    const handleSendNow = async () => {
        setSending(true);
        setMessage(null);
        try {
            const response = await fetch(`${API_BASE}/risk_alerts.php?action=send`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setMessage({
                    type: 'success',
                    text: `Email sent! ${data.students_count} at-risk students notified to ${data.admins_notified} admin(s).`
                });
                fetchHistory();
                fetchStats();
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to send email' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to send email' });
        }
        setSending(false);
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

    if (loading) {
        return (
            <div className="risk-alert-settings">
                <div className="loading-container">
                    <RefreshCw className="spin" size={32} />
                    <p>Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="risk-alert-settings">
            <div className="page-header">
                <div className="header-content">
                    <div className="header-icon">
                        <Bell size={28} />
                    </div>
                    <div className="header-text">
                        <h1>Risk Alert Notifications</h1>
                        <p>Configure daily email alerts for at-risk students</p>
                    </div>
                </div>
                <button
                    className="btn-primary send-now-btn"
                    onClick={handleSendNow}
                    disabled={sending}
                >
                    {sending ? <RefreshCw className="spin" size={18} /> : <Send size={18} />}
                    {sending ? 'Sending...' : 'Send Alert Now'}
                </button>
            </div>

            {message && (
                <div className={`message-banner ${message.type}`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                    <span>{message.text}</span>
                    <button onClick={() => setMessage(null)}>×</button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon warning">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats?.current_at_risk_count || 0}</span>
                        <span className="stat-label">At-Risk Students</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success">
                        <Mail size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats?.total_alerts_sent || 0}</span>
                        <span className="stat-label">Total Alerts Sent</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon info">
                        <Calendar size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{formatDate(stats?.last_alert_sent)}</span>
                        <span className="stat-label">Last Alert Sent</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs-container">
                <div className="tabs">
                    <button
                        className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        <Settings size={18} />
                        Settings
                    </button>
                    <button
                        className={`tab ${activeTab === 'preview' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('preview'); fetchPreview(); }}
                    >
                        <Eye size={18} />
                        Preview
                    </button>
                    <button
                        className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        <History size={18} />
                        History
                    </button>
                </div>

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="tab-content settings-form">
                        <div className="form-section">
                            <h3>Notification Settings</h3>

                            <div className="form-group toggle-group">
                                <label className="toggle-label">
                                    <span>Enable Daily Email Alerts</span>
                                    <p className="help-text">Send automated emails to admins about at-risk students</p>
                                </label>
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        checked={settings.enabled}
                                        onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div className="form-group">
                                <label>
                                    <Clock size={16} />
                                    Send Time (Server Time)
                                </label>
                                <input
                                    type="time"
                                    value={settings.send_time}
                                    onChange={(e) => setSettings({ ...settings, send_time: e.target.value })}
                                />
                                <p className="help-text">Daily emails will be sent at this time</p>
                            </div>

                            <div className="form-group">
                                <label>
                                    <TrendingUp size={16} />
                                    Risk Score Threshold
                                </label>
                                <div className="range-input">
                                    <input
                                        type="range"
                                        min="20"
                                        max="80"
                                        value={settings.min_risk_score_threshold}
                                        onChange={(e) => setSettings({ ...settings, min_risk_score_threshold: parseInt(e.target.value) })}
                                    />
                                    <span className="range-value">{settings.min_risk_score_threshold}%</span>
                                </div>
                                <p className="help-text">Include students with risk score below this threshold</p>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Recipients</h3>

                            <div className="form-group">
                                <label>
                                    <Users size={16} />
                                    Email Recipients
                                </label>
                                <select
                                    value={settings.email_recipients}
                                    onChange={(e) => setSettings({ ...settings, email_recipients: e.target.value })}
                                >
                                    <option value="admins">All Admins</option>
                                    <option value="custom">Custom Emails</option>
                                </select>
                            </div>

                            {settings.email_recipients === 'custom' && (
                                <div className="form-group">
                                    <label>Custom Email Addresses</label>
                                    <textarea
                                        placeholder="Enter email addresses, one per line"
                                        value={settings.custom_emails}
                                        onChange={(e) => setSettings({ ...settings, custom_emails: e.target.value })}
                                        rows={3}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="form-actions">
                            <button
                                className="btn-primary"
                                onClick={handleSaveSettings}
                                disabled={saving}
                            >
                                {saving ? <RefreshCw className="spin" size={18} /> : <CheckCircle size={18} />}
                                {saving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Preview Tab */}
                {activeTab === 'preview' && (
                    <div className="tab-content preview-content">
                        <div className="preview-header">
                            <h3>Email Preview</h3>
                            <p>{preview?.count || 0} at-risk students will be included</p>
                        </div>

                        {preview?.students?.length > 0 ? (
                            <div className="preview-table">
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
                                                    <div className="student-info">
                                                        <span className="name">{student.full_name}</span>
                                                        <span className="id">{student.student_id}</span>
                                                    </div>
                                                </td>
                                                <td>{student.program_code || 'N/A'}</td>
                                                <td>
                                                    <span className={`risk-badge ${student.risk_score < 40 ? 'high' : 'medium'}`}>
                                                        {student.risk_score}%
                                                    </span>
                                                </td>
                                                <td className={student.attendance_score < 75 ? 'low' : ''}>
                                                    {student.attendance_score}%
                                                </td>
                                                <td className={student.grade_avg < 50 ? 'low' : ''}>
                                                    {student.grade_avg}%
                                                </td>
                                                <td>
                                                    <div className="factors">
                                                        {student.risk_factors?.slice(0, 2).map((factor, i) => (
                                                            <span key={i} className="factor-tag">{factor}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <CheckCircle size={48} />
                                <h4>No At-Risk Students</h4>
                                <p>Great news! There are currently no students flagged as at-risk.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                    <div className="tab-content history-content">
                        <div className="history-header">
                            <h3>Alert History</h3>
                            <button className="btn-secondary" onClick={fetchHistory}>
                                <RefreshCw size={16} />
                                Refresh
                            </button>
                        </div>

                        {history.length > 0 ? (
                            <div className="history-list">
                                {history.map((log) => (
                                    <div key={log.id} className={`history-item ${log.success ? 'success' : 'failed'}`}>
                                        <div className="history-icon">
                                            {log.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                        </div>
                                        <div className="history-details">
                                            <span className="history-title">
                                                {log.success ? 'Alert Sent Successfully' : 'Alert Failed'}
                                            </span>
                                            <span className="history-meta">
                                                {log.students_count} students • {log.admins_notified} admins
                                            </span>
                                            {log.error_message && (
                                                <span className="history-error">{log.error_message}</span>
                                            )}
                                        </div>
                                        <div className="history-time">
                                            {formatDate(log.sent_at)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <History size={48} />
                                <h4>No History Yet</h4>
                                <p>Alert history will appear here after emails are sent.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Cron Setup Info */}
            <div className="cron-info">
                <h4>📋 Automated Daily Emails Setup</h4>
                <p>To enable automatic daily emails, add the following cron job to your server:</p>
                <code>0 8 * * * php /path/to/StudentDataMining/backend/cron/send_risk_alerts.php</code>
                <p className="note">This will send emails every day at 8:00 AM server time.</p>
            </div>
        </div>
    );
};

export default RiskAlertSettings;
