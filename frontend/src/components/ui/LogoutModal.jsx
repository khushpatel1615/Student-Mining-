import { useState } from 'react'
import './LogoutModal.css'

const LogoutIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
)

function LogoutModal({ isOpen, onConfirm, onCancel }) {
    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
                <div className="modal-icon">
                    <LogoutIcon />
                </div>
                <h2 className="modal-title">Sign Out?</h2>
                <p className="modal-message">
                    Are you sure you want to sign out of your account?
                </p>
                <div className="modal-actions">
                    <button className="modal-btn modal-btn-cancel" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="modal-btn modal-btn-confirm" onClick={onConfirm}>
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    )
}

export default LogoutModal
