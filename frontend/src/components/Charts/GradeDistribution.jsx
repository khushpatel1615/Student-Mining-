import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import './PerformanceMetrics.css'

ChartJS.register(ArcElement, Tooltip, Legend)

const GradeDistribution = ({ grades = {} }) => {
    // Mock data if none provided
    const mockGrades = {
        'A': 3,
        'B': 2,
        'C': 1,
        'D': 0,
        'F': 0
    }

    const gradeData = Object.keys(grades).length > 0 ? grades : mockGrades

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: '#64748b',
                    font: {
                        size: 13,
                        weight: '500'
                    },
                    padding: 15,
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(26, 26, 46, 0.95)',
                titleColor: '#f8fafc',
                bodyColor: '#cbd5e1',
                borderColor: 'rgba(99, 102, 241, 0.5)',
                borderWidth: 1,
                padding: 12,
                callbacks: {
                    label: (context) => {
                        const label = context.label || ''
                        const value = context.parsed || 0
                        const total = context.dataset.data.reduce((a, b) => a + b, 0)
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
                        return `${label}: ${value} subjects (${percentage}%)`
                    }
                }
            }
        },
        cutout: '65%'
    }

    const data = {
        labels: Object.keys(gradeData),
        datasets: [
            {
                data: Object.values(gradeData),
                backgroundColor: [
                    '#10b981', // A - Green
                    '#3b82f6', // B - Blue
                    '#f59e0b', // C - Yellow
                    '#f97316', // D - Orange
                    '#ef4444'  // F - Red
                ],
                borderColor: '#1a1a2e',
                borderWidth: 3,
                hoverOffset: 8
            }
        ]
    }

    const totalSubjects = Object.values(gradeData).reduce((a, b) => a + b, 0)

    return (
        <div className="chart-container">
            <div className="chart-header">
                <h3 className="chart-title">📊 Grade Distribution</h3>
                <span className="chart-subtitle">{totalSubjects} total subjects</span>
            </div>
            <div className="chart-body" style={{ height: '280px', position: 'relative' }}>
                <Doughnut options={options} data={data} />
                <div className="chart-center-label">
                    <div className="center-value">{totalSubjects}</div>
                    <div className="center-text">Subjects</div>
                </div>
            </div>
        </div>
    )
}

export default GradeDistribution
