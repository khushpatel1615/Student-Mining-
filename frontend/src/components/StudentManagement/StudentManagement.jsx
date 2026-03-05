import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import SkeletonTable from '../ui/SkeletonTable'
import EmptyState from '../EmptyState/EmptyState'
import * as studentService from '../../services/studentService'
import * as programService from '../../services/programService'
import { importService } from '../../services/importService'
import './StudentManagement.css'

import {
    Search, Plus, Edit2, Trash2, UserCheck, UserX,
    Upload, Download, Filter, ChevronLeft, ChevronRight,
    Users, MoreHorizontal, GraduationCap, Mail, IdCard, Calendar,
    AlertCircle, CheckCircle, Lock, X
} from 'lucide-react'

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
            const result = await importService.importStudents(studentsToImport)
            if (result.error) throw new Error(result.error)

            // 2. Import Enrollments (Legacy Logic)
            if (sheetName === '5th') {
                const subjectsArr = ['CPT', 'NS', 'PHP-CGM', 'JAVA', 'PYTHON', 'PRO', 'INE']
                const enrollments = []
                studentsToImport.forEach(student => {
                    subjectsArr.forEach(subjectCode => {
                        enrollments.push({
                            enrollment: student.enrollment,
                            subjectCode: subjectCode
                        })
                    })
                })

                await importService.importEnrollments(enrollments)
            }

            setImportStats(result.data)
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

            const { data, pagination: pag, error: err } = await studentService.fetchStudents({
                page,
                limit: 20,
                search: debouncedSearch,
                role: roleFilter
            })

            if (data) {
                setStudents(data)
                setPagination(pag || { total: 0, totalPages: 1 })
            } else {
                setError(err || 'Failed to fetch students')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [page, debouncedSearch, roleFilter])

    const fetchPrograms = useCallback(async () => {
        try {
            const { data } = await programService.fetchPrograms()
            if (data) {
                setPrograms(data)
            }
        } catch (err) {
            console.error('Failed to fetch programs:', err)
        }
    }, [])

    useEffect(() => {
        fetchStudents()
        fetchPrograms()
    }, [fetchStudents, fetchPrograms])



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
            full_name: student.full_name || '',
            email: student.email || '',
            student_id: student.student_id || '',
            role: student.role || 'student',
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
            const { data, error: err } = await studentService.updateStudent(statusTogglingStudent.id, {
                is_active: newStatus
            })

            if (data?.success) {
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
            let res;
            if (modalMode === 'add') {
                res = await studentService.createStudent(formData)
            } else {
                res = await studentService.updateStudent(editingStudent.id, formData)
            }

            if (res.data?.success) {
                setShowModal(false)
                fetchStudents()
            } else {
                setError(res.error || 'Failed to save student')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const handleConfirmDelete = async () => {
        if (!deletingStudent) return
        setSaving(true)

        try {
            const { data, error: err } = await studentService.deleteStudent(deletingStudent.id)

            if (data?.success) {
                setShowDeleteModal(false)
                setDeletingStudent(null)
                fetchStudents()
            } else {
                setError(err || 'Failed to delete student')
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
                    <Plus size={18} />
                    Add Student
                </button>
            </div>

            {/* Filters */}
            <div className="student-filters">
                <div className="search-input-wrapper">
                    <Search size={18} />
                    <input
                        type="text"
                        className="sm-search-input"
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
                        icon={Users}
                        title="No Students Found"
                        description="We couldn't find any students matching your current search or filters. Try adjusting your criteria or adding a new student."
                        actionText="Add New Student"
                        onAction={openAddModal}
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
                                                <span className="student-id-cell">{student.student_id || 'N/A'}</span>
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
                                                    {student.program_code || 'N/A'}
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
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        className="btn-action-modern delete"
                                                        onClick={() => openDeleteModal(student)}
                                                        title="Delete student"
                                                    >
                                                        <Trash2 size={16} />
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
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    className="btn-page"
                                    disabled={page >= pagination.totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    <ChevronRight size={18} />
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
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="modal-body">
                                {/* Name Input */}
                                <div className="form-group">
                                    <label className="form-label">Full Name <span className="required">*</span></label>
                                    <div className="input-group">
                                        <div className="input-icon">
                                            <Users size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            className="form-input with-icon"
                                            value={formData.full_name}
                                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                            placeholder="John Doe"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Email Input */}
                                <div className="form-group">
                                    <label className="form-label">Email Address <span className="required">*</span></label>
                                    <div className="input-group">
                                        <div className="input-icon">
                                            <Mail size={18} />
                                        </div>
                                        <input
                                            type="email"
                                            className="form-input with-icon"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="john.doe@university.edu"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    {/* Student ID */}
                                    <div className="form-group half">
                                        <label className="form-label">Student ID</label>
                                        <div className="input-group">
                                            <div className="input-icon">
                                                <IdCard size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                className="form-input with-icon"
                                                value={formData.student_id}
                                                onChange={e => setFormData({ ...formData, student_id: e.target.value })}
                                                placeholder="ST-2024-001"
                                            />
                                        </div>
                                    </div>

                                    {/* Role */}
                                    <div className="form-group half">
                                        <label className="form-label">Role</label>
                                        <div className="input-group">
                                            <div className="input-icon">
                                                <UserCheck size={18} />
                                            </div>
                                            <select
                                                className="form-select with-icon"
                                                value={formData.role}
                                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                            >
                                                <option value="student">Student</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="form-row">
                                    {/* Department */}
                                    <div className="form-group half">
                                        <label className="form-label">Department</label>
                                        <div className="input-group">
                                            <div className="input-icon">
                                                <GraduationCap size={18} />
                                            </div>
                                            <select
                                                className="form-select with-icon"
                                                value={formData.program_id}
                                                onChange={e => setFormData({ ...formData, program_id: e.target.value })}
                                            >
                                                <option value="">Select Dept.</option>
                                                {programs.map(prog => (
                                                    <option key={prog.id} value={prog.id}>
                                                        {prog.code}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div className="form-group half">
                                        <label className="form-label">
                                            Password <span className="password-hint">{modalMode === 'add' ? '(Default: 123)' : '(Leave blank)'}</span>
                                        </label>
                                        <div className="input-group">
                                            <div className="input-icon">
                                                <Lock size={18} />
                                            </div>
                                            <input
                                                type="password"
                                                className="form-input with-icon"
                                                value={formData.password}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                placeholder={modalMode === 'add' ? 'password123' : 'New password'}
                                            />
                                        </div>
                                    </div>
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
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="delete-confirmation">
                                <div className="delete-confirmation-icon">
                                    <AlertCircle size={48} />
                                </div>
                                <h3>Deactivate this user</h3>
                                <p>
                                    Are you sure you want to deactivate <strong>{deletingStudent.full_name}</strong>
                                    They will no longer be able to log in.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                                Cancel
                            </button>
                            <button className="btn-danger" onClick={handleConfirmDelete} disabled={saving}>
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
                                <X />
                            </button>
                        </div>
                        <div className="modal-body">
                            {!importStats ? (
                                <div className="import-area" style={{ textAlign: 'center', padding: '2rem' }}>
                                    <div style={{ marginBottom: '1.5rem', color: 'var(--primary)', transform: 'scale(1.5)', display: 'inline-block' }}>
                                        <Upload />
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
                                            <><span style={{ display: 'inline-block', width: '18px' }}><Upload /></span> Select File</>
                                        )}
                                    </label>
                                </div>
                            ) : (
                                <div className="import-success">
                                    <div className="status-confirmation activate">
                                        <div className="status-confirmation-icon">
                                            <CheckCircle />
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
                                <X />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className={`status-confirmation ${statusTogglingStudent.is_active ? 'deactivate' : 'activate'}`}>
                                <div className="status-confirmation-icon">
                                    {statusTogglingStudent.is_active ? <AlertCircle /> : <CheckCircle />}
                                </div>
                                <h3>
                                    {statusTogglingStudent.is_active
                                        ? 'Deactivate this user'
                                        : 'Activate this user'}
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



