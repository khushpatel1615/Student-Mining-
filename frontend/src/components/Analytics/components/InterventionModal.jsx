import React, { useState } from 'react';
import { X, XCircle, CheckCircle, Loader2 } from 'lucide-react';
import { API_BASE } from '../../../config';

const InterventionModal = ({ studentId, studentName, riskScore, riskFactors, token, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        student_id: studentId,
        intervention_type: 'email',
        title: '',
        description: '',
        notes: '',
        follow_up_date: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`${API_BASE}/behavior/interventions.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    triggered_by_risk_score: riskScore,
                    risk_factors: riskFactors
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to create intervention');
            }

            setSuccess('Intervention created successfully!');
            setTimeout(onSuccess, 1500);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
                className="modal-container modal-intervention"
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#fff',
                    borderRadius: '24px',
                    border: '2px solid #000',
                    padding: '0',
                    maxWidth: '500px',
                    width: '90%',
                    maxHeight: '90vh',
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
            >
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(to right, #4f46e5, #6366f1)',
                    padding: '24px',
                    color: '#fff',
                    textAlign: 'center',
                    position: 'relative'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            transition: 'background 0.2s'
                        }}
                    >
                        <X size={18} />
                    </button>

                    <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem', color: '#fff' }}>Create Intervention</h2>
                    <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>For {studentName}</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 90px)' }}>
                    <div className="modal-body" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                        {error && (
                            <div className="form-alert form-alert-error">
                                <XCircle size={18} />
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="form-alert form-alert-success">
                                <CheckCircle size={18} />
                                {success}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Intervention Type</label>
                            <select
                                value={formData.intervention_type}
                                onChange={(e) => setFormData({ ...formData, intervention_type: e.target.value })}
                            >
                                <option value="email">Email Outreach</option>
                                <option value="meeting">In-Person Meeting</option>
                                <option value="call">Phone Call</option>
                                <option value="warning">Academic Warning</option>
                                <option value="support_referral">Support Referral</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Title <span className="required">*</span></label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., Low Engagement Follow-up"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows="3"
                                placeholder="Describe the intervention plan and goals..."
                            />
                        </div>

                        <div className="form-group">
                            <label>Follow-up Date</label>
                            <input
                                type="date"
                                value={formData.follow_up_date}
                                onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="modal-footer" style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="spinning" size={18} />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={18} />
                                    Confirm Intervention
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InterventionModal;
