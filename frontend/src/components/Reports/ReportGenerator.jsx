import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { FileText, Download, Loader, GraduationCap, Calendar, TrendingUp, Award } from 'lucide-react'
import toast from 'react-hot-toast'
import './ReportGenerator.css'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

function ReportGenerator() {
    const { token } = useAuth()
    const [loading, setLoading] = useState(null)
    const [reportData, setReportData] = useState(null)
    const [activeReport, setActiveReport] = useState(null)

    const reportTypes = [
        { id: 'report_card', name: 'Report Card', icon: FileText, color: '#6366f1', desc: 'Current semester grades and GPA' },
        { id: 'transcript', name: 'Academic Transcript', icon: GraduationCap, color: '#22c55e', desc: 'Complete academic history' },
        { id: 'attendance_report', name: 'Attendance Report', icon: Calendar, color: '#f59e0b', desc: 'Subject-wise attendance breakdown' },
        { id: 'performance_report', name: 'Performance Analysis', icon: TrendingUp, color: '#ec4899', desc: 'Strengths, weaknesses, recommendations' }
    ]

    const generateReport = async (type) => {
        setLoading(type)
        setActiveReport(type)
        try {
            const response = await fetch(`${API_BASE}/reports.php?action=${type}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setReportData(data.data)
                toast.success('Report generated!')
            } else {
                toast.error(data.error || 'Failed to generate report')
            }
        } catch (err) {
            toast.error('Error generating report')
        } finally {
            setLoading(null)
        }
    }

    const downloadPDF = () => {
        const printWindow = window.open('', '_blank')
        printWindow.document.write(`
            <html><head><title>${reportData.report_type}</title>
            <style>
                body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
                /* Common Report Styles */
                h1 { color: #1a1a2e; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background: #f8f9fa; font-weight: bold; }
                .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
                .logo { font-size: 24px; font-weight: bold; color: #6366f1; }
                .info-box { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
                .footer { margin-top: 40px; font-size: 10px; color: #666; border-top: 1px solid #eee; padding-top: 10px; }
                
                /* Academic Transcript Specific Styles */
                .transcript-header { display: flex; justify-content: space-between; margin-bottom: 20px; font-family: 'Times New Roman', serif; }
                .transcript-logo-text { font-size: 28px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
                .transcript-address { font-size: 12px; margin-bottom: 20px; width: 60%; line-height: 1.4; }
                .transcript-meta { width: 35%; align-items: flex-end; text-align: right; font-size: 11px; }
                .gray-bar { background-color: #e6e6e6; font-weight: bold; font-size: 10px; padding: 6px 10px; display: flex; justify-content: space-between; margin-bottom: 5px; text-transform: uppercase; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; }
                .transcript-table { border: none; margin-top: 5px; width: 100%; border-bottom: 2px solid black; }
                .transcript-table th { border: none; border-bottom: 1px solid #000; font-size: 10px; text-transform: uppercase; padding: 4px; background: none; }
                .transcript-table td { border: none; padding: 4px; font-size: 11px; }
                .term-header { font-weight: bold; font-size: 11px; margin-top: 15px; text-transform: uppercase; padding-top: 10px; }
                .gpa-row { font-weight: bold; font-size: 10px; margin-top: 2px; }
                .disclaimer { border-top: 1px solid #000; margin-top: 40px; padding-top: 10px; font-size: 9px; }
                
                /* Grade Colors */
                .grade-a { color: #22c55e; font-weight: bold; }
                .grade-b { color: #3b82f6; font-weight: bold; }
                .grade-c { color: #f59e0b; font-weight: bold; }
                .grade-f { color: #ef4444; font-weight: bold; }
            </style></head><body>
            
            ${activeReport !== 'transcript' ? `
                <div class="header">
                    <div class="logo">GANPAT UNIVERSITY</div>
                    <div>Generated: ${new Date().toLocaleDateString()}</div>
                </div>
                <h1>${reportData.report_type}</h1>
            ` : ''}

            ${renderReportContent()}
            
            <div class="footer">
                Generated by Student Data Mining System on ${new Date().toLocaleString()}
            </div>
            </body></html>
        `)
        printWindow.document.close()
        printWindow.print()
    }

    const renderReportContent = () => {
        if (!reportData) return ''

        if (activeReport === 'report_card') {
            return `
                <div class="info-box">
                    <p><strong>Student:</strong> ${reportData.student.name}</p>
                    <p><strong>Program:</strong> ${reportData.student.program}</p>
                    <p><strong>Semester:</strong> ${reportData.student.semester}</p>
                </div>
                <h3>Grades</h3>
                <table>
                    <tr><th>Subject</th><th>Credits</th><th>Score</th><th>Grade</th></tr>
                    ${reportData.academic.grades.map(g => `
                        <tr>
                            <td>${g.subject_name}</td>
                            <td>${g.credits}</td>
                            <td>${g.score || 'N/A'}</td>
                            <td class="grade-${(g.letter_grade || 'N')[0].toLowerCase()}">${g.letter_grade || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </table>
                <div class="info-box">
                    <p><strong>GPA:</strong> ${reportData.academic.gpa}</p>
                    <p><strong>Attendance:</strong> ${reportData.academic.attendance_percentage}%</p>
                </div>
            `
        }

        if (activeReport === 'transcript') {
            return `
                <div class="transcript-header">
                    <div>
                        <div class="transcript-logo-text">GANPAT UNIVERSITY</div>
                        <div class="transcript-address">
                            Office of the Registrar<br>
                            Ganpat Vidyanagar, Mehsana-Gozaria Highway<br>
                            Mehsana, Gujarat, India 384012
                        </div>
                        <div style="margin-top: 25px;">
                            <div style="font-size: 11px; margin-bottom: 2px;"><strong>${reportData.student.name.toUpperCase()}</strong></div>
                            <div style="font-size: 11px;">123 STUDENT HOUSING</div>
                            <div style="font-size: 11px;">CAMPUS, GU 384012</div>
                        </div>
                    </div>
                    <div class="transcript-meta">
                        <div style="margin-bottom: 2px;"><strong>Student Number:</strong> ${reportData.student.id}</div>
                        <div><strong>Issued Date:</strong> ${new Date().toISOString().split('T')[0]}</div>
                        <br>
                        <div>Page 1 of 1</div>
                    </div>
                </div>

                <div class="gray-bar">
                    <span style="width: 40%">PROGRAM</span>
                    <span style="width: 15%">PROGRAM GPA</span>
                    <span style="width: 25%">ACADEMIC STANDING</span>
                    <span style="width: 20%">CONVOCATION DATE</span>
                </div>
                <div style="font-size: 10px; padding: 5px 10px; display: flex; justify-content: space-between; border-bottom: 2px solid black; margin-bottom: 15px;">
                    <span style="width: 40%; font-weight: bold;">${reportData.student.program.toUpperCase()}</span>
                    <span style="width: 15%">${reportData.summary.cgpa}</span>
                    <span style="width: 25%">${reportData.summary.standing.toUpperCase()}</span>
                    <span style="width: 20%"></span>
                </div>

                <div class="transcript-section">
                    <div style="font-size: 11px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase;">${reportData.student.program.toUpperCase()}</div>
                    <table class="transcript-table">
                        <thead>
                            <tr>
                                <th style="width: 15%">COURSE NUMBER</th>
                                <th style="width: 45%">DESCRIPTION</th>
                                <th style="width: 8%">CREDITS</th>
                                <th style="width: 8%">HOURS</th>
                                <th style="width: 8%">GRADE</th>
                                <th style="width: 16%">GRADE POINT</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportData.semesters.map(sem => `
                                <tr>
                                    <td colspan="6" class="term-header">
                                        SEMESTER ${sem.semester} · ${sem.academic_year} · Level ${sem.semester}
                                    </td>
                                </tr>
                                ${sem.courses.map(c => `
                                    <tr>
                                        <td>${c.subject_code}</td>
                                        <td>${c.subject_name.toUpperCase()}</td>
                                        <td>${c.credits}</td>
                                        <td>${c.credits * 15}</td> 
                                        <td>${c.letter_grade || '-'}</td>
                                        <td>${(c.grade_points || 0).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                                <tr>
                                    <td colspan="6" class="gpa-row">
                                        Term GPA: ${sem.semester_gpa} <span style="margin-left: 10px;">Term Weighted Average: ${(sem.semester_gpa * 20 + 10).toFixed(2)}</span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="disclaimer">
                    This is not an official transcript. It is the responsibility of the student to ensure that the requirements of the program are being met. Please report omissions and errors to the Registrar's Office within 4 months of course completion.
                </div>
            `
        }

        if (activeReport === 'attendance_report') {
            return `
                <div class="info-box">
                    <p><strong>Student:</strong> ${reportData.student.name || 'Student'}</p>
                    <p><strong>Overall Attendance:</strong> ${reportData.summary.overall_percentage}%</p>
                    <p><strong>Status:</strong> ${reportData.summary.status}</p>
                </div>
                <h3>Subject Breakdown</h3>
                <table>
                    <tr><th>Subject</th><th>Present</th><th>Absent</th><th>Late</th><th>%</th><th>Status</th></tr>
                    ${reportData.by_subject.map(s => `
                        <tr>
                            <td>${s.subject_name}</td>
                            <td>${s.present}</td>
                            <td>${s.absent}</td>
                            <td>${s.late}</td>
                            <td>${s.percentage}%</td>
                            <td>${s.status}</td>
                        </tr>
                    `).join('')}
                </table>
            `
        }

        if (activeReport === 'performance_report') {
            return `
                 <div class="info-box">
                    <p><strong>Overall Average:</strong> ${reportData.analysis.overall_average}%</p>
                </div>
                <h3>Strengths</h3>
                <ul>
                    ${reportData.analysis.strengths.map(s => `<li><strong>${s.name}:</strong> ${s.average}%</li>`).join('')}
                </ul>
                <h3>Areas for Improvement</h3>
                <ul>
                    ${reportData.analysis.areas_for_improvement.map(s => `<li><strong>${s.name}:</strong> ${s.average}%</li>`).join('')}
                </ul>
                <h3>Recommendations</h3>
                <ul>
                    ${reportData.recommendations.map(r => `<li>${r}</li>`).join('')}
                </ul>
            `
        }
        return '<p>Report data available for download.</p>'
    }

    return (
        <div className="report-generator">
            <div className="report-header">
                <div className="header-content">
                    <h2><FileText size={24} /> Report Generator</h2>
                    <p>Generate and download official academic reports</p>
                </div>
            </div>

            <div className="report-types-grid">
                {reportTypes.map(type => (
                    <div
                        key={type.id}
                        className={`report-type-card ${activeReport === type.id ? 'active' : ''}`}
                        onClick={() => generateReport(type.id)}
                    >
                        <div className="card-icon" style={{ background: `${type.color}20`, color: type.color }}>
                            {loading === type.id ? <Loader className="spin" size={24} /> : <type.icon size={24} />}
                        </div>
                        <div className="card-content">
                            <h3>{type.name}</h3>
                            <p>{type.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {reportData && (
                <div className="report-preview">
                    <div className="preview-header">
                        <h3><Award size={20} /> {reportData.report_type}</h3>
                        <button className="btn-download" onClick={downloadPDF}>
                            <Download size={16} /> Download PDF
                        </button>
                    </div>

                    {activeReport === 'report_card' && (
                        <div className="preview-content">
                            <div className="student-info">
                                <div className="info-item"><span>Student</span><strong>{reportData.student.name}</strong></div>
                                <div className="info-item"><span>Program</span><strong>{reportData.student.program}</strong></div>
                                <div className="info-item"><span>GPA</span><strong className="gpa">{reportData.academic.gpa}</strong></div>
                                <div className="info-item"><span>Attendance</span><strong>{reportData.academic.attendance_percentage}%</strong></div>
                            </div>
                            <table className="grades-table">
                                <thead><tr><th>Subject</th><th>Credits</th><th>Score</th><th>Grade</th></tr></thead>
                                <tbody>
                                    {reportData.academic.grades.map((g, i) => (
                                        <tr key={i}>
                                            <td>{g.subject_name}</td>
                                            <td>{g.credits}</td>
                                            <td>{g.score || '-'}</td>
                                            <td className={`grade grade-${(g.letter_grade || 'N')[0].toLowerCase()}`}>{g.letter_grade || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {reportData.remarks && (
                                <div className="remarks">
                                    <h4>Remarks</h4>
                                    <ul>{reportData.remarks.map((r, i) => <li key={i}>{r}</li>)}</ul>
                                </div>
                            )}
                        </div>
                    )}

                    {activeReport === 'transcript' && reportData.semesters && (
                        <div className="preview-content">
                            <div className="student-info">
                                <div className="info-item"><span>Student</span><strong>{reportData.student.name}</strong></div>
                                <div className="info-item"><span>Program</span><strong>{reportData.student.program}</strong></div>
                                <div className="info-item"><span>CGPA</span><strong className="gpa">{reportData.summary.cgpa}</strong></div>
                                <div className="info-item"><span>Standing</span><strong>{reportData.summary.standing}</strong></div>
                            </div>
                            {reportData.semesters.map((sem, i) => (
                                <div key={i} className="semester-block">
                                    <h4>Semester {sem.semester} - GPA: {sem.semester_gpa}</h4>
                                    <table className="grades-table compact">
                                        <thead><tr><th>Code</th><th>Subject</th><th>Credits</th><th>Grade</th></tr></thead>
                                        <tbody>
                                            {sem.courses.map((c, j) => (
                                                <tr key={j}>
                                                    <td>{c.subject_code}</td>
                                                    <td>{c.subject_name}</td>
                                                    <td>{c.credits}</td>
                                                    <td className={`grade grade-${(c.letter_grade || 'N')[0].toLowerCase()}`}>{c.letter_grade || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeReport === 'attendance_report' && reportData.by_subject && (
                        <div className="preview-content">
                            <div className="student-info">
                                <div className="info-item"><span>Student</span><strong>{reportData.student?.name}</strong></div>
                                <div className="info-item"><span>Overall</span><strong>{reportData.summary.overall_percentage}%</strong></div>
                                <div className="info-item"><span>Status</span><strong className={reportData.summary.status.includes('Warning') ? 'warning' : 'success'}>{reportData.summary.status}</strong></div>
                            </div>
                            <table className="grades-table">
                                <thead><tr><th>Subject</th><th>Present</th><th>Absent</th><th>Late</th><th>%</th><th>Status</th></tr></thead>
                                <tbody>
                                    {reportData.by_subject.map((s, i) => (
                                        <tr key={i}>
                                            <td>{s.subject_name}</td>
                                            <td>{s.present}</td>
                                            <td>{s.absent}</td>
                                            <td>{s.late}</td>
                                            <td className={s.percentage >= 75 ? 'success' : 'warning'}>{s.percentage}%</td>
                                            <td>{s.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeReport === 'performance_report' && reportData.analysis && (
                        <div className="preview-content">
                            <div className="analysis-grid">
                                <div className="analysis-card strengths">
                                    <h4>💪 Strengths</h4>
                                    {reportData.analysis.strengths.map((s, i) => (
                                        <div key={i} className="subject-item">
                                            <span>{s.name}</span>
                                            <strong>{s.average}%</strong>
                                        </div>
                                    ))}
                                </div>
                                <div className="analysis-card improvements">
                                    <h4>📈 Areas for Improvement</h4>
                                    {reportData.analysis.areas_for_improvement.map((s, i) => (
                                        <div key={i} className="subject-item">
                                            <span>{s.name}</span>
                                            <strong>{s.average}%</strong>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="recommendations">
                                <h4>💡 Recommendations</h4>
                                <ul>{reportData.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default ReportGenerator
