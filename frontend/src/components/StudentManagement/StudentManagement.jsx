import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import './StudentManagement.css'

// Icons
const SearchIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
)

const PlusIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
)

const EditIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
)

const TrashIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
)

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
)

const UsersIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
)

const AlertIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
)

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

function StudentManagement() {
    const { token } = useAuth()
    const [students, setStudents] = useState([])
    const [programs, setPrograms] = useState([]) // Add programs state
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [page, setPage] = useState(1)
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 })
    const [debouncedSearch, setDebouncedSearch] = useState('')

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
            setPage(1)
        }, 500)
        return () => clearTimeout(timer)
    }, [search])

    // Modal states
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState('add') // 'add' or 'edit'
    const [editingStudent, setEditingStudent] = useState(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deletingStudent, setDeletingStudent] = useState(null)
    const [saving, setSaving] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        student_id: '',
        role: 'student',
        student_id: '',
        role: 'student',
        program_id: '', // Add program_id to form data
        password: ''
    })

    const fetchStudents = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20'
            })

            if (debouncedSearch) params.append('search', debouncedSearch)
            if (roleFilter) params.append('role', roleFilter)

            const response = await fetch(`${API_BASE}/students.php?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (data.success) {
                setStudents(data.data)
                setPagination(data.pagination)
            } else {
                setError(data.error || 'Failed to fetch students')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [token, page, debouncedSearch, roleFilter])

    useEffect(() => {
        fetchStudents()
        fetchPrograms() // Fetch programs when component mounts
    }, [fetchStudents])

    const fetchPrograms = async () => {
        try {
            const response = await fetch(`${API_BASE}/programs.php?active=true`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const data = await response.json()
            if (data.success) {
                setPrograms(data.data)
            }
        } catch (err) {
            console.error('Failed to fetch programs:', err)
        }
    }



    const getInitials = (name) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Never'
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const openAddModal = () => {
        setFormData({
            full_name: '',
            email: '',
            student_id: '',
            role: 'student',
            student_id: '',
            role: 'student',
            program_id: '',
            password: ''
        })
        setModalMode('add')
        setShowModal(true)
    }

    const openEditModal = (student) => {
        setEditingStudent(student)
        setFormData({
            full_name: student.full_name,
            email: student.email,
            student_id: student.student_id || '',
            role: student.role,
            student_id: student.student_id || '',
            role: student.role,
            program_id: student.program_id || '', // Populate program_id for editing
            password: ''
        })
        setModalMode('edit')
        setShowModal(true)
    }

    const openDeleteModal = (student) => {
        setDeletingStudent(student)
        setShowDeleteModal(true)
    }

    const handleToggleStatus = async (student) => {
        const newStatus = !student.is_active
        const confirmMessage = newStatus
            ? `Activate ${student.full_name}? They will be able to log in.`
            : `Deactivate ${student.full_name}? They will not be able to log in.`

        if (!window.confirm(confirmMessage)) return

        try {
            const response = await fetch(`${API_BASE}/students.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    id: student.id,
                    is_active: newStatus
                })
            })

            const data = await response.json()

            if (data.success) {
                // Update local state optimistically
                setStudents(prev => prev.map(s =>
                    s.id === student.id ? { ...s, is_active: newStatus } : s
                ))
            } else {
                setError(data.error || 'Failed to update student status')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)

        try {
            const url = `${API_BASE}/students.php`
            const method = modalMode === 'add' ? 'POST' : 'PUT'
            const body = modalMode === 'add'
                ? formData
                : { ...formData, id: editingStudent.id }

            // Only include password if it's provided
            if (!body.password) {
                delete body.password
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            })

            const data = await response.json()

            if (data.success) {
                setShowModal(false)
                fetchStudents()
            } else {
                setError(data.error || 'Failed to save student')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        setSaving(true)

        try {
            const response = await fetch(`${API_BASE}/students.php?id=${deletingStudent.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (data.success) {
                setShowDeleteModal(false)
                setDeletingStudent(null)
                fetchStudents()
            } else {
                setError(data.error || 'Failed to delete student')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="student-management">
            {/* Header */}
            <div className="student-management-header">
                <h2 className="student-management-title">Student Management</h2>
                <button className="btn-add" onClick={openAddModal}>
                    <PlusIcon />
                    Add Student
                </button>
            </div>

            {/* Filters */}
            <div className="student-filters">
                <div className="search-input-wrapper">
                    <SearchIcon />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search by name, email, or student ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="filter-select"
                    value={roleFilter}
                    onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
                >
                    <option value="">All Roles</option>
                    <option value="student">Students</option>
                    <option value="admin">Admins</option>
                </select>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid var(--error)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--error)',
                    fontSize: '0.875rem'
                }}>
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="students-table-container">
                {loading ? (
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                    </div>
                ) : students.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <UsersIcon />
                        </div>
                        <h3>No students found</h3>
                        <p>Try adjusting your search or filter criteria.</p>
                    </div>
                ) : (
                    <>
                        <table className="students-table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Student ID</th>
                                    <th>Role</th>
                                    <th>Dept.</th>
                                    <th>Status</th>
                                    <th>Last Login</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(student => (
                                    <tr key={student.id}>
                                        <td>
                                            <div className="student-info">
                                                <div className="student-avatar">
                                                    {student.avatar_url ? (
                                                        <img src={student.avatar_url} alt={student.full_name} />
                                                    ) : (
                                                        getInitials(student.full_name)
                                                    )}
                                                </div>
                                                <div className="student-details">
                                                    <span className="student-name">{student.full_name}</span>
                                                    <span className="student-email">{student.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{student.student_id || '-'}</td>
                                        <td>
                                            <span className={`role-badge ${student.role}`}>
                                                {student.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>
                                                {student.program_code || '-'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className={`status-toggle ${student.is_active ? 'active' : 'inactive'}`}
                                                onClick={() => handleToggleStatus(student)}
                                                title={student.is_active ? 'Click to deactivate' : 'Click to activate'}
                                            >
                                                <span className="status-indicator"></span>
                                                {student.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td>{formatDate(student.last_login)}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="btn-action"
                                                    onClick={() => openEditModal(student)}
                                                    title="Edit"
                                                >
                                                    <EditIcon />
                                                </button>
                                                <button
                                                    className="btn-action delete"
                                                    onClick={() => openDeleteModal(student)}
                                                    title="Delete"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="pagination">
                            <div className="pagination-info">
                                Showing {students.length} of {pagination.total} users
                            </div>
                            <div className="pagination-buttons">
                                <button
                                    className="btn-page"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    Previous
                                </button>
                                <button
                                    className="btn-page"
                                    disabled={page >= pagination.totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {modalMode === 'add' ? 'Add New Student' : 'Edit Student'}
                            </h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <CloseIcon />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Full Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.full_name}
                                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="Enter full name"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email *</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="Enter email address"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Student ID</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.student_id}
                                        onChange={e => setFormData({ ...formData, student_id: e.target.value })}
                                        placeholder="Enter student ID (optional)"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Department (Program)</label>
                                    <select
                                        className="form-select"
                                        value={formData.program_id}
                                        onChange={e => setFormData({ ...formData, program_id: e.target.value })}
                                    >
                                        <option value="">Select Department</option>
                                        {programs.map(prog => (
                                            <option key={prog.id} value={prog.id}>
                                                {prog.name} ({prog.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <select
                                        className="form-select"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="student">Student</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        Password {modalMode === 'add' ? '' : '(leave blank to keep unchanged)'}
                                    </label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        placeholder={modalMode === 'add' ? 'Default: password123' : 'Enter new password'}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : (modalMode === 'add' ? 'Add Student' : 'Save Changes')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && deletingStudent && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Confirm Deactivation</h3>
                            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="delete-confirmation">
                                <div className="delete-confirmation-icon">
                                    <AlertIcon />
                                </div>
                                <h3>Deactivate this user?</h3>
                                <p>
                                    Are you sure you want to deactivate <strong>{deletingStudent.full_name}</strong>?
                                    They will no longer be able to log in.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                                Cancel
                            </button>
                            <button className="btn-danger" onClick={handleDelete} disabled={saving}>
                                {saving ? 'Deactivating...' : 'Deactivate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default StudentManagement
