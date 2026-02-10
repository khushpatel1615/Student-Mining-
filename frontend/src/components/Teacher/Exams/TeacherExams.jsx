import { useState, useEffect } from 'react'

import { API_BASE } from '../../../config';
import { useAuth } from '../../../context/AuthContext'
import './TeacherExams.css'



// Icons (reusing from assignments)
const PlusIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
)

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
)

const UploadIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
)

const DownloadIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
)

function TeacherExams() {
    const { token } = useAuth()
    const [exams, setExams] = useState([])
    const [subjects, setSubjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedExam, setSelectedExam] = useState(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showResultsModal, setShowResultsModal] = useState(false)
    const [showBulkModal, setShowBulkModal] = useState(false)
    const [students, setStudents] = useState([])
    const [results, setResults] = useState([])
    const [formData, setFormData] = useState({
        subject_id: '',
        title: '',
        exam_type: 'midterm',
        exam_date: '',
        duration_minutes: 120,
        max_marks: 100
    })
    const [bulkResults, setBulkResults] = useState('')

    useEffect(() => {
        fetchSubjects()
        fetchExams()
    }, [])

    const fetchSubjects = async () => {
        try {
            const response = await fetch(`${API_BASE}/teachers.php?action=my_subjects`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setSubjects(data.data)
            }
        } catch (err) {
            console.error('Failed to fetch subjects:', err)
        }
    }

    const fetchExams = async () => {
        try {
            setLoading(true)
            const response = await fetch(`${API_BASE}/exams.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setExams(data.data)
            }
        } catch (err) {
            console.error('Failed to fetch exams:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchStudentsAndResults = async (exam) => {
        try {
            // Fetch students enrolled in the subject
            const studentsRes = await fetch(
                `${API_BASE}/teachers.php?action=subject_students&subject_id=${exam.subject_id}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            const studentsData = await studentsRes.json()

            // Fetch existing results
            const resultsRes = await fetch(`${API_BASE}/exams.php?id=${exam.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const resultsData = await resultsRes.json()

            if (studentsData.success) {
                const studentsList = studentsData.data
                const existingResults = resultsData.success && resultsData.data.results ? resultsData.data.results : []

                // Merge students with their results
                const studentsWithResults = studentsList.map(student => {
                    const result = existingResults.find(r => String(r.student_id) === String(student.id))
                    return {
                        ...student,
                        marks_obtained: result?.marks_obtained ?? '',
                        remarks: result?.remarks || '',
                        result_id: result?.id || null
                    }
                })

                setStudents(studentsWithResults)
                setResults(existingResults)
            }
        } catch (err) {
            console.error('Failed to fetch students/results:', err)
        }
    }

    const handleCreateExam = async (e) => {
        e.preventDefault()
        try {
            const maxMarks = Number(formData.max_marks || 0)
            if (maxMarks <= 0) {
                window.alert(`Max marks must be greater than 0.`)
                return
            }
            const response = await fetch(`${API_BASE}/exams.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            })
            const data = await response.json()
            if (data.success) {
                setShowCreateModal(false)
                setFormData({
                    subject_id: '',
                    title: '',
                    exam_type: 'midterm',
                    exam_date: '',
                    duration_minutes: 120,
                    max_marks: 100
                })
                fetchExams()
            }
        } catch (err) {
            console.error('Failed to create exam:', err)
        }
    }

    const handleSaveResult = async (studentId, marks, remarks) => {
        try {
            const numericMarks = marks === '' || marks === null ? null : Number(marks)

            const response = await fetch(`${API_BASE}/exams.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    exam_id: selectedExam.id,
                    student_id: studentId,
                    marks_obtained: numericMarks,
                    remarks: remarks
                })
            })
            const data = await response.json()
            if (data.success) {
                // Refresh results
                fetchStudentsAndResults(selectedExam)
            }
        } catch (err) {
            console.error('Failed to save result:', err)
        }
    }

    const handleBulkUpload = async () => {
        try {
            // Parse CSV format: student_id,marks,remarks
            const lines = bulkResults.trim().split('\n')
            const promises = lines.map(line => {
                const [studentId, marks, remarks = ''] = line.split(',').map(s => s.trim())
                const student = students.find(s => s.student_id === studentId)
                if (student) {
                    return handleSaveResult(student.id, marks, remarks)
                }
                return null
            }).filter(Boolean)

            await Promise.all(promises)
            setShowBulkModal(false)
            setBulkResults('')
            window.alert('Bulk results uploaded successfully!')
        } catch (err) {
            console.error('Failed to upload bulk results:', err)
            window.alert('Error uploading bulk results. Please check the format.')
        }
    }

    const exportResults = () => {
        if (!selectedExam || students.length === 0) return

        const csv = [
            ['Student ID', 'Name', 'Marks Obtained', 'Max Marks', 'Percentage', 'Remarks'].join(','),
            ...students.map(s => [
                s.student_id,
                s.full_name,
                s.marks_obtained ?? 'N/A',
                selectedExam.total_marks ?? selectedExam.max_marks ?? 0,
                s.marks_obtained !== '' && s.marks_obtained !== null && (selectedExam.total_marks ?? selectedExam.max_marks ?? 0)
                    ? ((s.marks_obtained / (selectedExam.total_marks ?? selectedExam.max_marks ?? 0)) * 100).toFixed(2) + '%'
                    : 'N/A',
                s.remarks || ''
            ].join(','))
        ].join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedExam.title}_results.csv`
        a.click()
    }

    const viewResults = (exam) => {
        setSelectedExam(exam)
        fetchStudentsAndResults(exam)
        setShowResultsModal(true)
    }

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getExamTypeColor = (type) => {
        const colors = {
            quiz: '#3b82f6',
            midterm: '#f59e0b',
            final: '#ef4444',
            practical: '#22c55e',
            other: '#8b5cf6'
        }
        return colors[type] || colors.other
    }

    const calculateStats = () => {
        if (students.length === 0) return { avg: 0, highest: 0, lowest: 0, passRate: 0 }

        const validMarks = students.filter(s => s.marks_obtained !== '').map(s => parseFloat(s.marks_obtained))
        if (validMarks.length === 0) return { avg: 0, highest: 0, lowest: 0, passRate: 0 }

        const avg = validMarks.reduce((a, b) => a + b, 0) / validMarks.length
        const highest = Math.max(...validMarks)
        const lowest = Math.min(...validMarks)
        const passingMarks = (selectedExam.total_marks ?? selectedExam.max_marks ?? 0) * 0.4
        const passed = validMarks.filter(m => m >= passingMarks).length
        const passRate = (passed / validMarks.length) * 100

        return { avg: avg.toFixed(2), highest, lowest, passRate: passRate.toFixed(1) }
    }

    return (
        <div className="teacher-exams">
            <div className="exams-header">
                <h2>My Exams</h2>
                <button className="btn-create" onClick={() => setShowCreateModal(true)}>
                    <PlusIcon />
                    Create Exam
                </button>
            </div>

            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
                <div className="exams-grid">
                    {exams.map(exam => (
                        <div key={exam.id} className="exam-card">
                            <div className="card-header">
                                <div>
                                    <h3>{exam.title}</h3>
                                    <span className="subject-badge">{exam.subject_code}</span>
                                </div>
                                <span
                                    className="exam-type-badge"
                                    style={{ backgroundColor: getExamTypeColor(exam.exam_type) }}
                                >
                                    {exam.exam_type}
                                </span>
                            </div>
                            <div className="card-meta">
                                <div className="meta-item">
                                    <span className="label">Date:</span>
                                    <span className="value">{formatDate(exam.start_datetime)}</span>
                                </div>
                                <div className="meta-item">
                                    <span className="label">Duration:</span>
                                    <span className="value">{exam.duration_minutes} min</span>
                                </div>
                                <div className="meta-item">
                                    <span className="label">Total Marks:</span>
                                    <span className="value">{exam.total_marks}</span>
                                </div>
                            </div>
                            <button
                                className="btn-view-results"
                                onClick={() => viewResults(exam)}
                            >
                                Manage Results
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Exam Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create Exam</h3>
                            <button onClick={() => setShowCreateModal(false)}><CloseIcon /></button>
                        </div>
                        <form onSubmit={handleCreateExam}>
                            <div className="form-group">
                                <label>Subject *</label>
                                <select
                                    value={formData.subject_id}
                                    onChange={e => setFormData({ ...formData, subject_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Exam Type *</label>
                                    <select
                                        value={formData.exam_type}
                                        onChange={e => setFormData({ ...formData, exam_type: e.target.value })}
                                    >
                                        <option value="quiz">Quiz</option>
                                        <option value="midterm">Midterm</option>
                                        <option value="final">Final</option>
                                        <option value="practical">Practical</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Exam Date *</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.exam_date}
                                        onChange={e => setFormData({ ...formData, exam_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Duration (minutes) *</label>
                                    <input
                                        type="number"
                                        value={formData.duration_minutes}
                                        onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Max Marks *</label>
                                    <input
                                        type="number"
                                        value={formData.max_marks}
                                        onChange={e => setFormData({ ...formData, max_marks: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Results Management Modal */}
            {showResultsModal && selectedExam && (
                <div className="modal-overlay" onClick={() => setShowResultsModal(false)}>
                    <div className="modal-content large" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>{selectedExam.title} - Results</h3>
                                <p className="modal-subtitle">{selectedExam.subject_name}</p>
                            </div>
                            <button onClick={() => setShowResultsModal(false)}><CloseIcon /></button>
                        </div>

                        <div className="results-stats">
                            {(() => {
                                const stats = calculateStats()
                                return (
                                    <>
                                        <div className="stat-box">
                                            <span className="stat-label">Average</span>
                                            <span className="stat-value">{stats.avg}</span>
                                        </div>
                                        <div className="stat-box">
                                            <span className="stat-label">Highest</span>
                                            <span className="stat-value">{stats.highest}</span>
                                        </div>
                                        <div className="stat-box">
                                            <span className="stat-label">Lowest</span>
                                            <span className="stat-value">{stats.lowest}</span>
                                        </div>
                                        <div className="stat-box">
                                            <span className="stat-label">Pass Rate</span>
                                            <span className="stat-value">{stats.passRate}%</span>
                                        </div>
                                    </>
                                )
                            })()}
                        </div>

                        <div className="results-actions">
                            <button className="btn-action" onClick={() => setShowBulkModal(true)}>
                                <UploadIcon />
                                Bulk Upload
                            </button>
                            <button className="btn-action" onClick={exportResults}>
                                <DownloadIcon />
                                Export CSV
                            </button>
                        </div>

                        <div className="results-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Student ID</th>
                                        <th>Name</th>
                                        <th>Marks</th>
                                        <th>Remarks</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(student => (
                                        <tr key={student.id}>
                                            <td>{student.student_id}</td>
                                            <td>{student.full_name}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="marks-input"
                                                    value={student.marks_obtained}
                                                    onChange={e => {
                                                        const updated = students.map(s =>
                                                            s.id === student.id ? { ...s, marks_obtained: e.target.value } : s
                                                        )
                                                        setStudents(updated)
                                                    }}
                                                    max={selectedExam.total_marks ?? selectedExam.max_marks ?? undefined}
                                                    placeholder="0"
                                                />
                                                <span className="marks-total">/ {selectedExam.total_marks}</span>
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="remarks-input"
                                                    value={student.remarks}
                                                    onChange={e => {
                                                        const updated = students.map(s =>
                                                            s.id === student.id ? { ...s, remarks: e.target.value } : s
                                                        )
                                                        setStudents(updated)
                                                    }}
                                                    placeholder="Optional remarks"
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    className="btn-save-small"
                                                    onClick={() => handleSaveResult(student.id, student.marks_obtained, student.remarks)}
                                                    disabled={student.marks_obtained === '' || student.marks_obtained === null || Number.isNaN(Number(student.marks_obtained))}
                                                >
                                                    Save
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {showBulkModal && (
                <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Bulk Upload Results</h3>
                            <button onClick={() => setShowBulkModal(false)}><CloseIcon /></button>
                        </div>
                        <div className="bulk-upload-content">
                            <p className="help-text">
                                Enter results in CSV format: <code>student_id,marks,remarks</code>
                            </p>
                            <p className="help-text example">
                                Example:<br />
                                <code>STU001,85,Excellent<br />STU002,72,Good effort</code>
                            </p>
                            <textarea
                                className="bulk-textarea"
                                value={bulkResults}
                                onChange={e => setBulkResults(e.target.value)}
                                placeholder="STU001,85,Excellent&#10;STU002,72,Good effort&#10;STU003,90,Outstanding"
                                rows="10"
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowBulkModal(false)}>
                                Cancel
                            </button>
                            <button className="btn-primary" onClick={handleBulkUpload}>
                                Upload Results
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default TeacherExams



