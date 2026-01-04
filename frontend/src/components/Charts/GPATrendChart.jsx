import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import './PerformanceMetrics.css'

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
)

const GPATrendChart = ({ data = [] }) => {
    // Default mock data if none provided
    const mockData = [
        { semester: 'Sem 1', gpa: 3.2 },
        { semester: 'Sem 2', gpa: 3.5 },
        { semester: 'Sem 3', gpa: 3.7 },
        { semester: 'Sem 4', gpa: 3.8 }
    ]

    const chartData = data.length > 0 ? data : mockData

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            title: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(26, 26, 46, 0.95)',
                titleColor: '#f8fafc',
                bodyColor: '#cbd5e1',
                borderColor: 'rgba(99, 102, 241, 0.5)',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: (context) => `GPA: ${context.parsed.y.toFixed(2)}`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                min: 0,
                max: 4.0,
                ticks: {
                    stepSize: 0.5,
                    color: '#94a3b8'
                },
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)'
                }
            },
            x: {
                ticks: {
                    color: '#94a3b8'
                },
                grid: {
                    display: false
                }
            }
        }
    }

    const chartConfig = {
        labels: chartData.map(d => d.semester),
        datasets: [
            {
                label: 'GPA',
                data: chartData.map(d => d.gpa),
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverBackgroundColor: '#667eea',
                pointHoverBorderColor: '#fff'
            }
        ]
    }

    return (
        <div className="chart-container">
            <div className="chart-header">
                <h3 className="chart-title">📈 GPA Trend</h3>
                <span className="chart-subtitle">Semester-by-semester progress</span>
            </div>
            <div className="chart-body" style={{ height: '300px' }}>
                <Line options={options} data={chartConfig} />
            </div>
        </div>
    )
}

export default GPATrendChart
