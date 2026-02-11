import React from 'react';
import './StatCard.css'; // Placeholder

const StatCard = ({ label, value, icon, variant, subtitle, onClick, active }) => {
    return (
        <div
            className={`lba-stat-card lba-stat-${variant} ${active ? 'active-stat' : ''} ${onClick ? 'clickable-stat' : ''}`}
            onClick={onClick}
        >
            <div className="stat-icon">{icon}</div>
            <div className="stat-content">
                <span className="stat-value">{value}</span>
                <span className="stat-label">{label}</span>
                {subtitle && <span className="stat-subtitle">{subtitle}</span>}
            </div>
        </div>
    );
};

export default StatCard;
