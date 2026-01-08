import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, X, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import './CalendarManagement.css'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

const CalendarManagement = ({ role: propRole }) => {
    const { user, token } = useAuth()
    const role = propRole || user?.role
    const [currentDate, setCurrentDate] = useState(new Date())
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [programs, setPrograms] = useState([])

    // Modal State
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        event_date: new Date().toISOString().split('T')[0],
        type: 'event', // exam, holiday, deadline, event
        description: '',
        target_audience: 'all', // all, students, teachers, program, semester
        target_program_id: '',
        target_semester: ''
    })
    const [submitting, setSubmitting] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [itemToDelete, setItemToDelete] = useState(null)

    useEffect(() => {
        fetchEvents()
        if (role === 'admin') fetchPrograms()
        if (role === 'teacher') fetchMySubjects()
    }, [currentDate, role]) // Reload when date changes (if we paginate) or role changes

    const fetchEvents = async () => {
        try {
            const response = await fetch(`${API_BASE}/calendar.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setEvents(data.data)
            }
        } catch (err) {
            console.error('Failed to fetch events', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchPrograms = async () => {
        try {
            const res = await fetch(`${API_BASE}/programs.php`)
            const data = await res.json()
            if (data.success) setPrograms(data.data)
        } catch (e) {
            console.error(e)
        }
    }

    const fetchMySubjects = async () => {
        try {
            // Re-using teachers.php?id=... logic if possible, or just assume we have user.id
            // Ideally we need an endpoint to get "my subjects". 
            // We can use the existing /teachers.php endpoint if we know our own ID.
            if (user?.id) {
                const res = await fetch(`${API_BASE}/teachers.php?id=${user.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await res.json()
                if (data.success) {
                    setMySubjects(data.data.assigned_subjects || [])
                }
            }
        } catch (e) {
            console.error(e)
        }
    }

    const handleCreateOrUpdate = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        let payload = { ...formData }

        // Data Cleanup
        if (payload.target_audience === 'program') {
            payload.target_program_id = payload.target_program_id ? parseInt(payload.target_program_id) : null
            payload.target_semester = null;
        } else if (payload.target_audience === 'semester') {
            payload.target_semester = payload.target_semester ? parseInt(payload.target_semester) : null
            payload.target_program_id = null;
        } else if (payload.target_audience === 'subject') {
            // Ensure subject ID is integer
            payload.target_subject_id = payload.target_subject_id ? parseInt(payload.target_subject_id) : null;
        } else {
            payload.target_program_id = null;
            payload.target_semester = null;
            payload.target_subject_id = null;
        }

        const method = selectedEvent ? 'PUT' : 'POST';
        if (selectedEvent) payload.id = selectedEvent.id;

        try {
            const response = await fetch(`${API_BASE}/calendar.php`, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            const data = await response.json()
            if (data.success) {
                closeModal()
                fetchEvents()
            } else {
                alert(data.error || 'Operation failed')
            }
        } catch (err) {
            alert('Error connecting to server')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteClick = (id, e) => {
        e.stopPropagation()
        setItemToDelete(id)
        setShowDeleteConfirm(true)
    }

    const confirmDelete = async () => {
        if (!itemToDelete) return
        setSubmitting(true)
        try {
            const response = await fetch(`${API_BASE}/calendar.php?id=${itemToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                fetchEvents()
                if (selectedEvent && selectedEvent.id === itemToDelete) {
                    closeModal()
                }
                setShowDeleteConfirm(false)
                setItemToDelete(null)
            } else {
                alert(data.error || 'Failed to delete')
            }
        } catch (err) {
            alert('Error deleting event')
        } finally {
            setSubmitting(false)
        }
    }

    const openModal = (event = null) => {
        if (event) {
            // Edit Mode
            // Check permissions: Admin OR Creator
            const isCreator = event.created_by == user?.id; // loose equality for string/int
            if (role !== 'admin' && !isCreator) {
                // View Only Mode (or just alert)
                alert("You can only edit events you created.");
                return;
            }

            setSelectedEvent(event)
            setFormData({
                title: event.title,
                event_date: event.event_date,
                type: event.type,
                description: event.description || '',
                target_audience: event.target_audience,
                target_program_id: event.target_program_id || '',
                target_semester: event.target_semester || '',
                target_subject_id: event.target_subject_id || ''
            })
        } else {
            // Create Mode
            setSelectedEvent(null)
            setFormData({
                title: '',
                event_date: new Date().toISOString().split('T')[0],
                type: role === 'teacher' ? 'assignment' : 'event',
                description: '',
                target_audience: role === 'teacher' ? 'subject' : 'all',
                target_program_id: '',
                target_semester: '',
                target_subject_id: ''
            })
        }
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setSelectedEvent(null)
    }

    /* Rendering Helpers */
    const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

    const renderCalendarDays = () => {
        const daysInMonth = getDaysInMonth(currentDate)
        const firstDay = getFirstDayOfMonth(currentDate)
        const days = []

        // Empty slots
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day other-month"></div>)
        }

        // Days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            const dayEvents = events.filter(e => e.event_date === dateStr)
            const isToday = new Date().toISOString().split('T')[0] === dateStr

            days.push(
                <div
                    key={d}
                    className={`calendar-day ${isToday ? 'today' : ''}`}
                    onClick={() => {
                        // Creating new event on this date
                        if (role !== 'student' && !selectedEvent) {
                            setFormData(prev => ({ ...prev, event_date: dateStr }))
                            openModal()
                        }
                    }}
                >
                    <span className="day-number">{d}</span>
                    <div className="day-events">
                        {dayEvents.map(ev => (
                            <div
                                key={ev.id}
                                className={`event-pill type-${ev.type}`}
                                title={`${ev.title} (${ev.target_audience})`}
                                onClick={(e) => {
                                    e.stopPropagation(); // Don't trigger date click
                                    if (role !== 'student') openModal(ev);
                                }}
                            >
                                {ev.title}
                                {/* Show delete if Admin OR Creator */}
                                {(role === 'admin' || ev.created_by == user?.id) && (
                                    <span
                                        className="delete-event-btn"
                                        onClick={(e) => handleDeleteClick(ev.id, e)}
                                    >
                                        <Trash2 size={14} />
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )
        }
        return days
    }

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]

    return (
        <div className="calendar-management-container">
            <div className="calendar-header-actions">
                <h2>Academic Calendar</h2>
                <div className="calendar-controls">
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
                        <ChevronLeft size={20} />
                    </button>
                    <span className="current-month">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </span>
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
                        <ChevronRight size={20} />
                    </button>
                    {role !== 'student' && (
                        <button className="btn-primary" onClick={() => openModal()}>
                            <Plus size={18} /> Add Event
                        </button>
                    )}
                </div>
            </div>

            <div className="calendar-grid-header">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                    <div key={day} className="weekday-header">{day}</div>
                ))}
            </div>

            <div className="calendar-grid">
                {renderCalendarDays()}
            </div>

            {/* Event Modal */}
            {createPortal(
                <AnimatePresence>
                    {showModal && (
                        <div className="calendar-modal-portal">
                            <div className="modal-overlay" onClick={closeModal}>
                                <motion.div
                                    className="modal-content calendar-modal"
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.95, opacity: 0 }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className="modal-header">
                                        <h3>{selectedEvent ? 'Edit Event' : 'Add New Event'}</h3>
                                        <button className="close-btn" onClick={closeModal}>
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <form onSubmit={handleCreateOrUpdate}>
                                        <div className="form-group">
                                            <label>Event Title</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                required
                                                value={formData.title}
                                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                placeholder="e.g. Mid-Term Exam"
                                            />
                                        </div>

                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Date</label>
                                                <input
                                                    type="date"
                                                    className="form-input"
                                                    required
                                                    value={formData.event_date}
                                                    onChange={e => setFormData({ ...formData, event_date: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Type</label>
                                                <select
                                                    className="form-select"
                                                    value={formData.type}
                                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                                >
                                                    {role === 'admin' ? (
                                                        <>
                                                            <option value="event">Event</option>
                                                            <option value="exam">Exam</option>
                                                            <option value="holiday">Holiday</option>
                                                            <option value="deadline">Deadline</option>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <option value="assignment">Assignment</option>
                                                            <option value="event">Event</option>
                                                        </>
                                                    )}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>Description</label>
                                            <textarea
                                                className="form-textarea"
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                placeholder="Optional details..."
                                            />
                                        </div>

                                        {/* Dynamic Target Audience */}
                                        <div className="form-group">
                                            <label>Target Audience</label>

                                            {role === 'admin' ? (
                                                <div className="target-selection">
                                                    <div className="radio-group">
                                                        <label className="radio-label">
                                                            <input
                                                                type="radio"
                                                                name="target"
                                                                value="all"
                                                                checked={formData.target_audience === 'all'}
                                                                onChange={() => setFormData({
                                                                    ...formData,
                                                                    target_audience: 'all',
                                                                    target_program_id: '',
                                                                    target_semester: ''
                                                                })}
                                                            /> All Students
                                                        </label>
                                                        <label className="radio-label">
                                                            <input
                                                                type="radio"
                                                                name="target"
                                                                value="program"
                                                                checked={['program', 'program_semester', 'semester'].includes(formData.target_audience)}
                                                                onChange={() => setFormData({
                                                                    ...formData,
                                                                    target_audience: 'program',
                                                                    target_program_id: '', // Reset
                                                                    target_semester: ''
                                                                })}
                                                            /> Specific Program
                                                        </label>
                                                    </div>

                                                    {['program', 'program_semester', 'semester'].includes(formData.target_audience) && (
                                                        <div className="program-filters">
                                                            <div className="form-group">
                                                                <label className="label-small">Program / Department</label>
                                                                <select
                                                                    className="form-select"
                                                                    required
                                                                    value={formData.target_program_id}
                                                                    onChange={e => setFormData({ ...formData, target_program_id: e.target.value })}
                                                                >
                                                                    <option value="">Select Program</option>
                                                                    {programs.map(p => (
                                                                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            <div className="form-group">
                                                                <label className="label-small">Semester (Optional)</label>
                                                                <select
                                                                    className="form-select"
                                                                    value={formData.target_semester}
                                                                    onChange={e => {
                                                                        const sem = e.target.value;
                                                                        setFormData({
                                                                            ...formData,
                                                                            target_semester: sem,
                                                                            // Update audience type based on selection
                                                                            target_audience: sem ? 'program_semester' : 'program'
                                                                        })
                                                                    }}
                                                                >
                                                                    <option value="">All Semesters</option>
                                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                                                        <option key={s} value={s}>Semester {s}</option>
                                                                    ))}
                                                                </select>
                                                                <small className="helper-text">Leave "All Semesters" for the entire department</small>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="teacher-view">
                                                    {role === 'teacher' && (
                                                        <div className="form-group mt-2">
                                                            <label>Select Subject</label>
                                                            <select
                                                                className="form-select"
                                                                required
                                                                value={formData.target_subject_id}
                                                                onChange={e => setFormData({
                                                                    ...formData,
                                                                    target_audience: 'subject',
                                                                    target_subject_id: e.target.value
                                                                })}
                                                            >
                                                                <option value="">-- Choose Subject --</option>
                                                                {mySubjects.map(sub => (
                                                                    <option key={sub.id} value={sub.id}>
                                                                        {sub.name} ({sub.code})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="modal-actions">
                                            <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                                            <button type="submit" className="btn-primary" disabled={submitting}>
                                                {submitting ? 'Saving...' : (selectedEvent ? 'Update Event' : 'Add Event')}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            </div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {createPortal(
                <AnimatePresence>
                    {showDeleteConfirm && (
                        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                            <motion.div
                                className="modal-content"
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                onClick={e => e.stopPropagation()}
                                style={{ maxWidth: '400px', padding: '2rem', textAlign: 'center' }}
                            >
                                <div style={{ marginBottom: '1.5rem', color: '#ef4444' }}>
                                    <Trash2 size={48} style={{ margin: '0 auto', display: 'block' }} />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Delete Event?</h3>
                                <p style={{ color: '#4b5563', marginBottom: '2rem' }}>
                                    Are you sure you want to delete this event? This action cannot be undone.
                                </p>
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                    <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                                        Cancel
                                    </button>
                                    <button
                                        className="btn-primary"
                                        onClick={confirmDelete}
                                        style={{ background: '#ef4444', borderColor: '#ef4444' }}
                                        disabled={submitting}
                                    >
                                        {submitting ? 'Deleting...' : 'Delete Event'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    )
}

export default CalendarManagement
