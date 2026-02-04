import { API_BASE } from '../../config';
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import SkeletonTable from '../SkeletonTable/SkeletonTable'
import EmptyState from '../EmptyState/EmptyState'
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

const CheckCircleIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
)

const UploadIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
)

import * as XLSX from 'xlsx'



function StudentManagement() {
    const { token } = useAuth()
    const [searchParams, setSearchParams] = useSearchParams()
    const [students, setStudents] = useState([])

    const [showImportModal, setShowImportModal] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importStats, setImportStats] = useState(null)

    // Check for quick actions
    useEffect(() => {
        const action = searchParams.get('action')
        if (action === 'add') {
            openAddModal()
            setSearchParams(params => { params.delete('action'); return params })
        } else if (action === 'import') {
            setShowImportModal(true)
            setSearchParams(params => { params.delete('action'); return params })
        }
    }, [searchParams])

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setImporting(true)
        setError(null)
        setImportStats(null)

        try {
            const buffer = await file.arrayBuffer()
            const workbook = XLSX.read(buffer, { type: 'array' })

            let studentsToImport = []
            let sheetName = workbook.SheetNames[0]

            // Check for specific "5th" sheet as per legacy import
            if (workbook.SheetNames.includes('5th')) {
                sheetName = '5th'
                const worksheet = workbook.Sheets[sheetName]
                const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

                // Legacy logic: Header at row 1 (index 1), data starts index 2
                // Columns: 0=Batch, 1=Class, 2=Enrollment, 3=Name, 4=Coordinator, 5=Mobile1, 6=Mobile2
                for (let i = 2; i < data.length; i++) {
                    const row = data[i]
                    if (!row || !row[2]) continue

                    const enrollment = row[2]?.toString()
                    if (!enrollment) continue

                    studentsToImport.push({
                        batch: row[0] || 1,
                        class: row[1] || 'A',
                        enrollment: enrollment,
                        name: row[3] || 'Unknown',
                        coordinator: row[4] || null,
                        mobile1: row[5] || null,
                        mobile2: row[6] || null
                    })
                }
            } else {
                // Fallback to generic parsing
                const worksheet = workbook.Sheets[sheetName]
                const jsonData = XLSX.utils.sheet_to_json(worksheet)

                const normalizedData = jsonData.map(row => {
                    const newRow = {}
                    Object.keys(row).forEach(key => {
                        newRow[key.toLowerCase().trim()] = row[key]
                    })
                    return newRow
                })

                studentsToImport = normalizedData.map(row => ({
                    enrollment: row['enrollment no.'] || row['enrollment'] || row['id'] || row['student id'] || row['roll no'],
                    name: row['student name'] || row['name'] || row['full name'] || row['student_name'],
                    batch: row['batch'] || '2023',
                    class: row['class'] || 'BCA-5',
                    coordinator: row['coordinator'] || '',
                    mobile1: row['mobile'] || row['phone'] || row['contact'] || '',
                    mobile2: row['mobile 2'] || row['alternate mobile'] || ''
                })).filter(s => s.enrollment && s.name)
            }

            if (studentsToImport.length === 0) {
                setError('No valid student records found. Please check file format.')
                setImporting(false)
                return
            }

            // 1. Import Students
            const response = await fetch(`${API_BASE}/import_students_backend.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'import_students',
                    data: studentsToImport
                })
            })

            const result = await response.json()
            if (!result.success) throw new Error(result.error)

            // 2. Import Enrollments (Legacy Logic)
            if (sheetName === '5th') {
                const subjects = ['CPT', 'NS', 'PHP-CGM', 'JAVA', 'PYTHON', 'PRO', 'INE']
                const enrollments = []
                studentsToImport.forEach(student => {
                    subjects.forEach(subjectCode => {
                        enrollments.push({
                            enrollment: student.enrollment,
                            subjectCode: subjectCode
                        })
                    })
                })

                await fetch(`${API_BASE}/import_students_backend.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        action: 'import_enrollments',
                        data: enrollments
                    })
                })
                // Merge stats? defaulting to student import stats for display
            }

            setImportStats(result)
            fetchStudents()

        } catch (err) {
            console.error(err)
            setError('Failed to process file: ' + err.message)
        } finally {
            setImporting(false)
            e.target.value = ''
        }
    }
    const [programs, setPrograms] = useState([]) // Add programs state
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [page, setPage] = useState(1)
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 })
    const [debouncedSearch, setDebouncedSearch] = useState('')

    // Helper to format names to Sentence Case
    const toSentenceCase = (str) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    }

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
    const [showStatusModal, setShowStatusModal] = useState(false)
    const [statusTogglingStudent, setStatusTogglingStudent] = useState(null)
    const [saving, setSaving] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
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

    const handleToggleStatus = (student) => {
        setStatusTogglingStudent(student)
        setShowStatusModal(true)
    }

    const handleConfirmStatusToggle = async () => {
        if (!statusTogglingStudent) return

        const newStatus = !statusTogglingStudent.is_active
        setSaving(true)

        try {
            const response = await fetch(`${API_BASE}/students.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    id: statusTogglingStudent.id,
                    is_active: newStatus
                })
            })

            const data = await response.json()

            if (data.success) {
                // Update local state optimistically
                setStudents(prev => prev.map(s =>
                    s.id === statusTogglingStudent.id ? { ...s, is_active: newStatus } : s
                ))
                setShowStatusModal(false)
                setStatusTogglingStudent(null)
            } else {
                setError(data.error || 'Failed to update student status')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setSaving(false)
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
                    <SkeletonTable rows={10} columns={7} />
                ) : students.length === 0 ? (
                    <EmptyState
                        icon={UsersIcon}
                        title="No Students Found"
                        description="We couldn't find any students matching your current search or filters. Try adjusting your criteria or adding a new student."
                        actionText="Add New Student"
                        onAction={() => setShowAddModal(true)}
                    />
                ) : (
                    <>
                        <table className="students-table">
                            <thead>
                                <tr>
                                    <th className="text-left">Student</th>
                                    <th className="text-right">Student ID</th>
                                    <th className="text-center">Role</th>
                                    <th className="text-left">Dept.</th>
                                    <th className="text-center">Status</th>
                                    <th className="text-right">Last Login</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(student => {
                                    // Generate avatar color based on name
                                    const colors = ['purple', 'blue', 'teal', 'rose', 'amber'];
                                    const colorIndex = student.full_name.charCodeAt(0) % colors.length;
                                    const avatarColor = colors[colorIndex];

                                    return (
                                        <tr key={student.id}>
                                            {/* Circular Profile Tile */}
                                            <td>
                                                <div className="student-profile-tile">
                                                    <div
                                                        className="circular-avatar"
                                                        data-color={avatarColor}
                                                        title={student.full_name}
                                                    >
                                                        {student.avatar_url ? (
                                                            <img src={student.avatar_url} alt={student.full_name} />
                                                        ) : (
                                                            getInitials(student.full_name)
                                                        )}
                                                    </div>
                                                    <div className="student-details-modern">
                                                        <span className="student-name-modern">{toSentenceCase(student.full_name)}</span>
                                                        <span className="student-email-modern">{student.email}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Student ID */}
                                            <td className="text-center">
                                                <span className="student-id-cell">{student.student_id || '—'}</span>
                                            </td>

                                            {/* Role Pill */}
                                            <td className="text-center">
                                                <span className={`role-pill ${student.role}`}>
                                                    {student.role}
                                                </span>
                                            </td>

                                            {/* Department */}
                                            <td className="text-center">
                                                <span className="dept-cell">
                                                    {student.program_code || '—'}
                                                </span>
                                            </td>

                                            {/* Status Pill */}
                                            <td className="text-center">
                                                <button
                                                    className={`status-pill ${student.is_active ? 'active' : 'inactive'}`}
                                                    onClick={() => handleToggleStatus(student)}
                                                    title={student.is_active ? 'Click to deactivate' : 'Click to activate'}
                                                >
                                                    <span className="status-dot"></span>
                                                    {student.is_active ? 'Active' : 'Inactive'}
                                                </button>
                                            </td>

                                            {/* Last Login */}
                                            <td className="text-center">
                                                <span className={`last-login-cell ${!student.last_login ? 'never' : ''}`}>
                                                    {formatDate(student.last_login)}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="text-center">
                                                <div className="action-buttons-modern">
                                                    <button
                                                        className="btn-action-modern"
                                                        onClick={() => openEditModal(student)}
                                                        title="Edit student"
                                                    >
                                                        <EditIcon />
                                                    </button>
                                                    <button
                                                        className="btn-action-modern delete"
                                                        onClick={() => openDeleteModal(student)}
                                                        title="Delete student"
                                                    >
                                                        <TrashIcon />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
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

            {/* Import Modal */}
            {showImportModal && (
                <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Batch Import Students</h3>
                            <button className="modal-close" onClick={() => setShowImportModal(false)}>
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="modal-body">
                            {!importStats ? (
                                <div className="import-area" style={{ textAlign: 'center', padding: '2rem' }}>
                                    <div style={{ marginBottom: '1.5rem', color: 'var(--primary)', transform: 'scale(1.5)', display: 'inline-block' }}>
                                        <UploadIcon />
                                    </div>
                                    <h3 style={{ marginBottom: '1rem' }}>Upload Excel/CSV File</h3>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                        Supported formats: .xlsx, .xls, .csv <br />
                                        Required columns: "Enrollment No.", "Student Name", "Mobile"
                                    </p>

                                    <input
                                        type="file"
                                        accept=".xlsx, .xls, .csv"
                                        id="file-upload"
                                        style={{ display: 'none' }}
                                        onChange={handleFileUpload}
                                        disabled={importing}
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className="btn-primary"
                                        style={{ cursor: importing ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        {importing ? (
                                            <>Converting & Uploading...</>
                                        ) : (
                                            <><span style={{ display: 'inline-block', width: '18px' }}><UploadIcon /></span> Select File</>
                                        )}
                                    </label>
                                </div>
                            ) : (
                                <div className="import-success">
                                    <div className="status-confirmation activate">
                                        <div className="status-confirmation-icon">
                                            <CheckCircleIcon />
                                        </div>
                                        <h3>Import Complete!</h3>
                                        <p>Successfully processed {importStats.total} records.</p>
                                        <ul style={{ textAlign: 'left', marginTop: '1rem', background: '#f3f4f6', padding: '1rem', borderRadius: '8px', listStyle: 'none' }}>
                                            <li>Imported/Updated: <strong>{importStats.imported}</strong></li>
                                            <li>Errors: <strong>{importStats.errors?.length || 0}</strong></li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowImportModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Toggle Confirmation Modal */}
            {showStatusModal && statusTogglingStudent && (
                <div className="modal-overlay" onClick={() => { setShowStatusModal(false); setStatusTogglingStudent(null); }}>
                    <div className="modal-content status-confirmation-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {statusTogglingStudent.is_active ? 'Deactivate User' : 'Activate User'}
                            </h3>
                            <button className="modal-close" onClick={() => { setShowStatusModal(false); setStatusTogglingStudent(null); }}>
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className={`status-confirmation ${statusTogglingStudent.is_active ? 'deactivate' : 'activate'}`}>
                                <div className="status-confirmation-icon">
                                    {statusTogglingStudent.is_active ? <AlertIcon /> : <CheckCircleIcon />}
                                </div>
                                <h3>
                                    {statusTogglingStudent.is_active
                                        ? 'Deactivate this user?'
                                        : 'Activate this user?'}
                                </h3>
                                <p>
                                    {statusTogglingStudent.is_active
                                        ? <>Are you sure you want to deactivate <strong>{statusTogglingStudent.full_name}</strong>? They will no longer be able to log in.</>
                                        : <>Are you sure you want to activate <strong>{statusTogglingStudent.full_name}</strong>? They will be able to log in again.</>}
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => { setShowStatusModal(false); setStatusTogglingStudent(null); }}>
                                Cancel
                            </button>
                            <button
                                className={statusTogglingStudent.is_active ? 'btn-danger' : 'btn-success'}
                                onClick={handleConfirmStatusToggle}
                                disabled={saving}
                            >
                                {saving
                                    ? (statusTogglingStudent.is_active ? 'Deactivating...' : 'Activating...')
                                    : (statusTogglingStudent.is_active ? 'Deactivate' : 'Activate')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default StudentManagement



