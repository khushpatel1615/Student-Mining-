import { API_BASE } from '../../../config';
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Save, Lock, User, Mail, Hash, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import './StudentProfile.css';



const StudentProfile = () => {
    const { user, token, setPassword } = useAuth(); // setPassword is for setting initial password, we might need manual fetch here
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        email: user?.email || '',
        student_id: user?.student_id || user?.user_id || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
    });

    const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null);

    // Update local state if user context updates
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                full_name: user.full_name,
                email: user.email,
                student_id: user.username || user.student_id || user.id
            }));
            setAvatarPreview(user.avatar_url);
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Helper to show messages
    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    };

    // Handle Profile Update (Name)
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/profile.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    full_name: formData.full_name
                })
            });
            const data = await res.json();
            if (data.success) {
                showMessage('success', 'Profile updated successfully');
                // Ideally refresh user context here, but for now just UI feedback
            } else {
                showMessage('error', data.error || 'Failed to update profile');
            }
        } catch (err) {
            showMessage('error', 'Connection failed');
        } finally {
            setLoading(false);
        }
    };

    // Handle Password Change
    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (formData.new_password !== formData.confirm_password) {
            showMessage('error', 'New passwords do not match');
            return;
        }
        if (formData.new_password.length < 6) {
            showMessage('error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/profile.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_password: formData.current_password,
                    new_password: formData.new_password
                })
            });
            const data = await res.json();
            if (data.success) {
                showMessage('success', 'Password changed successfully');
                setFormData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
            } else {
                showMessage('error', data.error || 'Failed to change password');
            }
        } catch (err) {
            showMessage('error', 'Connection failed');
        } finally {
            setLoading(false);
        }
    };

    // Handle Avatar Upload
    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => setAvatarPreview(reader.result);
        reader.readAsDataURL(file);

        // Upload
        const uploadData = new FormData();
        uploadData.append('avatar', file);

        try {
            const res = await fetch(`${API_BASE}/profile.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // No Content-Type for FormData, browser sets boundary
                },
                body: uploadData
            });
            const data = await res.json();
            if (data.success) {
                showMessage('success', 'Avatar updated!');
            } else {
                showMessage('error', data.error || 'Failed to upload avatar');
                setAvatarPreview(user?.avatar_url); // Revert
            }
        } catch (err) {
            showMessage('error', 'Upload failed');
        }
    };

    return (
        <div className="profile-container">
            {/* Header */}
            <div className="profile-header">
                <h1>My Profile</h1>
                <p>Manage your personal information and account security.</p>
            </div>

            {message.text && (
                <div className={`profile-message ${message.type}`}>
                    {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                    {message.text}
                </div>
            )}

            <div className="profile-grid">
                {/* Left Column: Avatar & Basic Info */}
                <div className="profile-card user-card-main">
                    <div className="avatar-section">
                        <div className="avatar-wrapper" onClick={() => fileInputRef.current.click()}>
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Profile" className="profile-avatar" />
                            ) : (
                                <div className="avatar-placeholder">
                                    {user?.full_name?.charAt(0) || 'U'}
                                </div>
                            )}
                            <div className="avatar-overlay">
                                <Camera size={24} />
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            hidden
                            accept="image/*"
                            onChange={handleAvatarChange}
                        />
                        <h2 className="profile-name">{user?.full_name}</h2>
                        <span className="profile-role">Student</span>
                    </div>

                    <div className="info-list">
                        <div className="info-item">
                            <Mail size={16} className="info-icon" />
                            <div className="info-content">
                                <label>Email Address</label>
                                <span>{user?.email}</span>
                            </div>
                        </div>
                        <div className="info-item">
                            <Hash size={16} className="info-icon" />
                            <div className="info-content">
                                <label>Student ID</label>
                                <span>{formData.student_id}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Forms */}
                <div className="profile-forms-wrapper">
                    {/* Personal Details Form */}
                    <div className="profile-card">
                        <div className="card-header">
                            <User size={20} />
                            <h3>Personal Details</h3>
                        </div>
                        <form onSubmit={handleUpdateProfile}>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className="profile-input"
                                    placeholder="Enter your full name"
                                />
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="save-btn" disabled={loading}>
                                    <Save size={18} />
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Security Form */}
                    <div className="profile-card">
                        <div className="card-header">
                            <Lock size={20} />
                            <h3>Security</h3>
                        </div>
                        <form onSubmit={handleChangePassword}>
                            <div className="form-group">
                                <label>Current Password</label>
                                <input
                                    type="password"
                                    name="current_password"
                                    value={formData.current_password}
                                    onChange={handleChange}
                                    className="profile-input"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        name="new_password"
                                        value={formData.new_password}
                                        onChange={handleChange}
                                        className="profile-input"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Confirm Password</label>
                                    <input
                                        type="password"
                                        name="confirm_password"
                                        value={formData.confirm_password}
                                        onChange={handleChange}
                                        className="profile-input"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="save-btn secondary" disabled={loading}>
                                    <Lock size={18} />
                                    Update Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentProfile;



