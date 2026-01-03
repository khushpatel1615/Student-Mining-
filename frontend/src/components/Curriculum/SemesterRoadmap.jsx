import { useState, useEffect } from 'react'
import SubjectCard from './SubjectCard'
import './SemesterRoadmap.css'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

function SemesterRoadmap({ programId = 1 }) {
    const [semesters, setSemesters] = useState([])
    const [activeSemester, setActiveSemester] = useState(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchCurriculum()
    }, [programId])

    const fetchCurriculum = async () => {
        try {
            setLoading(true)
            const response = await fetch(`${API_BASE}/subjects.php?program_id=${programId}&grouped=true`)
            const data = await response.json()

            if (data.success) {
                setSemesters(data.data)
                if (data.data.length > 0) {
                    setActiveSemester(data.data[0].semester)
                }
            } else {
                setError('Failed to load curriculum')
            }
        } catch (err) {
            setError('Error connecting to server')
        } finally {
            setLoading(false)
        }
    }

    const currentSemester = semesters.find(sem => sem.semester === activeSemester)

    if (loading) {
        return (
            <div className="roadmap-loading">
                <div className="loading-spinner"></div>
                <p>Loading curriculum...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="roadmap-error">
                <p>{error}</p>
                <button onClick={fetchCurriculum}>Retry</button>
            </div>
        )
    }

    return (
        <div className="semester-roadmap">
            {/* Semester Tabs */}
            <div className="semester-tabs">
                {semesters.map((sem) => (
                    <button
                        key={sem.semester}
                        className={`semester-tab ${activeSemester === sem.semester ? 'active' : ''}`}
                        onClick={() => setActiveSemester(sem.semester)}
                    >
                        <span className="tab-label">Semester {sem.semester}</span>
                        <span className="tab-credits">{sem.total_credits} Credits</span>
                    </button>
                ))}
            </div>

            {/* Semester Summary */}
            {currentSemester && (
                <div className="semester-summary">
                    <div className="summary-stat">
                        <span className="summary-value">{currentSemester.subjects.length}</span>
                        <span className="summary-label">Subjects</span>
                    </div>
                    <div className="summary-stat">
                        <span className="summary-value">{currentSemester.total_credits}</span>
                        <span className="summary-label">Total Credits</span>
                    </div>
                    <div className="summary-stat">
                        <span className="summary-value">
                            {currentSemester.subjects.filter(s => s.subject_type === 'Core').length}
                        </span>
                        <span className="summary-label">Core Subjects</span>
                    </div>
                    <div className="summary-stat">
                        <span className="summary-value">
                            {currentSemester.subjects.filter(s => s.subject_type === 'Elective').length}
                        </span>
                        <span className="summary-label">Electives</span>
                    </div>
                </div>
            )}

            {/* Subject Cards Grid */}
            <div className="subjects-grid">
                {currentSemester?.subjects.map((subject, index) => (
                    <SubjectCard
                        key={subject.id}
                        subject={subject}
                        animationDelay={index * 0.1}
                    />
                ))}
            </div>

            {/* Progress Tracker */}
            <div className="semester-progress">
                <div className="progress-label">
                    <span>Course Progress</span>
                    <span>{semesters.findIndex(s => s.semester === activeSemester) + 1} of {semesters.length} semesters</span>
                </div>
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${((semesters.findIndex(s => s.semester === activeSemester) + 1) / semesters.length) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    )
}

export default SemesterRoadmap
