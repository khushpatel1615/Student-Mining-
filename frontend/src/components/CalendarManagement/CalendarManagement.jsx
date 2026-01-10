import { useState, useEffect } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { useAuth } from '../../context/AuthContext'
import { Plus, Calendar as CalendarIcon, X, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import './CalendarManagement.css'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

// Setup the localizer for react-big-calendar
const locales = {
    'en-US': enUS,
}

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
})

const DnDCalendar = withDragAndDrop(Calendar)

const CalendarManagement = ({ role: propRole }) => {
    const { user, token } = useAuth()
    const role = propRole || user?.role
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [programs, setPrograms] = useState([])
    const [mySubjects, setMySubjects] = useState([])

    // Modal State
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        event_date: new Date().toISOString().split('T')[0],
        type: 'event', // exam, holiday, deadline, event
        description: '',
        target_audience: 'all', // all, students, teachers, program, semester
        target_program_id: '',
        target_semester: '',
        target_subject_id: ''
    })
    const [submitting, setSubmitting] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [itemToDelete, setItemToDelete] = useState(null)

    useEffect(() => {
        fetchEvents()
        if (role === 'admin') fetchPrograms()
        if (role === 'teacher') fetchMySubjects()
    }, [role, token])

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

    const openModal = (event = null, initialDate = null) => {
        if (event) {
            // Edit Mode
            const isCreator = event.created_by == user?.id;
            if (role !== 'admin' && !isCreator) {
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
                event_date: initialDate || new Date().toISOString().split('T')[0],
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

    const triggerDelete = (id) => {
        setItemToDelete(id)
        setShowDeleteConfirm(true)
    }



    const onEventDrop = async ({ event, start }) => {
        // Permissions check
        const isCreator = event.created_by == user?.id
        if (role !== 'admin' && !isCreator) return

        const newDateStr = format(start, 'yyyy-MM-dd')

        // Optimistic Update
        setEvents(prev => prev.map(ev =>
            ev.id === event.id ? { ...ev, event_date: newDateStr } : ev
        ))

        try {
            const response = await fetch(`${API_BASE}/calendar.php`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: event.id,
                    event_date: newDateStr
                })
            })
            const data = await response.json()
            if (!data.success) {
                fetchEvents() // Revert on failure
                alert(data.error || 'Failed to move event')
            }
        } catch (err) {
            fetchEvents() // Revert
            alert('Error updating event date')
        }
    }

    // Event Styling for React Big Calendar
    const eventPropGetter = (event) => {
        const colors = {
            exam: '#ef4444',
            deadline: '#f59e0b',
            holiday: '#10b981',
            event: '#6366f1',
            assignment: '#8b5cf6'
        }

        const typeColor = colors[event.type] || '#6366f1'

        return {
            style: {
                backgroundColor: typeColor,
                borderRadius: '4px',
                opacity: 0.9,
                color: 'white',
                border: 'none',
                display: 'block',
                fontSize: '0.85rem'
            }
        }
    }

    if (loading) return <div className="p-4">Loading calendar...</div>

    return (
        <div className="calendar-management-container">
            <div className="calendar-header-actions" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CalendarIcon size={24} className="text-primary" />
                    <h2>Academic Calendar</h2>
                </div>

                {role !== 'student' && (
                    <button className="btn-primary" onClick={() => openModal()}>
                        <Plus size={18} /> Add Event
                    </button>
                )}
            </div>

            <div className="calendar-grid-wrapper" style={{ height: '700px', background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <DnDCalendar
                    localizer={localizer}
                    events={events.map(ev => ({
                        ...ev,
                        start: parse(ev.event_date, 'yyyy-MM-dd', new Date()),
                        end: parse(ev.event_date, 'yyyy-MM-dd', new Date()),
                        allDay: true
                    }))}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    onSelectEvent={(ev) => role !== 'student' && openModal(ev)}
                    onSelectSlot={(slotInfo) => {
                        if (role !== 'student') {
                            const dateStr = format(slotInfo.start, 'yyyy-MM-dd')
                            openModal(null, dateStr)
                        }
                    }}
                    selectable={role !== 'student'}
                    eventPropGetter={eventPropGetter}
                    views={['month']}
                    popup
                    onEventDrop={onEventDrop}
                    draggableAccessor={(event) => role === 'admin' || event.created_by == user?.id}
                    resizable={false}
                />
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
                                                                    target_program_id: '',
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
                                                                            target_audience: sem ? 'program_semester' : 'program'
                                                                        })
                                                                    }}
                                                                >
                                                                    <option value="">All Semesters</option>
                                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                                                        <option key={s} value={s}>Semester {s}</option>
                                                                    ))}
                                                                </select>
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
                                            {/* Delete Button (Only for Admin or Creator in Edit Mode) */}
                                            {selectedEvent && (role === 'admin' || selectedEvent.created_by == user?.id) && (
                                                <button
                                                    type="button"
                                                    className="btn-danger"
                                                    style={{ marginRight: 'auto', background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
                                                    onClick={() => triggerDelete(selectedEvent.id)}
                                                >
                                                    Delete
                                                </button>
                                            )}

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
