import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js'
import { Radar } from 'react-chartjs-2'
import './PerformanceMetrics.css'

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
)

const SubjectPerformanceRadar = ({ subjects = [] }) => {
    const chartSubjects = Array.isArray(subjects) ? subjects : []
    const hasData = chartSubjects.length > 0

    if (!hasData) {
        return (
            <div className="chart-container">
                <div className="chart-header">
                <h3 className="chart-title">Subject Performance</h3>
                    <span className="chart-subtitle">No subject data yet</span>
                </div>
                <div className="chart-body chart-empty" style={{ height: '350px' }}>
                    <p className="chart-empty-text">No subject performance data available.</p>
                </div>
            </div>
        )
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(26, 26, 46, 0.95)',
                titleColor: '#f8fafc',
                bodyColor: '#cbd5e1',
                borderColor: 'rgba(99, 102, 241, 0.5)',
                borderWidth: 1,
                padding: 12,
                callbacks: {
                    label: (context) => `Score: ${context.raw}%`
                }
            }
        },
        scales: {
            r: {
                beginAtZero: true,
                min: 0,
                max: 100,
                ticks: {
                    stepSize: 20,
                    color: '#94a3b8',
                    backdropColor: 'transparent'
                },
                grid: {
                    color: 'rgba(148, 163, 184, 0.2)'
                },
                angleLines: {
                    color: 'rgba(148, 163, 184, 0.2)'
                },
                pointLabels: {
                    color: '#64748b',
                    font: {
                        size: 12,
                        weight: '500'
                    }
                }
            }
        }
    }

    const data = {
        labels: chartSubjects.map(s => s.name),
        datasets: [
            {
                label: 'Performance',
                data: chartSubjects.map(s => s.score),
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderColor: '#667eea',
                borderWidth: 3,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#667eea',
                pointRadius: 5,
                pointHoverRadius: 7
            }
        ]
    }

    return (
        <div className="chart-container">
            <div className="chart-header">
                <h3 className="chart-title">Subject Performance</h3>
                <span className="chart-subtitle">Comparative analysis across subjects</span>
            </div>
            <div className="chart-body" style={{ height: '350px' }}>
                <Radar options={options} data={data} />
            </div>
        </div>
    )
}

export default SubjectPerformanceRadar
