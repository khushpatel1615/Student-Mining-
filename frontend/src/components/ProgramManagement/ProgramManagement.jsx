import { API_BASE } from '../../config';
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import './ProgramManagement.css'

// Icons
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

const BookIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
)

const AlertIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
)



function ProgramManagement() {
    const { token } = useAuth()
    const [programs, setPrograms] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Modal states
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState('add')
    const [editingProgram, setEditingProgram] = useState(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deletingProgram, setDeletingProgram] = useState(null)
    const [saving, setSaving] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        duration_years: 3,
        total_semesters: 6,
        description: ''
    })

    const fetchPrograms = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`${API_BASE}/programs.php?active=false`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (data.success) {
                setPrograms(data.data)
            } else {
                setError(data.error || 'Failed to fetch programs')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [token])

    useEffect(() => {
        fetchPrograms()
    }, [fetchPrograms])

    const openAddModal = () => {
        setFormData({
            name: '',
            code: '',
            duration_years: 3,
            total_semesters: 6,
            description: ''
        })
        setModalMode('add')
        setShowModal(true)
    }

    const openEditModal = (program) => {
        setEditingProgram(program)
        setFormData({
            name: program.name,
            code: program.code,
            duration_years: program.duration_years,
            total_semesters: program.total_semesters,
            description: program.description || ''
        })
        setModalMode('edit')
        setShowModal(true)
    }

    const openDeleteModal = (program) => {
        setDeletingProgram(program)
        setShowDeleteModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)

        try {
            const url = `${API_BASE}/programs.php`
            const method = modalMode === 'add' ? 'POST' : 'PUT'
            const body = modalMode === 'add'
                ? formData
                : { ...formData, id: editingProgram.id }

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
                fetchPrograms()
            } else {
                setError(data.error || 'Failed to save program')
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
            const response = await fetch(`${API_BASE}/programs.php?id=${deletingProgram.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (data.success) {
                setShowDeleteModal(false)
                setDeletingProgram(null)
                fetchPrograms()
            } else {
                setError(data.error || 'Failed to delete program')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="program-management">
            {/* Header */}
            <div className="program-management-header">
                <h2 className="program-management-title">Program Management</h2>
                <button className="btn-add" onClick={openAddModal}>
                    <PlusIcon />
                    Add Program
                </button>
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
            <div className="programs-table-container">
                {loading ? (
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                    </div>
                ) : programs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <BookIcon />
                        </div>
                        <h3>No programs found</h3>
                        <p>Create your first academic program to get started.</p>
                    </div>
                ) : (
                    <table className="programs-table">
                        <thead>
                            <tr>
                                <th>Program</th>
                                <th>Code</th>
                                <th>Duration</th>
                                <th>Subjects</th>
                                <th>Students</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {programs.map(program => (
                                <tr key={program.id}>
                                    <td>
                                        <div className="program-info">
                                            <span className="program-name">{program.name}</span>
                                            {program.description && (
                                                <span className="program-description">{program.description}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="code-badge">{program.code}</span>
                                    </td>
                                    <td>
                                        <div className="program-stats">
                                            <span><strong>{program.duration_years}</strong> years</span>
                                            <span><strong>{program.total_semesters}</strong> semesters</span>
                                        </div>
                                    </td>
                                    <td>
                                        <strong>{program.total_subjects || 0}</strong> subjects
                                    </td>
                                    <td>
                                        <strong>{program.total_students || 0}</strong> students
                                    </td>
                                    <td>
                                        <span className={`status-badge ${program.is_active ? 'active' : 'inactive'}`}>
                                            {program.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-action"
                                                onClick={() => openEditModal(program)}
                                                title="Edit"
                                            >
                                                <EditIcon />
                                            </button>
                                            <button
                                                className="btn-action delete"
                                                onClick={() => openDeleteModal(program)}
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
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {modalMode === 'add' ? 'Add New Program' : 'Edit Program'}
                            </h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <CloseIcon />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Program Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Diploma in Computer Engineering"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Program Code *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g., DCE"
                                        required
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Duration (Years)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.duration_years}
                                            onChange={e => setFormData({ ...formData, duration_years: parseInt(e.target.value) || 3 })}
                                            min="1"
                                            max="6"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Total Semesters</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.total_semesters}
                                            onChange={e => setFormData({ ...formData, total_semesters: parseInt(e.target.value) || 6 })}
                                            min="1"
                                            max="12"
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className="form-input"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Program description (optional)"
                                        rows="3"
                                        style={{ resize: 'vertical' }}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : (modalMode === 'add' ? 'Add Program' : 'Save Changes')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && deletingProgram && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Confirm Deletion</h3>
                            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="delete-confirmation">
                                <div className="delete-confirmation-icon">
                                    <AlertIcon />
                                </div>
                                <h3>Delete this program?</h3>
                                <p>
                                    Are you sure you want to delete <strong>{deletingProgram.name}</strong>?
                                    This will also affect all subjects and enrollments under this program.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                                Cancel
                            </button>
                            <button className="btn-danger" onClick={handleDelete} disabled={saving}>
                                {saving ? 'Deleting...' : 'Delete Program'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProgramManagement



