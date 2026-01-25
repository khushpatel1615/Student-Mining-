import { API_BASE } from '../../../config';
import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import './TeacherGrades.css'



// Icons
const DownloadIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
)

const SaveIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
    </svg>
)

function TeacherGrades() {
    const { token } = useAuth()
    const [subjects, setSubjects] = useState([])
    const [selectedSubject, setSelectedSubject] = useState(null)
    const [students, setStudents] = useState([])
    const [gradeComponents, setGradeComponents] = useState([])
    const [grades, setGrades] = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchSubjects()
    }, [])

    useEffect(() => {
        if (selectedSubject) {
            fetchStudentsAndGrades()
        }
    }, [selectedSubject])

    const fetchSubjects = async () => {
        try {
            setLoading(true)
            const response = await fetch(`${API_BASE}/teachers.php?action=my_subjects`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success && data.data.length > 0) {
                setSubjects(data.data)
                setSelectedSubject(data.data[0])
            }
        } catch (err) {
            console.error('Failed to fetch subjects:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchStudentsAndGrades = async () => {
        try {
            setLoading(true)

            // Fetch enrolled students
            const studentsRes = await fetch(
                `${API_BASE}/teachers.php?action=subject_students&subject_id=${selectedSubject.id}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            const studentsData = await studentsRes.json()

            // Fetch grade components for this subject
            const componentsRes = await fetch(
                `${API_BASE}/grade_components.php?subject_id=${selectedSubject.id}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            const componentsData = await componentsRes.json()

            // Fetch existing grades
            const gradesRes = await fetch(
                `${API_BASE}/grades.php?subject_id=${selectedSubject.id}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            const gradesData = await gradesRes.json()

            if (studentsData.success) {
                setStudents(studentsData.data)
            }

            if (componentsData.success) {
                setGradeComponents(componentsData.data)
            }

            // Organize grades by student and component
            if (gradesData.success) {
                const gradesMap = {}
                gradesData.data.forEach(grade => {
                    const key = `${grade.student_id}_${grade.component_id}`
                    gradesMap[key] = {
                        id: grade.id,
                        marks: grade.marks_obtained,
                        remarks: grade.remarks || ''
                    }
                })
                setGrades(gradesMap)
            }
        } catch (err) {
            console.error('Failed to fetch data:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleGradeChange = (studentId, componentId, field, value) => {
        const key = `${studentId}_${componentId}`
        setGrades(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: value
            }
        }))
    }

    const saveGrade = async (studentId, componentId) => {
        const key = `${studentId}_${componentId}`
        const gradeData = grades[key]

        if (!gradeData || gradeData.marks === undefined || gradeData.marks === '') {
            return
        }

        setSaving(true)
        try {
            const method = gradeData.id ? 'PUT' : 'POST'
            const body = {
                student_id: studentId,
                subject_id: selectedSubject.id,
                component_id: componentId,
                marks_obtained: parseFloat(gradeData.marks),
                remarks: gradeData.remarks || ''
            }

            if (gradeData.id) {
                body.id = gradeData.id
            }

            const response = await fetch(`${API_BASE}/grades.php`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            })

            const data = await response.json()
            if (data.success) {
                // Update the grade ID if it was a new entry
                if (!gradeData.id && data.id) {
                    setGrades(prev => ({
                        ...prev,
                        [key]: { ...prev[key], id: data.id }
                    }))
                }
                // Show success feedback
                const cell = document.querySelector(`[data-key="${key}"]`)
                if (cell) {
                    cell.classList.add('saved')
                    setTimeout(() => cell.classList.remove('saved'), 1000)
                }
            }
        } catch (err) {
            console.error('Failed to save grade:', err)
        } finally {
            setSaving(false)
        }
    }

    const saveAllGrades = async () => {
        setSaving(true)
        const promises = []

        students.forEach(student => {
            gradeComponents.forEach(component => {
                const key = `${student.id}_${component.id}`
                if (grades[key] && grades[key].marks !== undefined && grades[key].marks !== '') {
                    promises.push(saveGrade(student.id, component.id))
                }
            })
        })

        await Promise.all(promises)
        setSaving(false)
        alert('All grades saved successfully!')
    }

    const calculateTotal = (studentId) => {
        let total = 0
        gradeComponents.forEach(component => {
            const key = `${studentId}_${component.id}`
            const grade = grades[key]
            if (grade && grade.marks) {
                total += parseFloat(grade.marks)
            }
        })
        return total.toFixed(2)
    }

    const calculatePercentage = (studentId) => {
        const total = parseFloat(calculateTotal(studentId))
        const maxMarks = gradeComponents.reduce((sum, c) => sum + c.max_marks, 0)
        if (maxMarks === 0) return 0
        return ((total / maxMarks) * 100).toFixed(2)
    }

    const getLetterGrade = (percentage) => {
        if (percentage >= 90) return 'A+'
        if (percentage >= 85) return 'A'
        if (percentage >= 80) return 'A-'
        if (percentage >= 75) return 'B+'
        if (percentage >= 70) return 'B'
        if (percentage >= 65) return 'B-'
        if (percentage >= 60) return 'C+'
        if (percentage >= 55) return 'C'
        if (percentage >= 50) return 'C-'
        if (percentage >= 45) return 'D'
        return 'F'
    }

    const exportToCSV = () => {
        if (!selectedSubject || students.length === 0) return

        const headers = [
            'Student ID',
            'Student Name',
            ...gradeComponents.map(c => `${c.name} (${c.max_marks})`),
            'Total',
            'Percentage',
            'Grade'
        ]

        const rows = students.map(student => {
            const componentMarks = gradeComponents.map(component => {
                const key = `${student.id}_${component.id}`
                return grades[key]?.marks || 'N/A'
            })
            const total = calculateTotal(student.id)
            const percentage = calculatePercentage(student.id)
            const grade = getLetterGrade(parseFloat(percentage))

            return [
                student.student_id,
                student.full_name,
                ...componentMarks,
                total,
                percentage + '%',
                grade
            ]
        })

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedSubject.code}_grades.csv`
        a.click()
    }

    return (
        <div className="teacher-grades">
            <div className="grades-header">
                <div>
                    <h2>Grade Management</h2>
                    <p className="subtitle">Direct grade entry for evaluation components</p>
                </div>
                <div className="header-actions">
                    <select
                        className="subject-select"
                        value={selectedSubject?.id || ''}
                        onChange={(e) => {
                            const subject = subjects.find(s => s.id === parseInt(e.target.value))
                            setSelectedSubject(subject)
                        }}
                    >
                        {subjects.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.code} - {s.name}
                            </option>
                        ))}
                    </select>
                    <button className="btn-export" onClick={exportToCSV}>
                        <DownloadIcon />
                        Export CSV
                    </button>
                    <button className="btn-save-all" onClick={saveAllGrades} disabled={saving}>
                        <SaveIcon />
                        {saving ? 'Saving...' : 'Save All'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading">Loading grades...</div>
            ) : (
                <>
                    {gradeComponents.length === 0 ? (
                        <div className="empty-state">
                            <p>No grade components defined for this subject.</p>
                            <p className="help-text">Please contact the administrator to set up evaluation components.</p>
                        </div>
                    ) : (
                        <div className="grades-table-container">
                            <table className="grades-table">
                                <thead>
                                    <tr>
                                        <th className="sticky-col">Student ID</th>
                                        <th className="sticky-col-2">Student Name</th>
                                        {gradeComponents.map(component => (
                                            <th key={component.id} className="component-header">
                                                <div className="component-name">{component.name}</div>
                                                <div className="component-weight">
                                                    {component.weightage}% ({component.max_marks} marks)
                                                </div>
                                            </th>
                                        ))}
                                        <th className="total-col">Total</th>
                                        <th className="percentage-col">%</th>
                                        <th className="grade-col">Grade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(student => {
                                        const percentage = parseFloat(calculatePercentage(student.id))
                                        const letterGrade = getLetterGrade(percentage)

                                        return (
                                            <tr key={student.id}>
                                                <td className="sticky-col">{student.student_id}</td>
                                                <td className="sticky-col-2">{student.full_name}</td>
                                                {gradeComponents.map(component => {
                                                    const key = `${student.id}_${component.id}`
                                                    const gradeData = grades[key] || {}

                                                    return (
                                                        <td key={component.id} className="grade-cell" data-key={key}>
                                                            <input
                                                                type="number"
                                                                className="marks-input"
                                                                value={gradeData.marks || ''}
                                                                onChange={(e) => handleGradeChange(
                                                                    student.id,
                                                                    component.id,
                                                                    'marks',
                                                                    e.target.value
                                                                )}
                                                                onBlur={() => saveGrade(student.id, component.id)}
                                                                max={component.max_marks}
                                                                min="0"
                                                                step="0.5"
                                                                placeholder="0"
                                                            />
                                                            <span className="max-marks">/ {component.max_marks}</span>
                                                        </td>
                                                    )
                                                })}
                                                <td className="total-col">
                                                    <strong>{calculateTotal(student.id)}</strong>
                                                </td>
                                                <td className="percentage-col">
                                                    <strong>{percentage}%</strong>
                                                </td>
                                                <td className="grade-col">
                                                    <span className={`grade-badge grade-${letterGrade.replace('+', 'plus').replace('-', 'minus')}`}>
                                                        {letterGrade}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default TeacherGrades



