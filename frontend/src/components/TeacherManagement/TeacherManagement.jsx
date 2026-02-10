import { useState, useEffect } from 'react'

import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext'
import EmptyState from '../EmptyState/EmptyState'
import './TeacherManagement.css'



// Icons
const UserIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
)

const PlusIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
)

const XIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
)

const UserPlusIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
)

function TeacherManagement() {
    const { token } = useAuth()
    const [teachers, setTeachers] = useState([])
    const [subjects, setSubjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [successMessage, setSuccessMessage] = useState(null)

    // Modal states
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [showAddTeacherModal, setShowAddTeacherModal] = useState(false)
    const [selectedTeacher, setSelectedTeacher] = useState(null)
    const [selectedSubject, setSelectedSubject] = useState('')
    const [selectedSemester, setSelectedSemester] = useState('')

    // New teacher form state
    const [newTeacher, setNewTeacher] = useState({ email: '', full_name: '' })
    const [addingTeacher, setAddingTeacher] = useState(false)

    useEffect(() => {
        fetchTeachers()
        fetchSubjects()
    }, [])

    // Auto-clear messages after 5 seconds
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 5000)
            return () => clearTimeout(timer)
        }
    }, [successMessage])

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000)
            return () => clearTimeout(timer)
        }
    }, [error])

    const fetchTeachers = async () => {
        try {
            setError(null)
            const response = await fetch(`${API_BASE}/teachers.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setTeachers(data.data)
            } else {
                setError(data.error || 'Failed to load teachers')
            }
        } catch (err) {
            setError('Failed to load teachers. Please check your connection.')
        } finally {
            setLoading(false)
        }
    }

    const fetchSubjects = async () => {
        try {
            const response = await fetch(`${API_BASE}/subjects.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setSubjects(data.data || [])
            }
        } catch (err) {
            console.error('Failed to load subjects')
        }
    }

    const handleAddTeacher = async (e) => {
        e.preventDefault()
        if (!newTeacher.email || !newTeacher.full_name) return

        setAddingTeacher(true)
        try {
            const response = await fetch(`${API_BASE}/teachers.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'create',
                    email: newTeacher.email,
                    full_name: newTeacher.full_name
                })
            })
            const data = await response.json()

            if (data.success) {
                setSuccessMessage(`Teacher "${newTeacher.full_name}" created successfully! Default password: teacher1234`)
                setShowAddTeacherModal(false)
                setNewTeacher({ email: '', full_name: '' })
                fetchTeachers()
            } else {
                setError(data.error || 'Failed to create teacher')
            }
        } catch (err) {
            setError('Failed to create teacher')
        } finally {
            setAddingTeacher(false)
        }
    }

    const handleDeleteTeacher = async (id) => {
        if (window.confirm('Are you sure you want to delete this teacher?')) {
            try {
                const response = await fetch(`${API_BASE}/teachers.php?id=${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'delete',
                        teacher_id: id
                    })
                })
                const data = await response.json()

                if (data.success) {
                    setSuccessMessage('Teacher deleted successfully!')
                    fetchTeachers()
                } else {
                    setError(data.error || 'Failed to delete teacher')
                }
            } catch (err) {
                setError('Failed to delete teacher')
            }
        }
    }

    const handleAssignSubject = async () => {
        if (!selectedTeacher || !selectedSubject) return

        try {
            const response = await fetch(`${API_BASE}/teachers.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    teacher_id: selectedTeacher.id,
                    subject_id: parseInt(selectedSubject)
                })
            })
            const data = await response.json()

            if (data.success) {
                setSuccessMessage('Subject assigned successfully!')
                setShowAssignModal(false)
                setSelectedSubject('')
                setSelectedSemester('')
                fetchTeachers()
            } else {
                setError(data.error || 'Failed to assign subject')
            }
        } catch (err) {
            setError('Failed to assign subject')
        }
    }

    const handleRemoveAssignment = async (teacherId, subjectId) => {
        if (!window.confirm('Remove this subject assignment?')) return

        try {
            // We need to find the assignment ID from teacher_subjects table
            // For now, we'll use a workaround by fetching teacher details and matching
            const response = await fetch(`${API_BASE}/teachers.php?id=${teacherId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const teacherData = await response.json()

            if (teacherData.success) {
                // Find the assignment - the subject.id in assigned_subjects might be the assignment ID
                // Actually looking at the API, we need the teacher_subjects.id, not subject.id
                // Let's use a direct delete that takes teacher_id and subject_id
                const deleteRes = await fetch(`${API_BASE}/teachers.php?teacher_id=${teacherId}&subject_id=${subjectId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const deleteData = await deleteRes.json()

                if (deleteData.success) {
                    setSuccessMessage('Assignment removed successfully!')
                    fetchTeachers()
                } else {
                    setError(deleteData.error || 'Failed to remove assignment')
                }
            }
        } catch (err) {
            setError('Failed to remove assignment')
        }
    }

    const toSentenceCase = (str) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    }

    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    // Get unique semesters from subjects
    const getSemesters = () => {
        const semesters = [...new Set(subjects.map(s => s.semester))].sort((a, b) => a - b)
        return semesters
    }

    // Get subjects filtered by semester
    const getFilteredSubjects = () => {
        if (!selectedTeacher) return []
        const assignedIds = selectedTeacher.assigned_subjects?.map(s => s.id) || []
        let filtered = subjects.filter(s => !assignedIds.includes(s.id))

        if (selectedSemester) {
            filtered = filtered.filter(s => s.semester === parseInt(selectedSemester))
        }

        return filtered
    }

    // Group subjects by semester for display
    const getSubjectsBySemester = () => {
        const filtered = getFilteredSubjects()
        const grouped = {}
        filtered.forEach(subject => {
            const sem = subject.semester
            if (!grouped[sem]) grouped[sem] = []
            grouped[sem].push(subject)
        })
        return grouped
    }

    if (loading) {
        return <div className="teacher-management"><p>Loading teachers...</p></div>
    }

    return (
        <div className="teacher-management">
            <div className="teacher-header-row">
                <h2>Teacher Management</h2>
                <button className="btn btn-primary add-teacher-btn" onClick={() => setShowAddTeacherModal(true)}>
                    <UserPlusIcon /> Add New Teacher
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}

            {teachers.length === 0 ? (
                <EmptyState
                    icon={UserIcon}
                    title="No Teachers Found"
                    description="No teachers have been registered yet. Click 'Add New Teacher' to get started."
                    actionText="Add New Teacher"
                    onAction={() => setShowAddTeacherModal(true)}
                />
            ) : (
                <div className="teachers-grid">
                    {teachers.map(teacher => (
                        <div key={teacher.id} className="teacher-card">
                            <div className="teacher-header">
                                <div className="teacher-avatar">
                                    {teacher.avatar_url ? (
                                        <img src={teacher.avatar_url} alt={teacher.full_name} />
                                    ) : (
                                        getInitials(teacher.full_name)
                                    )}
                                </div>
                                <div className="teacher-info">
                                    <h3>{toSentenceCase(teacher.full_name)}</h3>
                                    <p>{teacher.email}</p>
                                </div>
                            </div>

                            <span className="subject-count">
                                {teacher.assigned_subjects?.length || 0} subjects assigned
                            </span>

                            <div className="assigned-subjects">
                                <h4>Assigned Subjects</h4>
                                {teacher.assigned_subjects?.length > 0 ? (
                                    teacher.assigned_subjects.map(subject => (
                                        <span key={subject.id} className="subject-tag">
                                            <span className="semester-badge">S{subject.semester}</span>
                                            {subject.code} - {subject.name}
                                            <button
                                                className="remove-btn"
                                                onClick={() => handleRemoveAssignment(teacher.id, subject.id)}
                                                title="Remove assignment"
                                            >
                                                <XIcon />
                                            </button>
                                        </span>
                                    ))
                                ) : (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        No subjects assigned yet
                                    </p>
                                )}
                            </div>

                            <div className="teacher-actions">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        setSelectedTeacher(teacher)
                                        setSelectedSemester('')
                                        setSelectedSubject('')
                                        setShowAssignModal(true)
                                    }}
                                >
                                    <PlusIcon /> Assign Subject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Teacher Modal */}
            {showAddTeacherModal && (
                <div className="modal-overlay" onClick={() => setShowAddTeacherModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add New Teacher</h3>
                            <button className="close-btn" onClick={() => setShowAddTeacherModal(false)}>
                                <XIcon />
                            </button>
                        </div>
                        <form onSubmit={handleAddTeacher}>
                            <div className="form-group">
                                <label>Email Address *</label>
                                <input
                                    type="email"
                                    value={newTeacher.email}
                                    onChange={e => setNewTeacher({ ...newTeacher, email: e.target.value })}
                                    placeholder="teacher@college.edu"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Full Name *</label>
                                <input
                                    type="text"
                                    value={newTeacher.full_name}
                                    onChange={e => setNewTeacher({ ...newTeacher, full_name: e.target.value })}
                                    placeholder="John Smith"
                                    required
                                />
                            </div>

                            <div className="password-info">
                                <span className="info-icon">Info</span>
                                Default password will be: <strong>teacher1234</strong>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowAddTeacherModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={addingTeacher || !newTeacher.email || !newTeacher.full_name}
                                >
                                    {addingTeacher ? 'Creating...' : 'Create Teacher'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Subject Modal */}
            {showAssignModal && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Assign Subject to {selectedTeacher?.full_name}</h3>
                            <button className="close-btn" onClick={() => setShowAssignModal(false)}>
                                <XIcon />
                            </button>
                        </div>

                        <div className="form-group">
                            <label>Filter by Semester</label>
                            <select
                                value={selectedSemester}
                                onChange={e => {
                                    setSelectedSemester(e.target.value)
                                    setSelectedSubject('')
                                }}
                            >
                                <option value="">All Semesters</option>
                                {getSemesters().map(sem => (
                                    <option key={sem} value={sem}>Semester {sem}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Select Subject</label>
                            <select
                                value={selectedSubject}
                                onChange={e => setSelectedSubject(e.target.value)}
                            >
                                <option value="">-- Select a subject --</option>
                                {selectedSemester ? (
                                    getFilteredSubjects().map(subject => (
                                        <option key={subject.id} value={subject.id}>
                                            {subject.code} - {subject.name}
                                        </option>
                                    ))
                                ) : (
                                    Object.entries(getSubjectsBySemester()).map(([sem, subjects]) => (
                                        <optgroup key={sem} label={`Semester ${sem}`}>
                                            {subjects.map(subject => (
                                                <option key={subject.id} value={subject.id}>
                                                    {subject.code} - {subject.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))
                                )}
                            </select>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowAssignModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleAssignSubject}
                                disabled={!selectedSubject}
                            >
                                Assign Subject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default TeacherManagement



