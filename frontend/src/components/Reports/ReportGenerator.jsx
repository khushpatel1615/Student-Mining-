import { API_BASE } from '../../config';
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { FileText, Download, Loader, GraduationCap, Calendar, TrendingUp, Award } from 'lucide-react'
import toast from 'react-hot-toast'
import './ReportGenerator.css'

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
        try {
            // Pre-generate content to catch errors early
            const content = renderReportContent()
            const reportTitle = reportData?.report_type || 'Report'

            const printWindow = window.open('', '_blank')
            if (!printWindow) {
                toast.error('Pop-up blocked! Please allow pop-ups for this site.')
                return
            }

            const htmlContent = `
                <html><head><title>${reportTitle}</title>
                <style>
                    @page { size: A4; margin: 10mm; }
                    body { font-family: 'Arial', sans-serif; padding: 0; margin: 0; color: #333; -webkit-print-color-adjust: exact; width: 100%; box-sizing: border-box; }
                    
                    /* Report Card Specific Styles */
                    .ganpat-header { text-align: center; margin-bottom: 5px; position: relative; padding-top: 10px; }
                    .uni-title { color: #ef4444; font-size: 24px; font-weight: bold; margin: 0; display: flex; align-items: center; justify-content: center; gap: 8px; line-height: 1.1; }
                    .uni-motto { color: #ef4444; font-size: 9px; margin-top: 2px; }
                    .report-title { color: #2563eb; font-size: 11px; font-weight: bold; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
                    .sr-no { position: absolute; top: 0; right: 0; font-family: monospace; font-size: 9px; }
                    
                    .info-grid { display: grid; grid-template-columns: 80px 1fr; gap: 2px; font-size: 9px; margin-bottom: 5px; }
                    .info-label { font-weight: bold; color: #333; }
                    .info-value { font-weight: bold; color: #000; }
                    
                    .strip-header { background: #333; color: white; display: flex; font-size: 9px; font-weight: bold; text-transform: uppercase; margin-bottom: 0; border: 1px solid #000; padding: 0; }
                    .strip-cell { padding: 3px 6px; border-right: 1px solid #666; display: flex; flex-direction: column; justify-content: center; }
                    
                    .details-row { display: flex; border: 1px solid #000; border-top: none; font-size: 9px; margin-bottom: 10px; }
                    .details-cell { padding: 3px 6px; border-right: 1px solid #ccc; display: flex; align-items: center; }
                    
                    .main-table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 10px; border: 1px solid #000; }
                    .main-table th { background: #333; color: white; padding: 4px; text-align: left; border: 1px solid #000; font-size: 8px; }
                    .main-table td { padding: 3px 4px; border: 1px solid #ccc; border-right: 1px solid #000; vertical-align: middle; }
                    .main-table td:last-child { border-right: none; }
                    
                    .footer-grid { display: grid; grid-template-columns: 1fr 140px; gap: 10px; font-size: 9px; page-break-inside: avoid; }
                    .perf-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; border: 1px solid #000; }
                    .perf-table th { background: #333; color: white; padding: 3px; border: 1px solid #000; font-size: 8px; }
                    .perf-table td { border: 1px solid #ccc; padding: 3px; text-align: center; font-weight: bold; }
                    
                    .result-box { border: 1px solid #000; height: auto; display: flex; flex-direction: column; }
                    .result-header { background: #e5e5e5; font-weight: bold; text-align: center; padding: 2px; border-bottom: 1px solid #000; font-size: 9px; }
                    .result-val { padding: 4px; text-align: center; font-weight: bold; font-size: 10px; flex: 1; display: flex; align-items: center; justify-content: center; }
                    
                    .sign-area { margin-top: 15px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px; page-break-inside: avoid; }
                    
                    /* Original Styles */
                    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
                    th, td { border: 1px solid #ddd; padding: 5px; text-align: left; }
                
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
                    
                    .grade-a { color: #22c55e; font-weight: bold; }
                    .grade-b { color: #3b82f6; font-weight: bold; }
                    .grade-c { color: #f59e0b; font-weight: bold; }
                    .grade-f { color: #ef4444; font-weight: bold; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .logo { font-size: 24px; font-weight: bold; color: #6366f1; }
                    .info-box { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
                    .footer { margin-top: 40px; font-size: 10px; color: #666; border-top: 1px solid #eee; padding-top: 10px; }
                </style></head><body>
                
                ${(activeReport !== 'transcript' && activeReport !== 'report_card') ? `
                    <div class="header">
                        <div class="logo">GANPAT UNIVERSITY</div>
                        <div>Generated: ${new Date().toLocaleDateString()}</div>
                    </div>
                    <h1>${reportTitle}</h1>
                ` : ''}

                ${content}
                
                <div class="footer">
                    Generated by Student Data Mining System on ${new Date().toLocaleString()}
                </div>
                </body></html>
            `

            printWindow.document.write(htmlContent)
            printWindow.document.close()
            printWindow.print()
        } catch (error) {
            console.error('PDF Generation Error:', error)
            toast.error('Failed to generate PDF. Please try again.')
        }
    }

    const renderReportContent = () => {
        if (!reportData) return ''

        if (activeReport === 'report_card') {
            const studentName = reportData.student?.name || 'Student';
            const studentId = reportData.student?.id || '20291341059';
            const studentProgram = reportData.student?.program || 'COMPUTER ENGINEERING';
            const studentSemester = reportData.student?.semester || 'I';
            const grades = reportData.academic?.grades || [];

            // Calculations
            const getGradePoints = (grade) => {
                const map = { 'A+': 10, 'A': 9, 'B+': 8, 'B': 7, 'C+': 6, 'C': 5, 'D': 4, 'F': 0 };
                return map[grade] || 0;
            };

            let totalCredits = 0;
            let totalGradePoints = 0;
            let totalEarnedCredits = 0;

            const enrichedGrades = grades.map((g, index) => {
                const points = getGradePoints(g.letter_grade);
                // Handle N/A or missing credits safely
                const creditVal = Number(g.credits) || 0;
                const creditPoints = creditVal * points;

                totalCredits += creditVal;
                if (g.letter_grade !== 'F') totalEarnedCredits += creditVal;
                totalGradePoints += creditPoints;

                return {
                    ...g,
                    code: g.subject_code || `1ES${100 + index}`,
                    type: g.subject_type ? g.subject_type.toUpperCase() : (index % 3 === 0 ? 'PRACTICAL' : 'THEORY'),
                    gradePoints: points,
                    creditPoints: creditPoints,
                    credits: creditVal,
                    letter_grade: g.letter_grade || 'N/A',
                    subject_name: g.subject_name || 'N/A'
                };
            });

            const sgpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';

            return `
                <div class="ganpat-header">
                    <div class="sr-no">Sr. No.: 000965</div>
                    <div class="uni-title">
                        <span>✿</span> Ganpat University
                    </div>
                    <div class="uni-motto">|| विद्यया समाजोत्वर्ष: ||</div>
                    <div class="report-title">SEMESTER GRADE REPORT</div>
                </div>

                <div class="info-grid">
                    <span class="info-label">INSTITUTE:</span>
                    <span class="info-value">U.V. PATEL COLLEGE OF ENGINEERING</span>
                    <span class="info-label">PROGRAM:</span>
                    <span class="info-value">BACHELOR OF TECHNOLOGY</span>
                    <span class="info-label">BRANCH:</span>
                    <span class="info-value">${studentProgram.toUpperCase()}</span>
                </div>

                <div style="border: 1px solid #000; border-bottom: none;">
                    <div class="strip-header">
                        <div class="strip-cell" style="width: 25%">SR.NO.</div>
                        <div class="strip-cell" style="width: 25%">SEMESTER</div>
                        <div class="strip-cell" style="flex: 1; border-right: none;">MONTH & YEAR OF EXAMINATION</div>
                    </div>
                    <div class="details-row" style="margin-bottom: 0; border: none; border-bottom: 1px solid #000;">
                        <div class="details-cell" style="width: 25%;">{SR_GENERATED}</div>
                        <div class="details-cell" style="width: 25%;">${studentSemester}</div>
                        <div class="details-cell" style="flex: 1; border-right: none;">JUNE - 2024 REGULAR</div>
                    </div>

                    <div class="strip-header">
                        <div class="strip-cell" style="width: 25%">ENROLLMENT NO.</div>
                        <div class="strip-cell" style="flex: 1; border-right: none;">NAME</div>
                    </div>
                    <div class="details-row" style="margin-bottom: 0; border: none;">
                        <div class="details-cell" style="width: 25%">${studentId}</div>
                        <div class="details-cell" style="flex: 1; border-right: none; font-weight: bold;">${studentName.toUpperCase()}</div>
                    </div>
                </div>

                <table class="main-table" style="margin-top: 20px;">
                    <thead>
                        <tr>
                            <th style="width: 10%">Course Code</th>
                            <th style="width: 35%">Course Title</th>
                            <th style="width: 15%">Type</th>
                            <th style="text-align: center;">Course Credit Earned</th>
                            <th style="text-align: center;">Course Grade Earned</th>
                            <th style="text-align: center;">Grade Points Earned</th>
                            <th style="text-align: center;">Credit Points Earned</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${enrichedGrades.map(g => `
                            <tr>
                                <td>${g.code}</td>
                                <td>${g.subject_name}</td>
                                <td>${g.type}</td>
                                <td style="text-align: center;">${g.credits.toFixed(2)}</td>
                                <td style="text-align: center;">${g.letter_grade}</td>
                                <td style="text-align: center;">${g.gradePoints.toFixed(2)}</td>
                                <td style="text-align: center;">${g.creditPoints.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer-grid">
                    <div>
                        <table class="perf-table">
                            <thead>
                                <tr><th colspan="6" style="text-align: center; border-bottom: 1px solid #fff;">Current Performance</th></tr>
                                <tr>
                                    <th>Credits Offered</th>
                                    <th>Credits Earned</th>
                                    <th>Grade Points Earned</th>
                                    <th>Credit Points Earned</th>
                                    <th>SGPA</th>
                                    <th>Backlog</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>${totalCredits.toFixed(2)}</td>
                                    <td>${totalEarnedCredits.toFixed(2)}</td>
                                    <td>${totalGradePoints.toFixed(2)}</td>
                                    <td>${totalGradePoints.toFixed(2)}</td>
                                    <td>${sgpa}</td>
                                    <td>0</td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <table class="perf-table" style="margin-top: 10px;">
                            <thead>
                                <tr><th colspan="6" style="text-align: center; border-bottom: 1px solid #fff;">Cummulative Performance</th></tr>
                                <tr>
                                    <th>Credits Offered</th>
                                    <th>Credits Earned</th>
                                    <th>Grade Points Earned</th>
                                    <th>Credit Points Earned</th>
                                    <th>CGPA</th>
                                    <th>Cummulative Backlog</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>${totalCredits.toFixed(2)}</td>
                                    <td>${totalEarnedCredits.toFixed(2)}</td>
                                    <td>${totalGradePoints.toFixed(2)}</td>
                                    <td>${totalGradePoints.toFixed(2)}</td>
                                    <td>${sgpa}</td>
                                    <td>0</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="result-box">
                       <div class="result-header">RESULT</div>
                        <div class="result-header" style="background: #333; color: white;">Current</div>
                        <div class="result-val">PASS</div>
                        <div class="result-header" style="background: #333; color: white;">Effective Backlog</div>
                        <div class="result-val">0</div>
                    </div>
                </div>
                
                <div class="sign-area">
                    <div>
                        <strong>Date:</strong> ${new Date().toLocaleDateString()}
                    </div>
                    <div style="text-align: center;">
                         <div style="font-family: 'Brush Script MT', cursive; font-size: 24px;">A.A.Patel</div>
                         <div style="border-top: 1px solid #000; padding-top: 5px; width: 150px;">Executive Registrar</div>
                    </div>
                </div>
            `
        }

        if (activeReport === 'transcript') {
            const studentName = reportData.student?.name || 'Student';
            const studentId = reportData.student?.id || 'N/A';
            const studentProgram = reportData.student?.program || 'Program Not Specified';
            const cgpa = reportData.summary?.cgpa ?? 0;
            const standing = reportData.summary?.standing || 'N/A';
            const semesters = reportData.semesters || [];

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
                            <div style="font-size: 11px; margin-bottom: 2px;"><strong>${studentName.toUpperCase()}</strong></div>
                            <div style="font-size: 11px;">123 STUDENT HOUSING</div>
                            <div style="font-size: 11px;">CAMPUS, GU 384012</div>
                        </div>
                    </div>
                    <div class="transcript-meta">
                        <div style="margin-bottom: 2px;"><strong>Student Number:</strong> ${studentId}</div>
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
                    <span style="width: 40%; font-weight: bold;">${studentProgram.toUpperCase()}</span>
                    <span style="width: 15%">${cgpa}</span>
                    <span style="width: 25%">${standing.toUpperCase()}</span>
                    <span style="width: 20%"></span>
                </div>

                <div class="transcript-section">
                    <div style="font-size: 11px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase;">${studentProgram.toUpperCase()}</div>
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
                            ${semesters.length > 0 ? semesters.map(sem => `
                                <tr>
                                    <td colspan="6" class="term-header">
                                        SEMESTER ${sem.semester || 'N/A'} · ${sem.academic_year || new Date().getFullYear()} · Level ${sem.semester || 'N/A'}
                                    </td>
                                </tr>
                                ${(sem.courses || []).map(c => `
                                    <tr>
                                        <td>${c.subject_code || '-'}</td>
                                        <td>${(c.subject_name || 'Unknown Course').toUpperCase()}</td>
                                        <td>${c.credits || 0}</td>
                                        <td>${(c.credits || 0) * 15}</td> 
                                        <td>${c.letter_grade || '-'}</td>
                                        <td>${Number(c.grade_points || 0).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                                <tr>
                                    <td colspan="6" class="gpa-row">
                                        Term GPA: ${Number(sem.semester_gpa || 0).toFixed(2)} <span style="margin-left: 10px;">Term Weighted Average: ${(Number(sem.semester_gpa || 0) * 20 + 10).toFixed(2)}</span>
                                    </td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="6" style="text-align: center; padding: 20px; color: #666;">
                                        No semester data available
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>

                <div class="disclaimer">
                    This is not an official transcript. It is the responsibility of the student to ensure that the requirements of the program are being met. Please report omissions and errors to the Registrar's Office within 4 months of course completion.
                </div>
            `
        }

        if (activeReport === 'attendance_report') {
            // Safely access all properties with defaults
            const studentName = reportData.student?.name || 'Student';
            const overallPercentage = reportData.summary?.overall_percentage || 0;
            const status = reportData.summary?.status || 'N/A';
            const bySubject = reportData.by_subject || [];

            return `
                <div class="info-box">
                    <p><strong>Student:</strong> ${studentName}</p>
                    <p><strong>Overall Attendance:</strong> ${Number(overallPercentage).toFixed(1)}%</p>
                    <p><strong>Status:</strong> ${status}</p>
                </div>
                <h3>Subject Breakdown</h3>
                <table>
                    <tr><th>Subject</th><th>Present</th><th>Absent</th><th>Late</th><th>%</th><th>Status</th></tr>
                    ${bySubject.length > 0 ? bySubject.map(s => `
                        <tr>
                            <td>${s.subject_name || 'N/A'}</td>
                            <td>${s.present || 0}</td>
                            <td>${s.absent || 0}</td>
                            <td>${s.late || 0}</td>
                            <td>${Number(s.percentage || 0).toFixed(1)}%</td>
                            <td>${s.status || 'N/A'}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="6" style="text-align: center;">No attendance data available</td></tr>'}
                </table>
            `
        }

        if (activeReport === 'performance_report') {
            // Safely access all properties with defaults
            const overallAverage = reportData.analysis?.overall_average || 0;
            const strengths = reportData.analysis?.strengths || [];
            const improvements = reportData.analysis?.areas_for_improvement || [];
            const recommendations = reportData.recommendations || [];

            return `
                 <div class="info-box">
                    <p><strong>Overall Average:</strong> ${Number(overallAverage).toFixed(1)}%</p>
                </div>
                <h3>Strengths</h3>
                <ul>
                    ${strengths.length > 0 ? strengths.map(s => `<li><strong>${s.name || 'N/A'}:</strong> ${Number(s.average || 0).toFixed(1)}%</li>`).join('') : '<li>No data available</li>'}
                </ul>
                <h3>Areas for Improvement</h3>
                <ul>
                    ${improvements.length > 0 ? improvements.map(s => `<li><strong>${s.name || 'N/A'}:</strong> ${Number(s.average || 0).toFixed(1)}%</li>`).join('') : '<li>No data available</li>'}
                </ul>
                <h3>Recommendations</h3>
                <ul>
                    ${recommendations.length > 0 ? recommendations.map(r => `<li>${r}</li>`).join('') : '<li>No recommendations available</li>'}
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
                                <thead><tr><th>Subject</th><th>Type</th><th>Credits</th><th>Score</th><th>Grade</th></tr></thead>
                                <tbody>
                                    {reportData.academic.grades.map((g, i) => (
                                        <tr key={i}>
                                            <td>{g.subject_name}</td>
                                            <td>{g.subject_type || '-'}</td>
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
