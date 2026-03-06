import { useEffect, useState } from 'react'
import './LoadingScreen.css'

export default function LoadingScreen() {
    const [progress, setProgress] = useState(0)
    const [statusText, setStatusText] = useState('Initializing…')

    useEffect(() => {
        // Animate the progress bar and status messages
        const steps = [
            { at: 0, pct: 0, text: 'Initializing…' },
            { at: 300, pct: 25, text: 'Loading resources…' },
            { at: 700, pct: 55, text: 'Verifying session…' },
            { at: 1100, pct: 80, text: 'Preparing dashboard…' },
            { at: 1500, pct: 95, text: 'Almost ready…' },
        ]

        const timers = steps.map(({ at, pct, text }) =>
            setTimeout(() => {
                setProgress(pct)
                setStatusText(text)
            }, at)
        )

        return () => timers.forEach(clearTimeout)
    }, [])

    return (
        <div className="ls-overlay">
            {/* Animated background blobs */}
            <div className="ls-blob ls-blob-1" />
            <div className="ls-blob ls-blob-2" />
            <div className="ls-blob ls-blob-3" />

            <div className="ls-card">
                {/* Logo / Brand */}
                <div className="ls-logo-wrap">
                    <div className="ls-logo-ring" />
                    <div className="ls-logo-inner">
                        <svg viewBox="0 0 24 24" fill="none" className="ls-logo-icon">
                            <path
                                d="M12 3L2 8.5v7L12 21l10-5.5v-7L12 3z"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M2 8.5L12 14l10-5.5"
                                stroke="currentColor"
                                strokeWidth="1.8"
                            />
                            <line
                                x1="12" y1="14"
                                x2="12" y2="21"
                                stroke="currentColor"
                                strokeWidth="1.8"
                            />
                        </svg>
                    </div>
                </div>

                {/* Brand name */}
                <h1 className="ls-title">EduPortal</h1>
                <p className="ls-subtitle">Student Data Intelligence Platform</p>

                {/* Progress bar */}
                <div className="ls-progress-track">
                    <div
                        className="ls-progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Status text */}
                <p className="ls-status">{statusText}</p>

                {/* Dots indicator */}
                <div className="ls-dots">
                    <span className="ls-dot" style={{ animationDelay: '0s' }} />
                    <span className="ls-dot" style={{ animationDelay: '0.2s' }} />
                    <span className="ls-dot" style={{ animationDelay: '0.4s' }} />
                </div>
            </div>
        </div>
    )
}
