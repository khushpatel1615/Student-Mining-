import { useState, useEffect, useCallback } from 'react'

import * as subjectService from '../../services/subjectService'
import * as programService from '../../services/programService'
import { useAuth } from '../../context/AuthContext'
import './SubjectManagement.css'

import { Plus, Edit, Trash2, X, BookOpen, AlertCircle, Layers, CreditCard, Info, Book } from 'lucide-react'

// Icons Map
const PlusIcon = Plus
const EditIcon = Edit
const TrashIcon = Trash2
const CloseIcon = X
const BookIcon = BookOpen
const AlertIcon = AlertCircle



// Default evaluation criteria
const DEFAULT_CRITERIA = [
    { component_name: 'Final Exam', weight_percentage: 35, max_marks: 35 },
    { component_name: 'Mid Semester', weight_percentage: 25, max_marks: 25 },
    { component_name: 'Lab Practicals', weight_percentage: 20, max_marks: 20 },
    { component_name: 'Assignments', weight_percentage: 20, max_marks: 20 }
]

function SubjectManagement() {
    const { token } = useAuth()
    const [subjects, setSubjects] = useState([])
    const [programs, setPrograms] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Filters
    const [selectedProgram, setSelectedProgram] = useState('')
    const [selectedSemester, setSelectedSemester] = useState('1') // Default to Semester 1

    // Modal states
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState('add')
    const [editingSubject, setEditingSubject] = useState(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deletingSubject, setDeletingSubject] = useState(null)
    const [saving, setSaving] = useState(false)
    const [modalLoading, setModalLoading] = useState(false)
    const [modalError, setModalError] = useState(null)

    // Form state
    const [formData, setFormData] = useState({
        program_id: '',
        semester: 1,
        name: '',
        code: '',
        subject_type: 'Core',
        credits: 3,
        description: ''
    })

    // Evaluation criteria state
    const [criteria, setCriteria] = useState([...DEFAULT_CRITERIA])

    // Fetch programs
    useEffect(() => {
        const loadPrograms = async () => {
            try {
                const { data, error } = await programService.fetchPrograms()
                if (data) {
                    setPrograms(data)
                    if (data.length > 0 && !selectedProgram) {
                        setSelectedProgram(data[0].id.toString())
                        setSelectedSemester('1')
                    }
                } else if (error) {
                    setError(error)
                }
            } catch (err) {
                console.error('Failed to fetch programs:', err)
            }
        }
        loadPrograms()
    }, [])

    // Fetch subjects
    const loadSubjects = useCallback(async () => {
        if (!selectedProgram || !selectedSemester) return

        try {
            setLoading(true)
            setError(null)
            const { data, error } = await subjectService.fetchSubjects({
                program_id: selectedProgram,
                semester: selectedSemester
            })

            if (data) {
                setSubjects(data)
            } else {
                setError(error || 'Failed to fetch subjects')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [selectedProgram, selectedSemester])

    useEffect(() => {
        loadSubjects()
    }, [loadSubjects])

    // Helper for Roman Numerals
    const toRoman = (num) => {
        const lookup = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 }
        let roman = '', i
        for (i in lookup) {
            while (num >= lookup[i]) {
                roman += i
                num -= lookup[i]
            }
        }
        return roman
    }


    const getTotalWeight = () => {
        return criteria.reduce((sum, c) => sum + (parseFloat(c.weight_percentage) || 0), 0)
    }

    const isWeightValid = () => {
        return Math.abs(getTotalWeight() - 100) < 0.01
    }

    const openAddModal = () => {
        setFormData({
            program_id: selectedProgram,
            semester: parseInt(selectedSemester || 1),
            name: '',
            code: '',
            subject_type: 'Core',
            credits: 3,
            description: ''
        })
        setCriteria([...DEFAULT_CRITERIA])
        setModalMode('add')
        setShowModal(true)
    }

    const openEditModal = async (subject) => {
        setEditingSubject(subject)
        setModalMode('edit')
        setShowModal(true)

        setModalLoading(true)
        setModalError(null)
        try {
            const { data, error } = await subjectService.fetchSubjectDetails(subject.id)

            if (data) {
                const detailed = data
                setFormData({
                    program_id: detailed.program_id,
                    semester: detailed.semester,
                    name: detailed.name,
                    code: detailed.code,
                    subject_type: detailed.subject_type,
                    credits: detailed.credits,
                    description: detailed.description || ''
                })

                if (detailed.evaluation_criteria && detailed.evaluation_criteria.length > 0) {
                    setCriteria(detailed.evaluation_criteria.map(c => ({
                        component_name: c.component_name,
                        weight_percentage: parseFloat(c.weight_percentage),
                        max_marks: parseInt(c.max_marks)
                    })))
                } else {
                    setCriteria([...DEFAULT_CRITERIA])
                }
            } else {
                const msg = error || 'Failed to load subject details'
                setError(msg)
                setModalError(msg)
            }
        } catch (err) {
            const msg = 'Failed to load subject details'
            setError(msg)
            setModalError(msg)
        } finally {
            setModalLoading(false)
        }
    }

    const openDeleteModal = (subject) => {
        setDeletingSubject(subject)
        setShowDeleteModal(true)
    }

    const redistributeWeights = (rows) => {
        if (!rows.length) return rows
        const even = Math.floor(100 / rows.length)
        const remainder = 100 - (even * rows.length)
        return rows.map((row, index) => {
            const weight = even + (index === 0 ? remainder : 0)
            return {
                ...row,
                weight_percentage: weight,
                max_marks: weight
            }
        })
    }

    const rebalanceFromIndex = (rows, index, newWeight) => {
        if (!rows.length) return rows
        const count = rows.length
        const safeWeight = Math.max(0, Math.min(100, Number(newWeight) || 0))
        const remainingCount = count - 1
        const remainingTotal = Math.max(0, 100 - safeWeight)
        const even = remainingCount > 0 ? Math.floor(remainingTotal / remainingCount) : 0
        const remainder = remainingCount > 0 ? remainingTotal - (even * remainingCount) : 0

        return rows.map((row, i) => {
            if (i === index) {
                return {
                    ...row,
                    weight_percentage: safeWeight,
                    max_marks: safeWeight
                }
            }
            if (remainingCount === 0) {
                return { ...row }
            }
            const add = i === 0 ? remainder : 0
            const weight = even + add
            return {
                ...row,
                weight_percentage: weight,
                max_marks: weight
            }
        })
    }

    const addCriteriaRow = () => {
        const updated = [...criteria, { component_name: '', weight_percentage: 0, max_marks: 0 }]
        setCriteria(redistributeWeights(updated))
    }

    const removeCriteriaRow = (index) => {
        const updated = criteria.filter((_, i) => i !== index)
        setCriteria(redistributeWeights(updated))
    }

    const updateCriteria = (index, field, value) => {
        const updated = [...criteria]
        updated[index] = { ...updated[index], [field]: value }

        if (field === 'weight_percentage') {
            setCriteria(rebalanceFromIndex(updated, index, value))
            return
        }

        if (field === 'max_marks') {
            setCriteria(rebalanceFromIndex(updated, index, value))
            return
        }

        setCriteria(updated)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Normalize weights to 100 if possible
        let adjustedCriteria = [...criteria]
        const total = getTotalWeight()
        const diff = 100 - total

        if (Math.abs(diff) > 0.01 && adjustedCriteria.length > 0) {
            const lastIndex = adjustedCriteria.length - 1
            const last = adjustedCriteria[lastIndex]
            const newWeight = (parseFloat(last.weight_percentage) || 0) + diff

            if (newWeight >= 0) {
                adjustedCriteria[lastIndex] = {
                    ...last,
                    weight_percentage: parseFloat(newWeight.toFixed(2)),
                    max_marks: Math.max(0, Math.round(newWeight))
                }
                setCriteria(adjustedCriteria)
            } else {
                const msg = `Evaluation weights must sum to 100%. Current total: ${total.toFixed(2)}%`
                setError(msg)
                setModalError(msg)
                return
            }
        }

        // Validate weights sum to 100 (tolerance)
        const normalizedTotal = adjustedCriteria.reduce((sum, c) => sum + (parseFloat(c.weight_percentage) || 0), 0)
        if (Math.abs(normalizedTotal - 100) > 0.01) {
            const msg = `Evaluation weights must sum to 100%. Current total: ${normalizedTotal.toFixed(2)}%`
            setError(msg)
            setModalError(msg)
            return
        }

        setSaving(true)

        try {
            const body = {
                ...formData,
                evaluation_criteria: adjustedCriteria.filter(c => c.component_name)
            }

            let res;
            if (modalMode === 'add') {
                res = await subjectService.createSubject(body)
            } else {
                res = await subjectService.updateSubject(editingSubject.id, body)
            }

            if (res.data?.success) {
                setShowModal(false)
                setError(null)
                setModalError(null)
                loadSubjects()
            } else {
                const msg = res.error || 'Failed to save subject'
                setError(msg)
                setModalError(msg)
            }
        } catch (err) {
            const msg = 'Network error. Please try again.'
            setError(msg)
            setModalError(msg)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        setSaving(true)
        try {
            const { data, error } = await subjectService.deleteSubject(deletingSubject.id)

            if (data?.success) {
                setShowDeleteModal(false)
                setDeletingSubject(null)
                loadSubjects()
            } else {
                setError(error || 'Failed to delete subject')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const currentProgram = programs.find(p => p.id.toString() === selectedProgram)
    const semesters = currentProgram ? Array.from({ length: currentProgram.total_semesters }, (_, i) => i + 1) : []

    return (
        <div className="subject-management">
            {/* Header */}
            <div className="subject-management-header">
                <h2 className="subject-management-title">Subject Management</h2>
                <button className="btn-add" onClick={openAddModal} disabled={!selectedProgram}>
                    <PlusIcon />
                    Add Subject
                </button>
            </div>

            {/* Filters - Program Selection */}
            <div className="subject-filters">
                <select
                    className="filter-select"
                    value={selectedProgram}
                    onChange={(e) => { setSelectedProgram(e.target.value); setSelectedSemester('1') }}
                >
                    <option value="">Select Program</option>
                    {programs.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>

            {/* Semester Tabs */}
            {selectedProgram && (
                <div className="semester-tabs">
                    {semesters.map(s => (
                        <button
                            key={s}
                            className={`semester-tab ${selectedSemester == s ? 'active' : ''}`}
                            onClick={(e) => {
                                e.preventDefault();
                                setSelectedSemester(s.toString());
                            }}
                        >
                            SEMESTER {toRoman(s)}
                        </button>
                    ))}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="subjects-table-container custom-syllabus-table">
                {loading ? (
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                    </div>
                ) : !selectedProgram ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <BookIcon />
                        </div>
                        <h3>Select a Program</h3>
                        <p>Choose a program to view its syllabus.</p>
                    </div>
                ) : subjects.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <BookIcon />
                        </div>
                        <h3>No subjects found</h3>
                        <p>Add subjects to this semester.</p>
                    </div>
                ) : (
                    <div className="syllabus-container">
                        <div className="syllabus-header">
                            <div className="syllabus-info">
                                <Book size={20} />
                                <span>Subject Syllabus</span>
                                <span className="program-badge">{currentProgram?.name}</span>
                                <span className="semester-badge-pill">Semester {toRoman(selectedSemester)}</span>
                            </div>
                            <div className="syllabus-count">{subjects.length} Subjects</div>
                        </div>

                        <div className="subjects-list">
                            {subjects.map(subject => (
                                <div key={subject.id} className="subject-card">
                                    <div className="subject-main">
                                        <div className="subject-icon">
                                            <BookOpen size={24} />
                                        </div>
                                        <div className="subject-details">
                                            <div className="subject-top">
                                                <h4 className="subject-name">{subject.name}</h4>
                                                <span className={`type-badge ${subject.subject_type?.toLowerCase()}`}>
                                                    {subject.subject_type}
                                                </span>
                                            </div>
                                            <div className="subject-meta">
                                                <span className="code-tag">
                                                    <CreditCard size={14} />
                                                    {subject.code}
                                                </span>
                                                <span className="credits-tag">
                                                    <Layers size={14} />
                                                    {subject.credits} Credits
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="subject-criteria">
                                        <div className="criteria-header">
                                            <Info size={14} />
                                            <span>Evaluation Breakdown</span>
                                        </div>
                                        <div className="criteria-tags">
                                            {subject.evaluation_criteria && subject.evaluation_criteria.length > 0 ? (
                                                subject.evaluation_criteria.map((c, i) => (
                                                    <div key={i} className="criteria-tag">
                                                        <span className="criteria-name">{c.component_name}</span>
                                                        <span className="criteria-weight">{parseFloat(c.weight_percentage)}%</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="no-criteria">No criteria defined</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="subject-actions">
                                        <button
                                            className="action-btn edit"
                                            onClick={() => openEditModal(subject)}
                                            title="Edit Subject"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            className="action-btn delete"
                                            onClick={() => openDeleteModal(subject)}
                                            title="Delete Subject"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {
                showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="modal-title">
                                    {modalMode === 'add' ? 'Add New Subject' : 'Edit Subject'}
                                </h3>
                                <button className="modal-close" onClick={() => setShowModal(false)}>
                                    <CloseIcon />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    {modalError && (
                                        <div className="error-message" style={{ marginBottom: '1rem' }}>
                                            {modalError}
                                        </div>
                                    )}
                                    {modalLoading && (
                                        <div className="loading-overlay">
                                            <div className="spinner"></div>
                                        </div>
                                    )}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Program *</label>
                                            <select
                                                className="form-select"
                                                value={formData.program_id}
                                                onChange={e => setFormData({ ...formData, program_id: e.target.value })}
                                                required
                                            >
                                                <option value="">Select Program</option>
                                                {programs.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Semester *</label>
                                            <select
                                                className="form-select"
                                                value={formData.semester}
                                                onChange={e => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                                                required
                                            >
                                                {(currentProgram
                                                    ? Array.from({ length: currentProgram.total_semesters }, (_, i) => i + 1)
                                                    : [1, 2, 3, 4, 5, 6]
                                                ).map(s => (
                                                    <option key={s} value={s}>Semester {s}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Subject Name *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g., Data Structures"
                                            required
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Code *</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.code}
                                                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                                placeholder="e.g., CS201"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Type</label>
                                            <select
                                                className="form-select"
                                                value={formData.subject_type}
                                                onChange={e => setFormData({ ...formData, subject_type: e.target.value })}
                                            >
                                                <option value="Core">Core</option>
                                                <option value="Elective">Elective</option>
                                                <option value="Open">Open</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Credits</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={formData.credits}
                                                onChange={e => setFormData({ ...formData, credits: parseInt(e.target.value) || 3 })}
                                                min="1"
                                                max="10"
                                            />
                                        </div>
                                    </div>

                                    {/* Evaluation Criteria Editor */}
                                    <div className="evaluation-editor">
                                        <div className="evaluation-editor-header">
                                            <span className="evaluation-editor-title">Evaluation Criteria</span>
                                            <span className={`evaluation-total ${isWeightValid() ? 'valid' : 'invalid'}`}>
                                                Total: {getTotalWeight().toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="evaluation-rows">
                                            <div className="evaluation-row" style={{ fontWeight: '600', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                <span>Component</span>
                                                <span>Weight %</span>
                                                <span>Marks</span>
                                                <span></span>
                                            </div>
                                            {criteria.map((c, index) => (
                                                <div key={index} className="evaluation-row">
                                                    <input
                                                        type="text"
                                                        value={c.component_name}
                                                        onChange={e => updateCriteria(index, 'component_name', e.target.value)}
                                                        placeholder="Component name"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={c.weight_percentage}
                                                        onChange={e => updateCriteria(index, 'weight_percentage', parseFloat(e.target.value) || 0)}
                                                        min="0"
                                                        max="100"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={c.max_marks}
                                                        onChange={e => updateCriteria(index, 'max_marks', parseInt(e.target.value) || 0)}
                                                        min="0"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="btn-remove-row"
                                                        onClick={() => removeCriteriaRow(index)}
                                                        disabled={criteria.length <= 1}
                                                    >
                                                        <CloseIcon />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button type="button" className="btn-add-row" onClick={addCriteriaRow}>
                                            <PlusIcon /> Add Component
                                        </button>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary" disabled={saving}>
                                        {saving ? 'Saving...' : (modalMode === 'add' ? 'Add Subject' : 'Save Changes')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                showDeleteModal && deletingSubject && (
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
                                    <h3>Delete this subject?</h3>
                                    <p>
                                        Are you sure you want to delete <strong>{deletingSubject.name}</strong>?
                                        This will affect all enrollments and grades for this subject.
                                    </p>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                                    Cancel
                                </button>
                                <button className="btn-danger" onClick={handleDelete} disabled={saving}>
                                    {saving ? 'Deleting...' : 'Delete Subject'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}

export default SubjectManagement



