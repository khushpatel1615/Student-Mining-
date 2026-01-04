import { useState } from 'react'
import '../LogoutModal/LogoutModal.css' // Reusing base modal styles
import './QuickActionModals.css'
import toast from 'react-hot-toast'

export const ActionModal = ({ isOpen, onClose, title, children, actions }) => {
    if (!isOpen) return null
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container action-modal-container" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
                {actions && <div className="modal-actions">{actions}</div>}
            </div>
        </div>
    )
}

export const PostAnnouncementModal = ({ isOpen, onClose }) => {
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')

    const handleSubmit = () => {
        if (!title || !content) return toast.error('Please fill all fields')
        toast.success('Announcement Posted Successfully!')
        setTitle('')
        setContent('')
        onClose()
    }

    return (
        <ActionModal
            isOpen={isOpen}
            onClose={onClose}
            title="Post Announcement"
            actions={
                <>
                    <button className="modal-btn modal-btn-cancel" onClick={onClose}>Cancel</button>
                    <button className="modal-btn modal-btn-primary" onClick={handleSubmit}>Post</button>
                </>
            }
        >
            <div className="form-group">
                <label>Title</label>
                <input
                    type="text"
                    className="modal-input"
                    placeholder="e.g., Midterm Schedule"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Content</label>
                <textarea
                    className="modal-input modal-textarea"
                    placeholder="Write your announcement..."
                    value={content}
                    onChange={e => setContent(e.target.value)}
                />
            </div>
        </ActionModal>
    )
}

export const QuickGradeModal = ({ isOpen, onClose }) => {
    const [studentId, setStudentId] = useState('')
    const [grade, setGrade] = useState('')
    const [subject, setSubject] = useState('')

    const handleSubmit = () => {
        if (!studentId || !grade || !subject) return toast.error('Please fill all fields')
        toast.success(`Grade ${grade}% recorded for ${studentId}`)
        onClose()
    }

    return (
        <ActionModal
            isOpen={isOpen}
            onClose={onClose}
            title="Quick Grade Entry"
            actions={
                <>
                    <button className="modal-btn modal-btn-cancel" onClick={onClose}>Cancel</button>
                    <button className="modal-btn modal-btn-primary" onClick={handleSubmit}>Save Grade</button>
                </>
            }
        >
            <div className="form-group">
                <label>Student ID</label>
                <input
                    type="text"
                    className="modal-input"
                    placeholder="e.g., STU001"
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Subject</label>
                <select className="modal-input" value={subject} onChange={e => setSubject(e.target.value)}>
                    <option value="">Select Subject</option>
                    <option value="math">Mathematics</option>
                    <option value="cs">Computer Science</option>
                    <option value="eng">Engineering</option>
                </select>
            </div>
            <div className="form-group">
                <label>Grade (%)</label>
                <input
                    type="number"
                    className="modal-input"
                    placeholder="0-100"
                    min="0"
                    max="100"
                    value={grade}
                    onChange={e => setGrade(e.target.value)}
                />
            </div>
        </ActionModal>
    )
}

export const AttendanceModal = ({ isOpen, onClose }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [status, setStatus] = useState('present')

    const handleSubmit = () => {
        toast.success('Attendance Marked Successfully!')
        onClose()
    }

    return (
        <ActionModal
            isOpen={isOpen}
            onClose={onClose}
            title="Mark Attendance"
            actions={
                <>
                    <button className="modal-btn modal-btn-cancel" onClick={onClose}>Cancel</button>
                    <button className="modal-btn modal-btn-primary" onClick={handleSubmit}>Save</button>
                </>
            }
        >
            <div className="form-group">
                <label>Date</label>
                <input
                    type="date"
                    className="modal-input"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Status</label>
                <select className="modal-input" value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="present">All Present</option>
                    <option value="absent">Select Absentees</option>
                </select>
            </div>
            <p className="modal-hint">Quickly mark attendance for your active class.</p>
        </ActionModal>
    )
}

export const ContactAdvisorModal = ({ isOpen, onClose }) => {
    const [message, setMessage] = useState('')

    const handleSubmit = () => {
        if (!message) return toast.error('Please enter a message')
        toast.success('Message sent to Advisor!')
        setMessage('')
        onClose()
    }

    return (
        <ActionModal
            isOpen={isOpen}
            onClose={onClose}
            title="Contact Advisor"
            actions={
                <>
                    <button className="modal-btn modal-btn-cancel" onClick={onClose}>Cancel</button>
                    <button className="modal-btn modal-btn-primary" onClick={handleSubmit}>Send</button>
                </>
            }
        >
            <div className="form-group">
                <label>Message</label>
                <textarea
                    className="modal-input modal-textarea"
                    placeholder="Type your message here..."
                    rows="4"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                />
            </div>
        </ActionModal>
    )
}

export const ReportModal = ({ isOpen, onClose }) => {
    const [type, setType] = useState('transcript')

    const handleSubmit = () => {
        toast.success(`Generating ${type} report...`)
        // In real app, trigger download
        setTimeout(() => {
            toast.success('Download ready!')
            onClose()
        }, 1500)
    }

    return (
        <ActionModal
            isOpen={isOpen}
            onClose={onClose}
            title="Download Report"
            actions={
                <>
                    <button className="modal-btn modal-btn-cancel" onClick={onClose}>Cancel</button>
                    <button className="modal-btn modal-btn-primary" onClick={handleSubmit}>Generate PDF</button>
                </>
            }
        >
            <div className="form-group">
                <label>Report Type</label>
                <select className="modal-input" value={type} onChange={e => setType(e.target.value)}>
                    <option value="transcript">Official Transcript</option>
                    <option value="attendance">Attendance Record</option>
                    <option value="financial">Financial Statement</option>
                </select>
            </div>
        </ActionModal>
    )
}
