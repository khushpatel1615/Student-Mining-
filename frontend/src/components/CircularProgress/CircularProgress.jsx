import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import './CircularProgress.css';

const CircularProgress = ({
    value,
    maxValue = 100,
    size = 48,
    strokeWidth = 8,
    color = '#6366f1',
    trailColor = '#e2e8f0',
    showValue = true,
    label = '',
    animated = true
}) => {
    const percentage = (value / maxValue) * 100;

    return (
        <div className="circular-progress-wrapper" style={{ width: size, height: size }}>
            <CircularProgressbar
                value={percentage}
                styles={buildStyles({
                    pathColor: color,
                    trailColor: trailColor,
                    pathTransitionDuration: animated ? 0.8 : 0,
                    strokeLinecap: 'round',
                })}
                strokeWidth={strokeWidth}
            />
            {showValue && (
                <div className="progress-value">
                    <span className="value">{typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 2) : value}</span>
                    {label && <span className="label">{label}</span>}
                </div>
            )}
        </div>
    );
};

export default CircularProgress;
