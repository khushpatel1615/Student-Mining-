import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './GradeManagement.css'

// Icons
const SaveIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
    </svg>
)

const BookIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
)

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

function GradeManagement() {
    const { token } = useAuth()
    const [searchParams] = useSearchParams()
    const [programs, setPrograms] = useState([])
    const [subjects, setSubjects] = useState([])
    const [enrollments, setEnrollments] = useState([])
    const [criteria, setCriteria] = useState([])
    const [grades, setGrades] = useState({})
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)

    // Filters
    const [selectedProgram, setSelectedProgram] = useState('')
    const [selectedSemester, setSelectedSemester] = useState('')
    const [selectedSubject, setSelectedSubject] = useState('')
    const [searchQuery, setSearchQuery] = useState('')

    // Sync state with URL params
    useEffect(() => {
        const urlProgramId = searchParams.get('program_id');
        const urlSemester = searchParams.get('semester');
        const urlStudentName = searchParams.get('student_name');
        const urlSubject = searchParams.get('subject');

        // Update Program if present in URL
        if (urlProgramId && urlProgramId !== selectedProgram) {
            setSelectedProgram(urlProgramId);
        }

        // Update Semester if present in URL (handle empty string as All Semesters)
        if (urlSemester !== null && urlSemester !== selectedSemester) {
            setSelectedSemester(urlSemester);
        }

        // Update Search Query if present in URL
        if (urlStudentName) {
            const decodedName = decodeURIComponent(urlStudentName);
            if (decodedName !== searchQuery) {
                setSearchQuery(decodedName);
            }
        }

        // Auto-select "All Subjects" if requested or searching for specific student
        if (urlSubject === 'all' || urlStudentName) {
            if (selectedSubject !== 'all') {
                setSelectedSubject('all');
            }
        }
    }, [searchParams, selectedProgram, selectedSemester, selectedSubject, searchQuery]);

    // Fetch programs
    useEffect(() => {
        const fetchPrograms = async () => {
            try {
                const response = await fetch(`${API_BASE}/programs.php`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await response.json()
                if (data.success) {
                    setPrograms(data.data)

                    // Set default program if no URL param and no selection
                    const urlProgramId = searchParams.get('program_id')
                    if (!urlProgramId && data.data.length > 0 && !selectedProgram) {
                        setSelectedProgram(data.data[0].id.toString())
                    }
                }
            } catch (err) {
                console.error('Failed to fetch programs:', err)
            }
        }
        fetchPrograms()
    }, [token, searchParams, selectedProgram])

    // Fetch subjects when program/semester changes
    useEffect(() => {
        const fetchSubjects = async () => {
            if (!selectedProgram) return

            try {
                let url = `${API_BASE}/subjects.php?program_id=${selectedProgram}`
                if (selectedSemester) url += `&semester=${selectedSemester}`

                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await response.json()
                if (data.success) {
                    setSubjects(data.data)

                    // Check if we should auto-select "All Subjects" from URL params
                    const urlSubject = searchParams.get('subject')
                    const urlStudentName = searchParams.get('student_name')

                    if (urlSubject === 'all' || urlStudentName) {
                        setSelectedSubject('all')
                    } else {
                        setSelectedSubject('')
                    }
                }
            } catch (err) {
                console.error('Failed to fetch subjects:', err)
            }
        }
        fetchSubjects()
    }, [token, selectedProgram, selectedSemester, searchParams])

    // Fetch grades when subject changes
    const fetchGrades = useCallback(async () => {
        if (!selectedSubject) return

        try {
            setLoading(true)
            setError(null)

            // Handle "All Subjects" option
            const url = selectedSubject === 'all'
                ? `${API_BASE}/grades.php?program_id=${selectedProgram}&semester=${selectedSemester}`
                : `${API_BASE}/grades.php?subject_id=${selectedSubject}`

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()

            if (data.success) {
                setEnrollments(data.data.enrollments || [])
                setCriteria(data.data.criteria || [])

                // Initialize grades object
                const gradesObj = {}
                data.data.enrollments?.forEach(enrollment => {
                    gradesObj[enrollment.id] = {}
                    data.data.criteria?.forEach(c => {
                        const existingGrade = enrollment.grades?.find(g => g.criteria_id === c.id)
                        gradesObj[enrollment.id][c.id] = existingGrade?.marks_obtained || ''
                    })
                })
                setGrades(gradesObj)
            } else {
                setError(data.error || 'Failed to fetch grades')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [token, selectedSubject, selectedProgram, selectedSemester])

    useEffect(() => {
        fetchGrades()
    }, [fetchGrades])

    const updateGrade = (enrollmentId, criteriaId, value) => {
        setGrades(prev => ({
            ...prev,
            [enrollmentId]: {
                ...prev[enrollmentId],
                [criteriaId]: value
            }
        }))
    }

    const calculateTotal = (enrollmentId) => {
        const enrollmentGrades = grades[enrollmentId] || {}
        return criteria.reduce((sum, c) => {
            const marks = parseFloat(enrollmentGrades[c.id]) || 0
            return sum + marks
        }, 0)
    }

    const handleSaveGrades = async () => {
        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            // Prepare grades data
            const gradesData = []
            Object.entries(grades).forEach(([enrollmentId, criteriaGrades]) => {
                Object.entries(criteriaGrades).forEach(([criteriaId, marks]) => {
                    if (marks !== '' && marks !== null) {
                        gradesData.push({
                            enrollment_id: parseInt(enrollmentId),
                            criteria_id: parseInt(criteriaId),
                            marks_obtained: parseFloat(marks)
                        })
                    }
                })
            })

            const response = await fetch(`${API_BASE}/grades.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ grades: gradesData })
            })

            const data = await response.json()

            if (data.success) {
                setSuccess('Grades saved successfully!')
                setTimeout(() => setSuccess(null), 3000)
            } else {
                setError(data.error || 'Failed to save grades')
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
        <div className="grade-management">
            {/* Header */}
            <div className="grade-management-header">
                <h2 className="grade-management-title">Grade Management</h2>
                {selectedSubject && enrollments.length > 0 && (
                    <button className="btn-add" onClick={handleSaveGrades} disabled={saving}>
                        <SaveIcon />
                        {saving ? 'Saving...' : 'Save All Grades'}
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="grade-filters">
                <select
                    className="filter-select"
                    value={selectedProgram}
                    onChange={(e) => { setSelectedProgram(e.target.value); setSelectedSemester(''); setSelectedSubject('') }}
                >
                    <option value="">Select Program</option>
                    {programs.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                </select>
                <select
                    className="filter-select"
                    value={selectedSemester}
                    onChange={(e) => { setSelectedSemester(e.target.value); setSelectedSubject('') }}
                    disabled={!selectedProgram}
                >
                    <option value="">All Semesters</option>
                    {semesters.map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                    ))}
                </select>
                <select
                    className="filter-select"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    disabled={!selectedProgram}
                >
                    <option value="">Select Subject</option>
                    {selectedProgram && (
                        <option value="all">📚 All Subjects</option>
                    )}
                    {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                </select>
                <div className="search-wrapper" style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <input
                        type="text"
                        className="filter-input"
                        placeholder="Search student..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={!selectedSubject}
                        style={{
                            width: '100%',
                            padding: '0.5rem 0.75rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            fontSize: '0.875rem'
                        }}
                    />
                </div>
            </div>

            {/* Messages */}
            {
                error && (
                    <div className="message error">{error}</div>
                )
            }
            {
                success && (
                    <div className="message success">{success}</div>
                )
            }

            {/* Grades Table */}
            <div className="grades-table-container">
                {loading ? (
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                    </div>
                ) : !selectedSubject ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <BookIcon />
                        </div>
                        <h3>Select a Subject</h3>
                        <p>Choose a subject to manage student grades.</p>
                    </div>
                ) : enrollments.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <BookIcon />
                        </div>
                        <h3>No enrollments found</h3>
                        <p>No students are enrolled in this subject yet.</p>
                    </div>
                ) : selectedSubject === 'all' ? (
                    // Grouped view for All Subjects
                    <div className="all-subjects-view">
                        {(() => {
                            // Group enrollments by student
                            const studentGroups = {}
                            enrollments.forEach(enrollment => {
                                const key = enrollment.student_id
                                if (!studentGroups[key]) {
                                    studentGroups[key] = {
                                        student_name: enrollment.student_name,
                                        student_id: enrollment.student_id,
                                        subjects: []
                                    }
                                }
                                studentGroups[key].subjects.push(enrollment)
                            })

                            // Filter by search
                            const filteredStudents = Object.values(studentGroups).filter(student => {
                                if (!searchQuery) return true
                                const query = searchQuery.toLowerCase()
                                return (
                                    student.student_name.toLowerCase().includes(query) ||
                                    String(student.student_id).toLowerCase().includes(query)
                                )
                            })

                            return filteredStudents.map(student => (
                                <div key={student.student_id} className="student-subjects-card">
                                    <div className="student-card-header">
                                        <div className="student-info-large">
                                            <h3>{student.student_name}</h3>
                                            <span className="student-id-badge">{student.student_id}</span>
                                        </div>
                                        <span className="subjects-count">{student.subjects.length} Subjects</span>
                                    </div>
                                    <div className="subjects-grid">
                                        {student.subjects.map(enrollment => {
                                            const subjectCriteria = criteria.filter(c => c.subject_id === enrollment.subject_id)
                                            const total = subjectCriteria.reduce((sum, c) => {
                                                const mark = grades[enrollment.id]?.[c.id]
                                                return sum + (mark ? parseFloat(mark) : 0)
                                            }, 0)
                                            const maxTotal = subjectCriteria.reduce((sum, c) => sum + c.max_marks, 0)
                                            const percentage = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : 0

                                            return (
                                                <div key={enrollment.id} className="subject-grade-card">
                                                    <div className="subject-card-header">
                                                        <span className="subject-name">{enrollment.subject_name}</span>
                                                        <span className="subject-code-tag">{enrollment.subject_code}</span>
                                                    </div>
                                                    <div className="criteria-grades">
                                                        {subjectCriteria.map(c => (
                                                            <div key={c.id} className="criteria-row">
                                                                <label className="criteria-label">
                                                                    {c.component_name}
                                                                    <span className="max-marks">/{c.max_marks}</span>
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    className="grade-input-compact"
                                                                    value={grades[enrollment.id]?.[c.id] || ''}
                                                                    onChange={(e) => updateGrade(enrollment.id, c.id, e.target.value)}
                                                                    min="0"
                                                                    max={c.max_marks}
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="subject-card-footer">
                                                        <div className="total-display">
                                                            <span className="label">Total:</span>
                                                            <span className="value">{total}/{maxTotal}</span>
                                                        </div>
                                                        <div className={`percentage-display ${percentage >= 40 ? 'pass' : 'fail'}`}>
                                                            {percentage}%
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))
                        })()}
                    </div>
                ) : (
                    // Standard table view for single subject
                    <div className="grades-table-wrapper">
                        <table className="grades-table">
                            <thead>
                                <tr>
                                    <th className="sticky-col">Student</th>
                                    {criteria.map(c => (
                                        <th key={c.id}>
                                            <div className="criteria-header">
                                                <span>{c.component_name}</span>
                                                <small>Max: {c.max_marks}</small>
                                            </div>
                                        </th>
                                    ))}
                                    <th>Total</th>
                                    <th>%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enrollments
                                    .filter(enrollment => {
                                        if (!searchQuery) return true
                                        const query = searchQuery.toLowerCase()
                                        return (
                                            enrollment.student_name.toLowerCase().includes(query) ||
                                            String(enrollment.student_id).toLowerCase().includes(query)
                                        )
                                    })
                                    .map(enrollment => {
                                        const total = calculateTotal(enrollment.id)
                                        const maxTotal = criteria.reduce((sum, c) => sum + c.max_marks, 0)
                                        const percentage = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : 0

                                        return (
                                            <tr key={enrollment.id}>
                                                <td className="sticky-col">
                                                    <div className="student-info">
                                                        <span
                                                            className="student-name"
                                                            style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: '600' }}
                                                            onClick={() => {
                                                                setSelectedSemester('')
                                                                setSelectedSubject('all')
                                                                setSearchQuery(enrollment.student_name)
                                                            }}
                                                            title="View all grades for this student"
                                                        >
                                                            {enrollment.student_name}
                                                        </span>
                                                        <span className="student-id">{enrollment.student_id}</span>
                                                    </div>
                                                </td>
                                                {criteria.map(c => (
                                                    <td key={c.id}>
                                                        <input
                                                            type="number"
                                                            className="grade-input"
                                                            value={grades[enrollment.id]?.[c.id] || ''}
                                                            onChange={(e) => updateGrade(enrollment.id, c.id, e.target.value)}
                                                            min="0"
                                                            max={c.max_marks}
                                                            placeholder="-"
                                                        />
                                                    </td>
                                                ))}
                                                <td>
                                                    <span className="total-marks">{total}</span>
                                                </td>
                                                <td>
                                                    <span className={`percentage ${percentage >= 40 ? 'pass' : 'fail'}`}>
                                                        {percentage}%
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div >
    )
}

export default GradeManagement
